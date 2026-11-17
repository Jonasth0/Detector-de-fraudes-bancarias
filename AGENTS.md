# AGENTS.md

Guia de engenharia para quem mantém este repositório, sejam pessoas ou agentes de IA. Registra **como o sistema está organizado e por que foi feito assim**.

- Para **executar** o projeto: [`README.md`](README.md).
- Para as **regras aplicadas** (negócio, dados e API): [`docs/`](docs/).

> **Sobre a origem das decisões.** Os motivos abaixo foram **inferidos do código, dos comentários e do comportamento medido**; não vêm de um registro histórico da equipe. Se algum motivo divergir da intenção original, corrija este arquivo. Números de desempenho foram medidos num ambiente de teste (Python 3.12, pandas 3.0.6) e valem como ordem de grandeza.

## Sumário

- [Propósito e princípios](#propósito-e-princípios)
- [Mapa do repositório](#mapa-do-repositório)
- [Comandos essenciais](#comandos-essenciais)
- [Arquitetura](#arquitetura)
- [Decisões de engenharia e arquitetura](#decisões-de-engenharia-e-arquitetura)
- [Regras para quem altera o código](#regras-para-quem-altera-o-código)
- [Estado atual e pendências](#estado-atual-e-pendências)
- [Versões de referência](#versões-de-referência)

## Propósito e princípios

O sistema lê transações bancárias, aplica regras e **sinaliza as que precisam de revisão humana**. Princípios observados no código:

1. **Explicabilidade antes de sofisticação.** Toda marcação vem com o(s) motivo(s) em texto.
2. **Marcar não é acusar.** A docstring, o endpoint `/criterios` e os textos da interface tratam a saída como *possível anomalia*, nunca como fraude confirmada.
3. **Falhar alto com dado ruim.** Entrada inválida interrompe o processamento em vez de ser descartada em silêncio.
4. **Uma fonte de verdade para os limiares.** As constantes são definidas uma vez e reutilizadas pela classificação e pela API.

## Mapa do repositório

| Caminho | Responsabilidade |
|---|---|
| `backend/fraud_detection.py` | **Domínio.** Leitura do CSV, validação, regras de detecção e serialização. Só depende de pandas. |
| `backend/main.py` | **Camada HTTP.** Rotas FastAPI, filtros de consulta, CORS. |
| `backend/requirements.txt` | Dependências Python (sem versões fixas). |
| `transacoes.txt` | Base de dados (CSV com `;`). Lida a cada requisição. |
| `frontend/src/App.tsx` | Casco da aplicação (hoje **vazio**; veja [pendências](#estado-atual-e-pendências)). |
| `frontend/src/components/` | `TransactionsPage` (tabela genérica com busca e filtro) e `SuspectsPage` (placeholder). |
| `frontend/src/services/api.ts` | Cliente axios com `baseURL` fixo (hoje sem uso). |
| `docs/` | Regras aplicadas: detecção, dados e API. |

## Comandos essenciais

Instalação e execução completas por sistema operacional: [`README.md`](README.md#como-executar).

```bash
# Backend (dentro de backend/, com o venv ativo)
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Frontend (dentro de frontend/)
npm ci
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run lint       # ESLint
npm run build      # tsc -b && vite build
```

**Antes de considerar uma mudança concluída**

- Backend: não há testes automatizados. Rode os [casos de borda](docs/regras-de-deteccao.md#casos-de-borda) afetados e compare `GET /resumo` antes e depois (na base atual: 2.000 / 50 / 1.950, com 20 por valor e 30 por frequência).
- Frontend: `npm run lint` e `npm run build` devem passar.

## Arquitetura

```text
  Navegador                    Servidor (uvicorn :8000)                    Disco
+--------------+ HTTP / JSON +----------------------------------+    +----------------+
| React + Vite |------------>| main.py   (camada HTTP)          |    | transacoes.txt |
| :5173        |   (axios)   |  - rotas, filtros, CORS          |    | CSV com ';'    |
|              |<------------|            |                     |    +--------+-------+
+--------------+             |            v                     |             ^
                             | fraud_detection.py   (domínio)   |  read_csv   |
                             |  - leitura, validação, regras ---+-------------+
                             +----------------------------------+
```

**Ciclo de uma requisição** (o servidor não guarda estado entre chamadas):

1. A rota chama `carregar_transacoes_classificadas()`.
2. `read_csv` lê o arquivo (`sep=";"`, `decimal=","`, colunas de texto como `string`).
3. `classificar_transacoes` valida colunas, converte `valor` e `data_hora`, aplica a regra de valor e a de frequência, e monta `motivos` e `marcada`.
4. A rota aplica os filtros da consulta (`tipo`, `canal`, `marcada`), se houver.
5. `para_resposta_api` converte `data_hora` em texto e `valor` em `float`, e gera a lista de registros.
6. O FastAPI serializa em JSON.

**Fronteiras:** o domínio não conhece HTTP; a camada HTTP não contém limiares de negócio (exceção conhecida: a contagem por regra de `/resumo`, veja D03).

## Decisões de engenharia e arquitetura

Formato: **Decisão**, **Por quê**, **Consequências** e **Revisitar quando**.

### D01. Regras explicáveis em vez de modelo estatístico

- **Decisão:** dois critérios determinísticos (valor alto; alta frequência por conta). Cada transação marcada leva a lista `motivos`.
- **Por quê:** quem revisa precisa saber *por que* algo foi marcado. Regras são auditáveis, fáceis de ajustar e de testar. O código declara esse objetivo na docstring do módulo.
- **Consequências:** só detecta padrões previstos. Limiares globais, sem perfil por cliente. Sem pontuação para priorizar a fila. `tipo`, `canal` e `localidade` não entram em nenhuma regra.
- **Revisitar quando:** houver transações rotuladas (fraude confirmada) que permitam medir precisão e revocação, ou quando os falsos positivos inviabilizarem a revisão.
- Detalhes: [`docs/regras-de-deteccao.md`](docs/regras-de-deteccao.md).

### D02. Motor de regras separado da camada HTTP

- **Decisão:** `fraud_detection.py` depende só de pandas e da biblioteca padrão. `main.py` só cuida de HTTP.
- **Por quê:** as regras podem ser executadas e testadas sem subir servidor. (A validação desta documentação rodou as regras reais sem ter o FastAPI instalado.)
- **Consequências:** `main.py` usa import plano (`from fraud_detection import ...`). Não existe pacote `backend` nem `__init__.py`. Por isso o `uvicorn` só encontra os módulos se rodar **de dentro de `backend/`** ou com `--app-dir backend`. Rodar `uvicorn main:app` da raiz falha com `No module named 'main'`.
- **Regra:** nunca importar FastAPI/Starlette em `fraud_detection.py`.
- **Revisitar quando:** o backend crescer em mais módulos. Aí vale transformar `backend/` num pacote e usar imports relativos.

### D03. Limiares em constantes únicas; texto da regra como identificador (com atritos)

- **Decisão:** `VALOR_MINIMO`, `QUANTIDADE_MINIMA`, `JANELA_MINUTOS`, `REGRA_VALOR` e `REGRA_FREQUENCIA` são definidos uma vez e usados na classificação, em `/criterios` e em `/resumo`.
- **Por quê:** evita que a regra executada e a regra descrita pela API divirjam.
- **Consequências (atritos conhecidos):**
  1. `REGRA_VALOR` e `REGRA_FREQUENCIA` repetem os números **escritos à mão** ("1.000,00", "8", "60"). Mudar a constante sem mudar o texto faz a API descrever uma regra que não é a executada.
  2. `motivos` carrega o **texto**, não o `id` (`valor_alto`, `frequencia_alta`). `/resumo` identifica as regras por `REGRA_* in motivos`. Trocar a redação muda o que o cliente enxerga e pode quebrar filtros por texto.
  3. A `justificativa` de `valor_alto` ("bem acima do percentil 95") é texto fixo. Procede hoje (P95 = R$ 243,45; P99 = R$ 963,36), mas não acompanha os dados.
  4. A contagem por regra de `/resumo` fica em `main.py`, e não no domínio.
- **Revisitar quando:** surgir a terceira regra. É o momento de criar um registro de regras (`id`, texto gerado das constantes, função de avaliação) e devolver `id` em `motivos`.

### D04. CSV como fonte de dados, relido a cada requisição, sem cache

- **Decisão:** `transacoes.txt` na raiz, lido e reclassificado em **toda** chamada.
- **Por quê:** zero infraestrutura e sem invalidação de cache. Editar o arquivo reflete na chamada seguinte, sem reiniciar o servidor.
- **Custo medido** (2.000 linhas): cerca de 90 ms para carregar e classificar (89 a 104 ms em 7 execuções), mais cerca de 14 ms para serializar. `/transacoes` sem filtro devolve cerca de 390 KB. Uma tela que chame 3 ou 4 rotas reprocessa o arquivo 3 ou 4 vezes.
- **Consequências:** o custo cresce com `linhas × requisições`. Não há paginação. O caminho do arquivo é calculado a partir de `fraud_detection.py` (`parents[1]`), então independe do diretório de execução, mas mover os arquivos quebra a leitura.
- **Revisitar quando:** a base passar de dezenas de milhares de linhas ou houver muitos acessos simultâneos. Primeiro passo: cache invalidado pela data de modificação do arquivo. Depois: pré-computar e persistir (SQLite, Parquet ou banco).
- Contrato do arquivo: [`docs/regras-de-dados.md`](docs/regras-de-dados.md).

### D05. Janela deslizante por conta (dois ponteiros)

- **Decisão:** para cada conta, ordenar por `data_hora` (ordenação estável) e avançar dois ponteiros. A janela é **inclusiva** (`<= início + 60 min`). Todas as transações de qualquer janela com 8 ou mais são marcadas.
- **Por quê:** verifica **qualquer** intervalo de 60 min, e não faixas fixas por hora (que deixariam passar rajadas que cruzam a virada da hora). Custa uma ordenação por conta mais uma passada linear, em vez de comparar todos os pares.
- **Consequências:** na borda, 8 transações em exatos 60 min marcam; em 60 min e 1 s, não. Marca todas as transações da janela, e não só a 8ª. Contas sem `id_conta` ficam fora da regra.
- **Revisitar quando:** a regra precisar de pesos (valor acumulado na janela) ou de janelas diferentes por tipo/canal.

### D06. Validação estrita: falhar a requisição inteira

- **Decisão:** `ValueError` para coluna obrigatória ausente, `valor` inválido ou `data_hora` inválida. Uma linha ruim derruba o carregamento inteiro.
- **Por quê:** num detector de fraudes, descartar linhas ruins em silêncio pode esconder justamente o que se procura, e o resumo pareceria correto sobre dados incompletos.
- **Consequências:** `main.py` não trata `ValueError`, `FileNotFoundError` nem `UnicodeDecodeError`, então todas viram **HTTP 500**, com a causa apenas no log do servidor. Há também falhas silenciosas que a validação não cobre (por exemplo, `id_conta` ausente).
- **Revisitar quando:** a base vier de fontes menos controladas. Passos naturais: handlers com resposta estruturada e status adequado, e um relatório de linhas rejeitadas.

### D07. Valores monetários em ponto flutuante

- **Decisão:** `valor` vira `float` (leitura com `decimal=","` ou troca de `,` por `.`).
- **Por quê:** o uso atual é só comparar com um limiar e exibir.
- **Consequências:** a comparação funciona na borda (1000,00 marca; 999,99 não). **Não** use esse `float` para somas contábeis sem arredondar ou usar `Decimal`. Hoje não existe soma monetária: só contagens.
- **Revisitar quando:** surgir qualquer agregação financeira (totais, médias, conciliação).

### D08. Datas: horário local único, ISO recomendado

- **Decisão:** `data_hora` é convertida com `pd.to_datetime(format="mixed")` e tratada como horário local único. A saída é `AAAA-MM-DD HH:MM:SS`, sem fuso.
- **Por quê:** tolera variações de formato sem exigir máscara. A janela só depende da diferença entre horários.
- **Consequências (verificadas):** `03/10/2026` é lido como **10 de março** (mês/dia), sem aviso. Fuso uniforme (`-03:00`, `Z`) é aceito e descartado na saída. Fusos mistos, ou datas com e sem fuso, falham com `ValueError` do pandas (HTTP 500).
- **Regra:** os dados de entrada devem usar ISO.
- **Revisitar quando:** houver dados de várias regiões. Normalizar para UTC na leitura (`utc=True`) e converter só na apresentação.

### D09. Frontend: páginas alimentadas por props e tabela genérica

- **Decisão:** `TransactionsPage` recebe `transactions` por props e **descobre as colunas** pelas chaves do primeiro registro. Busca e filtro rodam no cliente. Valores que são objetos/listas (como `motivos`) aparecem via `JSON.stringify`.
- **Por quê:** a tela não depende do esquema e acompanha novos campos da API sem mudanças.
- **Consequências:** tipagem fraca (`Record<string, unknown>`). Sem formatação de valor, data nem `motivos` (a lista aparece como JSON). A chave de cada linha usa `registro.id ?? index`, mas a API entrega `id_transacao`, então cai no **índice** (funciona, mas não é estável). Busca e filtro no cliente exigem baixar tudo (cerca de 390 KB hoje).
- **Revisitar quando:** as tabelas precisarem de formatação por coluna, ordenação ou grande volume. Aí convém tipar o registro e paginar no servidor.

### D10. CORS restrito e endereço da API fixo no código

- **Decisão:** o backend libera só `http://localhost:5173`. O frontend chama `http://127.0.0.1:8000`, fixo em `api.ts`.
- **Por quê:** superfície mínima em desenvolvimento.
- **Consequências:** qualquer outra origem é bloqueada: `127.0.0.1:5173`, o Vite em outra porta (ele sobe na 5174 se a 5173 estiver ocupada) ou o `vite preview` (porta 4173). Não há configuração por ambiente: `.env` está no `.gitignore`, mas nada o lê. **Não há autenticação**, e o CORS não substitui isso.
- **Revisitar quando:** houver mais de um ambiente. Mover origem permitida e `baseURL` para variáveis de ambiente, e adicionar autenticação antes de qualquer dado real.

### D11. Dependências: backend sem versões fixas, frontend com lockfile

- **Decisão:** `requirements.txt` lista só `fastapi`, `uvicorn[standard]` e `pandas`. O frontend tem `package-lock.json` (instalação reprodutível com `npm ci`).
- **Por quê:** simplicidade inicial.
- **Consequências:** instalações do backend feitas em datas diferentes podem trazer versões diferentes. O código depende de comportamentos do pandas (tipo `string`, `format="mixed"`). O `package.json` usa `^`, mas o lockfile fixa as versões.
- **Revisitar quando:** o projeto sair do ambiente do autor. Fixar versões (veja a [tabela](#versões-de-referência)) ou adotar um lockfile (`pip-tools`, `uv`).

### D12. Português no domínio, inglês na infraestrutura

- **Decisão:** rotas, campos JSON, constantes, funções do domínio, mensagens de erro e textos da interface estão em **pt-BR**. Termos de framework e ferramentas ficam em inglês. Exceção: o nome do módulo `fraud_detection.py`.
- **Por quê:** o domínio e o público são brasileiros, e os campos da API espelham o arquivo de dados.
- **Regra:** manter a convenção. Documentação em pt-BR.

## Regras para quem altera o código

1. **Linguagem de resultado.** Em API, interface, logs e docs use "marcada", "possível anomalia", "revisão". Nunca "fraude confirmada" ou equivalentes.
2. **Mudou um limiar ou texto de regra?** Atualize juntos: a constante, o texto `REGRA_*`, a `justificativa` em `/criterios`, [`docs/regras-de-deteccao.md`](docs/regras-de-deteccao.md) (parâmetros, resultado e sensibilidade) e qualquer texto fixo na interface. Veja o [passo a passo](docs/regras-de-deteccao.md#como-alterar-um-limiar).
3. **Nova regra?** Siga [Como adicionar uma regra](docs/regras-de-deteccao.md#como-adicionar-uma-regra). Mantenha-a independente das demais.
4. **Fronteiras de camada.** O domínio não importa FastAPI. A camada HTTP não ganha limiares de negócio.
5. **Mudou o esquema do arquivo?** Atualize `COLUNAS_OBRIGATORIAS`, [`docs/regras-de-dados.md`](docs/regras-de-dados.md), `docs/api.md` e o frontend.
6. **Mudou um contrato da API** (rota, parâmetro, campo)? Atualize [`docs/api.md`](docs/api.md) e o consumo no frontend. Evite renomear textos de `motivos` sem avisar os consumidores (D03).
7. **Dados.** Não confie em formatos não ISO para datas (D08). Não use `float` para somas monetárias (D07). Só use dados reais depois de resolver autenticação (D10).
8. **Não versione** `.venv/`, `venv/`, `node_modules/`, `dist/`, `.env`, `__pycache__/`. O `.gitignore` atual **não cobre `.venv/`**.
9. **Estilo Python.** Anotações de tipo, `from __future__ import annotations`, docstrings em pt-BR, operações vetorizadas do pandas quando possível.
10. **Estilo TypeScript.** O `tsconfig` ativa `verbatimModuleSyntax` (use `import type` para tipos), `erasableSyntaxOnly` (sem `enum`, `namespace` ou parâmetros de propriedade), `noUnusedLocals` e `noUnusedParameters`. O ESLint usa as regras recomendadas, `react-hooks` e `react-refresh`.

## Estado atual e pendências

Prioridades: **P0** impede o uso; **P1** deveria ser tratado logo; **P2** antes de produção ou de dados reais; **P3** polimento.

| Prio. | Pendência | Evidência | Sugestão |
|---|---|---|---|
| **P0** | **`App.tsx` está vazio e a interface não renderiza** | O arquivo tem 0 bytes e `main.tsx` faz `import App from './App.tsx'`. `App.css` (490 linhas) define sidebar, menu, cartão de conexão (`.connection-*`), cartões de estatística (`.stat-card`, `.stats-grid`) e seção de recentes, o que indica o que `App.tsx` deveria renderizar (inferência). | Restaurar do histórico do Git (`git log -- frontend/src/App.tsx`) ou recriar: casco com menu, consumo de `/status` e `/resumo` e navegação entre `TransactionsPage` e `SuspectsPage`. |
| **P1** | Nenhuma tela usa a API | `services/api.ts` não é importado em lugar nenhum. `recharts` está em `dependencies` sem uso. `SuspectsPage` é estático ("Aguardando dados", "Exibindo 0 registros"). | Ligar `TransactionsPage` a `/transacoes`, `SuspectsPage` a `/transacoes/suspeitas` e os cartões a `/resumo`. Remover `recharts` se não houver gráficos. |
| **P1** | `backend/.venv/` dentro do repositório | 68 MB descompactados. Só tem `Lib/` (sem `Scripts/` nem `pyvenv.cfg`), com binários `cp314-win_amd64`: inutilizável em qualquer SO. O `.gitignore` ignora `venv/`, não `.venv/`. | `git rm -r --cached backend/.venv` e acrescentar `.venv/` ao `.gitignore`. |
| **P1** | Sem testes automatizados | Nenhum arquivo de teste. | Começar com `pytest` sobre `classificar_transacoes`, usando os [casos de borda](docs/regras-de-deteccao.md#casos-de-borda) (não requer FastAPI). |
| **P2** | Erros de dados viram HTTP 500 | `main.py` não trata `ValueError`, `FileNotFoundError` nem `UnicodeDecodeError` (D06). | Handlers com resposta estruturada (`detail` com a causa) e status adequado. |
| **P2** | Sem autenticação; CORS e URL fixos | `allow_origins` em `main.py`; `baseURL` em `api.ts` (D10). | Autenticação e configuração por variável de ambiente antes de usar dados reais. |
| **P2** | `requirements.txt` sem versões | Três linhas, sem versão (D11). | Fixar versões ou adotar lockfile. |
| **P2** | Falhas silenciosas de dados | `id_conta` ausente escapa da regra de frequência; datas `dd/mm` são lidas como `mm/dd` ([`regras-de-dados.md`](docs/regras-de-dados.md#comportamentos-que-não-geram-erro)). | Validar `id_conta` não nulo e rejeitar datas não ISO. |
| **P3** | Texto de regra com números fixos; `motivos` sem `id` | D03. | Gerar o texto a partir das constantes e devolver `id` em `motivos`. |
| **P3** | Sem paginação nem cache | D04. | Cache por data de modificação do arquivo; paginação quando o volume crescer. |
| **P3** | Polimento do frontend | `index.html` com `lang="en"` e `<title>frontend</title>`. `frontend/README.md` é o texto do template do Vite. Chave de linha por índice (D09). | `lang="pt-BR"` e título do produto. Substituir o README do frontend por um link ao principal. Usar `id_transacao` como chave. |

## Versões de referência

Versões com que o projeto foi desenvolvido, lidas dos arquivos do repositório (`backend/.venv` e `frontend/package-lock.json`). O `requirements.txt` não as fixa.

| Componente | Versão |
|---|---|
| Python (autor) | 3.14, Windows x64 (inferido dos binários `cp314-win_amd64`) |
| Python (mínimo recomendado) | 3.11 (exigido por pandas 3.x e Starlette 1.x) |
| FastAPI | 0.163.1 |
| Starlette | 1.10.0 |
| Pydantic | 2.14.3 |
| Uvicorn | 0.54.0 |
| pandas | 3.1.1 |
| NumPy | 2.5.5 |
| Node.js (mínimo) | 20.19+ ou 22.13+ (Vite 8: `^20.19.0 \|\| >=22.12.0`; ESLint 10: `^20.19.0 \|\| ^22.13.0 \|\| >=24`) |
| React / React DOM | 19.3.1 |
| Vite | 8.3.8 |
| TypeScript | 6.0.3 |
| ESLint | 10.15.0 |
| axios | 1.21.1 |
| recharts (sem uso) | 3.10.1 |

A lógica de detecção deste repositório foi executada e conferida com **Python 3.12.3 e pandas 3.0.6**; as rotas foram verificadas chamando as funções reais de `main.py` com um substituto mínimo do FastAPI. A subida do servidor e o frontend (`npm install`, `build`) **não foram executados** nessa verificação, por falta de acesso à rede.
