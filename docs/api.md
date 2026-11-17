# Referência da API

API REST em JSON, implementada em [`backend/main.py`](../backend/main.py) com FastAPI. Todas as rotas são `GET` e somente leitura.

- **URL base (desenvolvimento):** `http://127.0.0.1:8000`
- **Documentação interativa:** `/docs` (Swagger UI) e `/redoc`. O esquema OpenAPI fica em `/openapi.json`. São gerados automaticamente pelo FastAPI e sempre refletem o código.

## Regras gerais

| Tema | Regra |
|---|---|
| Autenticação | **Nenhuma.** Qualquer cliente que alcance a porta lê todos os dados. Adequado para demonstração, não para dados reais. |
| CORS | Somente a origem `http://localhost:5173` é liberada (todos os métodos e cabeçalhos, com credenciais). Outras origens são bloqueadas pelo navegador. Não afeta `curl`/Postman. |
| Processamento | Sem estado e sem cache: **cada requisição relê `transacoes.txt` e reaplica as regras** (cerca de 90 ms para 2.000 linhas num ambiente de teste com Python 3.12 e pandas 3.0.6; o tempo cresce com o nº de linhas e é pago em toda chamada. Veja D04 em [`AGENTS.md`](../AGENTS.md)). |
| Paginação | Não existe. `/transacoes` sem filtros devolve tudo (~390 KB hoje). |
| Ordem | Os registros saem na ordem do arquivo. |
| Erros de dados | Arquivo ausente ou inválido gera **HTTP 500**. A causa aparece no log do servidor (veja [`regras-de-dados.md`](regras-de-dados.md)). |
| Erros de parâmetro | Valor de query de tipo inválido (ex.: `marcada=abc`) gera **HTTP 422**, com o detalhe padrão do FastAPI. |

## Endpoints

| Rota | Descrição |
|---|---|
| [`GET /`](#get-) | Mensagem de boas-vindas |
| [`GET /status`](#get-status) | Verificação de disponibilidade |
| [`GET /criterios`](#get-criterios) | Regras aplicadas, limiares e justificativas |
| [`GET /transacoes`](#get-transacoes) | Transações classificadas, com filtros opcionais |
| [`GET /transacoes/suspeitas`](#get-transacoessuspeitas) | Somente as transações marcadas |
| [`GET /resumo`](#get-resumo) | Totais para cartões e gráficos |

### `GET /`

```json
{"mensagem": "API do Detector de Fraudes Bancárias funcionando!"}
```

### `GET /status`

```json
{"status": "online", "sistema": "Detector de Fraudes Bancárias"}
```

Não toca nos dados: serve para saber se o servidor está de pé, mesmo com o arquivo de transações quebrado.

### `GET /criterios`

Descreve as regras vigentes. Os limiares vêm das mesmas constantes usadas na classificação, então não divergem do que é executado (os **textos** é que precisam ser mantidos à mão: veja [`regras-de-deteccao.md`](regras-de-deteccao.md#parâmetros)).

```json
{
  "observacao": "Os critérios sinalizam possíveis anomalias; não confirmam fraude.",
  "regras": [
    {
      "id": "valor_alto",
      "descricao": "Valor igual ou superior a R$ 1.000,00",
      "limite": 1000.0,
      "justificativa": "O limite fica bem acima do percentil 95 observado nos dados."
    },
    {
      "id": "frequencia_alta",
      "descricao": "8 ou mais transações da mesma conta em uma janela de 60 minutos",
      "quantidade_minima": 8,
      "janela_minutos": 60,
      "justificativa": "Detecta várias operações concentradas da mesma conta."
    }
  ]
}
```

### `GET /transacoes`

Lista as transações classificadas. Todos os parâmetros são opcionais e **combinam com "E"**.

| Parâmetro | Tipo | Comportamento |
|---|---|---|
| `tipo` | texto | Igualdade **exata**, sem diferenciar maiúsculas de minúsculas (`pix` = `PIX`). Não é busca por trecho. |
| `canal` | texto | Igual a `tipo`. |
| `marcada` | booleano | `true` só marcadas, `false` só não marcadas. Aceita `true`/`false` (e `1`/`0`). |

Detalhes:

- `?tipo=` (vazio) é tratado como se o parâmetro não existisse.
- Valor sem correspondência (ex.: `?tipo=XYZ`) devolve `200` com lista vazia `[]`, e não erro.
- Resultado: lista de [registros](#registro-de-transação).

Contagens na base atual:

| Requisição | Registros |
|---|---|
| `/transacoes` | 2.000 |
| `/transacoes?tipo=PIX` (ou `pix`) | 429 |
| `/transacoes?canal=ATM` | 467 |
| `/transacoes?tipo=PIX&canal=APP` | 131 |
| `/transacoes?marcada=true` | 50 |
| `/transacoes?marcada=false` | 1.950 |
| `/transacoes?tipo=PIX&marcada=true` | 36 |

### `GET /transacoes/suspeitas`

Só as transações marcadas, sem parâmetros. Equivale a `/transacoes?marcada=true` (50 registros na base atual). Cada item traz os `motivos`.

Exemplo de marcação por **frequência** (conta `CTA0021`, rajada de 10 operações em 36 min):

```json
{
  "id_transacao": "TX1971",
  "data_hora": "2026-10-09 01:00:00",
  "id_conta": "CTA0021",
  "tipo": "PIX",
  "valor": 228.93,
  "canal": "APP",
  "localidade": "Petrolina-PE",
  "motivos": ["8 ou mais transações da mesma conta em uma janela de 60 minutos"],
  "marcada": true
}
```

Exemplo de marcação por **valor**:

```json
{
  "id_transacao": "TX1964",
  "data_hora": "2026-10-01 16:54:00",
  "id_conta": "CTA0148",
  "tipo": "TED",
  "valor": 20828.57,
  "canal": "APP",
  "localidade": "Salvador-BA",
  "motivos": ["Valor igual ou superior a R$ 1.000,00"],
  "marcada": true
}
```

### `GET /resumo`

Totais para os cartões e gráficos do dashboard.

```json
{
  "total_transacoes": 2000,
  "total_marcadas": 50,
  "total_nao_marcadas": 1950,
  "por_criterio": {
    "valor_alto": 20,
    "frequencia_alta": 30
  }
}
```

`por_criterio` conta quantas transações dispararam cada regra. Uma transação com os dois motivos entra nas duas contagens, então **`valor_alto + frequencia_alta` pode ser maior que `total_marcadas`** (hoje é igual: 20 + 30 = 50, pois nenhuma transação dispara as duas).

## Registro de transação

Formato de cada item devolvido por `/transacoes` e `/transacoes/suspeitas`:

| Campo | Tipo | Descrição |
|---|---|---|
| `id_transacao` | texto | Identificador da transação |
| `data_hora` | texto `AAAA-MM-DD HH:MM:SS` | Momento da transação (sem fuso) |
| `id_conta` | texto | Conta de origem |
| `tipo` | texto | `PIX`, `SAQUE`, `COMPRA`, `TED`, `DEPOSITO` (na base atual) |
| `valor` | número | Valor em reais, com ponto decimal |
| `canal` | texto | `APP`, `WEB`, `AGENCIA`, `ATM` (na base atual) |
| `localidade` | texto | Cidade/UF |
| `motivos` | lista de textos | Por que foi marcada; `[]` se não foi |
| `marcada` | booleano | `true` se `motivos` não estiver vazia |

Colunas extras no `transacoes.txt` também aparecem em cada registro.

> **Sobre `motivos`:** contém o **texto descritivo** da regra, não o `id`. Hoje não há como identificar a regra num registro de forma estável. Evite montar lógica de cliente em cima do texto; se precisar, prefira que a API passe a devolver os `id` (veja a decisão D03 em [`AGENTS.md`](../AGENTS.md)).

## Exemplos de uso

**macOS / Linux / Git Bash** (aspas na URL são obrigatórias por causa do `&`):

```bash
curl "http://127.0.0.1:8000/transacoes?tipo=PIX&marcada=true"
curl http://127.0.0.1:8000/transacoes/suspeitas
curl http://127.0.0.1:8000/criterios
```

**Windows PowerShell:**

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/transacoes?tipo=PIX&marcada=true"
Invoke-RestMethod http://127.0.0.1:8000/resumo | ConvertTo-Json -Depth 5
```

**Axios (frontend):** o cliente configurado em `frontend/src/services/api.ts` já tem o `baseURL`:

```ts
import api from "./services/api";

const { data } = await api.get("/transacoes", { params: { marcada: true } });
```
