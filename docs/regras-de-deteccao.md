# Regras de detecção

Este documento descreve as regras que decidem se uma transação é **marcada** para revisão. A implementação está em [`backend/fraud_detection.py`](../backend/fraud_detection.py), que é a fonte de verdade. Se o código e este texto divergirem, o código vale e este documento deve ser corrigido.

> **Marcar não é acusar.** Uma marcação significa "possível atividade incomum, encaminhada para revisão". Nenhuma regra confirma fraude, e nenhum texto exibido ao usuário deve dizer o contrário.

## Visão geral

- Existem **duas regras independentes**: valor alto e alta frequência.
- Cada regra, ao disparar, acrescenta uma explicação à lista `motivos` da transação.
- `marcada` é `true` quando `motivos` tem pelo menos um item. Não há pontuação nem gravidade: é um sim/não.
- Uma transação pode ter os dois motivos ao mesmo tempo. Na base atual isso nunca acontece (interseção = 0).
- Só três colunas participam das regras: `valor`, `data_hora` e `id_conta`. `tipo`, `canal` e `localidade` **não** influenciam a marcação (servem apenas de filtro na API e na interface).

## Parâmetros

Definidos uma única vez em `fraud_detection.py` e reaproveitados por `/criterios` e `/resumo`.

| Constante | Valor | Significado |
|---|---|---|
| `VALOR_MINIMO` | `1000.0` | Valor (R$) a partir do qual uma transação é marcada |
| `QUANTIDADE_MINIMA` | `8` | Nº mínimo de transações da mesma conta numa janela |
| `JANELA_MINUTOS` | `60` | Tamanho da janela, em minutos |
| `REGRA_VALOR` | `"Valor igual ou superior a R$ 1.000,00"` | Texto do motivo da regra de valor |
| `REGRA_FREQUENCIA` | `"8 ou mais transações da mesma conta em uma janela de 60 minutos"` | Texto do motivo da regra de frequência |

> **Atenção:** os textos `REGRA_VALOR` e `REGRA_FREQUENCIA` têm os números escritos à mão ("1.000,00", "8", "60"); não são montados a partir das constantes. Ao mudar um limiar, **altere o texto junto**, senão a API passa a descrever uma regra diferente da que executa.

## Regra 1: valor alto

**Condição:** `valor >= 1000.0`.

- A comparação é **inclusiva**: R$ 1.000,00 marca; R$ 999,99 não.
- Avalia cada transação isoladamente, sem olhar conta, tipo, canal ou histórico.
- Valores negativos ou zero nunca disparam essa regra (e também não são rejeitados na leitura).

**Por que R$ 1.000,00.** A API afirma, em `/criterios`, que o limite "fica bem acima do percentil 95 observado nos dados". Conferido contra `transacoes.txt`:

| Estatística do campo `valor` | R$ |
|---|---|
| Mínimo | 4,00 |
| Mediana | 56,00 |
| Percentil 90 | 176,91 |
| Percentil 95 | 243,45 |
| Percentil 99 | 963,36 |
| Máximo | 23.847,94 |

O limite está acima do percentil 99, e a afirmação procede para a base atual. Mas o texto da justificativa é fixo: **não se atualiza sozinho** se os dados mudarem.

## Regra 2: alta frequência

**Condição:** 8 ou mais transações da **mesma conta** dentro de uma janela de **60 minutos**.

**Semântica**

- A janela é **móvel** (não são faixas fixas por hora) e **inclusiva** nos dois extremos: o intervalo entre a primeira e a última transação pode ser de exatamente 60 min 00 s.
- **Todas** as transações que pertencem a alguma janela qualificada são marcadas, e não apenas a 8ª.
- Contas diferentes nunca se somam: cada `id_conta` é avaliada isoladamente.
- A ordem das linhas no arquivo é irrelevante; o algoritmo ordena por `data_hora` (ordenação estável).
- Transações sem `id_conta` **ficam fora** dessa regra (veja [Casos de borda](#casos-de-borda)).

**Algoritmo** (janela deslizante com dois ponteiros, por conta):

1. Agrupar as transações por `id_conta`.
2. Ordenar cada grupo por `data_hora`.
3. Para cada transação `i` (o início da janela), avançar o ponteiro `direita` enquanto `horarios[direita] <= horarios[i] + 60 min`. A janela é `[i, direita)`.
4. Se `direita - i >= 8`, marcar todas as transações da janela.

Basta testar janelas que **começam numa transação**: qualquer janela de 60 min com 8 ou mais transações pode ser deslocada até a sua primeira transação sem perder nenhuma. O custo é uma ordenação por conta mais uma passada linear.

**Exemplo real (base atual).** A conta `CTA0021` fez 10 transações em 09/10/2026, uma a cada 4 minutos, das 01:00 às 01:36 (36 min), com valores entre R$ 113,25 e R$ 287,43. Nenhuma atinge R$ 1.000, então só a regra de frequência as marca. As outras 16 transações da conta no mês não são marcadas.

As duas regras são **complementares**: a de valor pega operações grandes e isoladas; a de frequência pega rajadas de operações pequenas.

## Saída das regras

Cada transação classificada ganha duas colunas:

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `motivos` | lista de textos | Zero, um ou dois itens, na ordem: valor alto, depois alta frequência |
| `marcada` | booleano | `true` se `motivos` não estiver vazia |

`motivos` carrega o **texto descritivo** da regra, não um identificador estável. Os identificadores (`valor_alto`, `frequencia_alta`) aparecem em `/criterios` e `/resumo`, mas não em cada transação. Quem filtra por motivo no cliente precisa comparar o texto. Veja a decisão D03 em [`AGENTS.md`](../AGENTS.md).

## Resultado na base atual

2.000 transações, 150 contas, de 01/10/2026 a 30/10/2026.

| | Transações | % do total |
|---|---|---|
| Marcadas | **50** | 2,5% |
| &nbsp;&nbsp;por valor alto | 20 | 1,0% |
| &nbsp;&nbsp;por alta frequência | 30 | 1,5% |
| &nbsp;&nbsp;pelas duas | 0 | 0% |
| Não marcadas | 1.950 | 97,5% |

As 30 de frequência vêm de 3 contas (`CTA0021`, `CTA0022`, `CTA0023`), com 10 transações cada. A conta mais próxima, `CTA0020`, chega a no máximo 3 transações em qualquer janela de 60 min.

## Sensibilidade dos limiares (base atual)

Quanto o resultado muda se o limiar mudar. Útil para calibrar, mas **vale só para esta base**.

**Valor mínimo**

| Limiar (R$) | Transações marcadas por valor |
|---|---|
| 250 | 94 |
| 500 | 28 |
| 1.000 (atual) | 20 |
| 5.000 | 20 |

Entre R$ 963,37 e R$ 5.000 o resultado é o mesmo (20): não há nenhuma transação nesse intervalo.

**Quantidade mínima na janela de 60 min**

| Mínimo | Transações marcadas | Contas |
|---|---|---|
| 3 | 36 | 4 (inclui `CTA0020`) |
| 4 a 10 (atual: 8) | 30 | 3 |
| 11 | 0 | 0 |

## Casos de borda

Comportamentos conferidos por execução do código. São o ponto de partida natural para os primeiros testes automatizados.

| Cenário | Resultado |
|---|---|
| `valor` = 1000,00 | marcada |
| `valor` = 999,99 | não marcada |
| 8 transações da mesma conta; última exatamente 60 min após a primeira | as 8 marcadas |
| 8 transações da mesma conta; última 60 min **+ 1 s** após a primeira | nenhuma marcada |
| 7 transações da mesma conta em 10 min | nenhuma marcada |
| 8 transações em 8 min, divididas em 2 contas (4 + 4) | nenhuma marcada |
| 10 transações em 10 min **sem** `id_conta` | nenhuma marcada pela frequência |
| 10 transações sem `id_conta` + 1 de R$ 5.000 | só a de R$ 5.000 (por valor) |
| valor negativo (ex.: -5000,00) | não marcada (nem rejeitada) |

O caso de `id_conta` ausente merece atenção: o agrupamento por conta descarta silenciosamente quem não tem conta, então uma rajada sem identificação de conta passa despercebida pela regra de frequência.

## Limitações conhecidas

- **Limiares globais.** O mesmo limite vale para todas as contas, tipos e canais. Não existe perfil por cliente: um valor normal para uma conta empresarial e atípico para outra recebem o mesmo tratamento.
- **Poucos sinais.** Hora do dia, mudança de localidade, canal incomum, tipo da operação e soma acumulada não são considerados.
- **Sem priorização.** `marcada` é binária; não há score para ordenar a fila de revisão.
- **Sem validação com dados reais.** Nada no repositório indica calibração com dados de produção. Os dados atuais têm uma separação muito nítida entre normal e anômalo (nenhum valor entre R$ 963 e R$ 5.000; só 3 contas com mais de 3 operações por hora), o que sugere um conjunto de demonstração. Em dados reais essa folga tende a não existir, e os limiares precisarão ser recalibrados, medindo falsos positivos.

## Como alterar um limiar

1. Altere a constante em `fraud_detection.py`.
2. Altere o **texto** `REGRA_VALOR` / `REGRA_FREQUENCIA` para refletir o novo número.
3. Revise a `justificativa` correspondente em `/criterios` (`backend/main.py`). A de valor alto cita o percentil 95; confirme que ainda procede.
4. Atualize as tabelas deste documento (parâmetros, resultado, sensibilidade).
5. Rode os [casos de borda](#casos-de-borda) e compare `/resumo` antes e depois.
6. Verifique se a interface exibe algum número ou texto da regra fixo no código.

## Como adicionar uma regra

1. Em `fraud_detection.py`: crie a constante do limiar e a constante de texto (`REGRA_NOVA`).
2. Em `classificar_transacoes`: calcule a condição como uma máscara booleana por transação e acrescente o texto a `motivos` quando disparar. Mantenha a regra **independente** das outras: ela não deve depender do resultado de outra regra.
3. Em `/criterios`: acrescente o item (`id`, `descricao`, limiares, `justificativa`).
4. Em `/resumo`: acrescente o contador em `por_criterio`. Hoje essa contagem é feita por `REGRA_* in motivos`, então a nova regra precisa do mesmo tratamento.
5. Documente a regra aqui (condição, escopo, bordas) e adicione seus casos de borda.
6. Mantenha o tom: a regra sinaliza, não acusa.
