# Regras de dados

Contrato do arquivo de entrada (`transacoes.txt`), validações aplicadas na leitura e comportamentos que **não** geram erro, mas afetam o resultado. A implementação está em `carregar_transacoes_classificadas` e `classificar_transacoes`, em [`backend/fraud_detection.py`](../backend/fraud_detection.py).

## Origem dos dados

- Arquivo: `transacoes.txt`, na **raiz do projeto**.
- O caminho é calculado a partir do próprio `fraud_detection.py` (`Path(__file__).resolve().parents[1]`), portanto **não depende do diretório em que o servidor foi iniciado**. Em compensação, mover `fraud_detection.py` ou `transacoes.txt` de lugar quebra a leitura (`FileNotFoundError: Arquivo de transações não encontrado`).
- O arquivo é **relido a cada requisição**. Alterá-lo vale na chamada seguinte, sem reiniciar o servidor.

## Formato do arquivo

| Item | Regra |
|---|---|
| Tipo | texto delimitado (CSV) |
| Separador de campos | ponto e vírgula (`;`) |
| Separador decimal | **vírgula** (`18,00`) |
| Separador de milhar | **não suportado** (`1.234,56` é rejeitado) |
| Cabeçalho | obrigatório, na primeira linha |
| Codificação | **UTF-8** (Latin-1/Windows-1252 causa `UnicodeDecodeError`, que a API devolve como erro 500) |
| Quebra de linha | LF ou CRLF, ambas funcionam |
| Ordem das linhas | irrelevante para as regras (a de frequência ordena internamente); a API devolve na ordem do arquivo |

## Colunas

Todas as sete colunas são **obrigatórias**. Colunas extras são aceitas (e aparecem na tabela da interface, que descobre as colunas dinamicamente).

| Coluna | Tipo | Descrição | Exemplo |
|---|---|---|---|
| `id_transacao` | texto | Identificador da transação | `TX1164` |
| `data_hora` | data e hora | Momento da transação, sem fuso | `2026-10-01 00:16:00` |
| `id_conta` | texto | Conta que originou a transação | `CTA0030` |
| `tipo` | texto | Tipo da operação | `PIX` |
| `valor` | número decimal | Valor em reais | `18,00` |
| `canal` | texto | Canal de origem | `ATM` |
| `localidade` | texto | Cidade/UF | `Salvador-BA` |

Valores observados na base atual (a lista **não é validada**; qualquer texto é aceito):

- `tipo`: `PIX`, `SAQUE`, `COMPRA`, `TED`, `DEPOSITO`
- `canal`: `APP`, `WEB`, `AGENCIA`, `ATM`
- `localidade`: `Recife-PE`, `Juazeiro-BA`, `Petrolina-PE`, `Salvador-BA`, `Paulo Afonso-BA`

## Validações aplicadas (falham a requisição inteira)

Executadas nesta ordem. Qualquer falha lança `ValueError` e a API responde **HTTP 500** (não há tratamento de erro estruturado; a mensagem aparece no log do servidor).

| # | Verificação | Mensagem |
|---|---|---|
| 1 | Todas as colunas obrigatórias presentes | `Colunas obrigatórias ausentes: <nomes em ordem alfabética>` |
| 2 | `valor` numérico em **todas** as linhas | `Há valores ausentes ou inválidos na coluna valor.` |
| 3 | `data_hora` interpretável em **todas** as linhas | `Há datas ausentes ou inválidas na coluna data_hora.` |

Por design, **uma única linha inválida derruba o carregamento inteiro**. A alternativa (descartar a linha ruim e seguir) faria o resumo parecer correto sobre dados incompletos, o que é arriscado num detector de fraudes.

Além das três verificações acima, o próprio pandas pode lançar `ValueError` durante a conversão de datas, com mensagem em inglês e sem tratamento do projeto. O caso conhecido é **fusos horários mistos** (deslocamentos diferentes, ou datas com e sem fuso na mesma coluna): `Mixed timezones detected. Pass utc=True in to_datetime ...`. A API também responde 500.

## Comportamentos que NÃO geram erro

Cuidado: estas situações passam silenciosamente e podem alterar o resultado.

| Situação | O que acontece |
|---|---|
| **`id_conta` ausente** | A transação é avaliada pela regra de valor, mas **fica fora da regra de frequência** (o agrupamento descarta contas nulas). Uma rajada sem conta identificada não é detectada. |
| **Datas em `dd/mm/aaaa`** | São lidas como **mês/dia**: `03/10/2026` vira 10 de março, não 3 de outubro, sem aviso. **Use sempre ISO** (`AAAA-MM-DD HH:MM:SS`). A leitura aceita formatos mistos (`format="mixed"`), inclusive ISO com `T` (`2026-10-03T10:05:00`). |
| **`id_transacao` duplicado** | Aceito. A unicidade não é verificada. |
| **`valor` negativo ou zero** | Aceito. Nunca dispara a regra de valor alto. |
| **`tipo`, `canal`, `localidade` vazios ou com valores novos** | Aceitos. |
| **Colunas extras** | Aceitas e repassadas na resposta. |
| **Datas com fuso uniforme** (ex.: todas com `-03:00` ou `Z`) | Aceitas, e a janela de 60 min funciona normalmente. A saída da API descarta o fuso (`AAAA-MM-DD HH:MM:SS`). |

## Como a vírgula decimal é tratada

A leitura usa `decimal=","`. Além disso, `classificar_transacoes` troca `,` por `.` antes de converter, para funcionar também quando chamada diretamente com textos (por exemplo, em testes). Só a vírgula é tratada: `1.234,56` vira `1.234.56`, que não é número, e a requisição falha na validação 2.

## Formato de saída

A resposta da API mantém as colunas do arquivo e acrescenta `motivos` e `marcada`. Formatos de saída:

| Campo | Tipo na resposta | Observação |
|---|---|---|
| `data_hora` | texto `AAAA-MM-DD HH:MM:SS` | sem fuso, sem `T` |
| `valor` | número (float) | ponto decimal; não use para somas contábeis |
| `id_transacao`, `id_conta`, `tipo`, `canal`, `localidade` | texto | |
| `motivos` | lista de textos | pode ser `[]` |
| `marcada` | booleano | |

Referência completa em [`api.md`](api.md).

## Como substituir a base

1. Gere o arquivo com cabeçalho, `;` como separador, vírgula decimal, datas ISO e codificação UTF-8.
2. Substitua `transacoes.txt` na raiz do projeto.
3. Chame `GET /resumo`. Se devolver números, o arquivo passou nas validações. Se devolver erro 500, leia a mensagem no terminal do `uvicorn`.
4. Confira `total_transacoes` contra o número de linhas do arquivo menos o cabeçalho.
5. Lembre que os limiares das regras foram pensados para a base atual: veja [Sensibilidade dos limiares](regras-de-deteccao.md#sensibilidade-dos-limiares-base-atual).
