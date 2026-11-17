# Detector de Fraudes Bancárias

Sistema que analisa transações bancárias e **sinaliza as que merecem revisão humana** usando regras simples e explicáveis. Cada transação marcada traz a lista de motivos que levou à marcação.

> **Marcar não é acusar.** Uma marcação indica possível atividade incomum para revisão. Ela não confirma que a transação seja fraudulenta.

| Parte | Tecnologia | Endereço padrão |
|---|---|---|
| [`backend/`](backend/) | Python · FastAPI · pandas | http://127.0.0.1:8000 |
| [`frontend/`](frontend/) | React · TypeScript · Vite | http://localhost:5173 |

## Sumário

- [Estado atual do projeto](#estado-atual-do-projeto)
- [O que o sistema detecta](#o-que-o-sistema-detecta)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Como executar](#como-executar)
  - [1. Instalar os pré-requisitos](#1-instalar-os-pré-requisitos)
  - [2. Backend](#2-backend)
  - [3. Frontend](#3-frontend)
  - [4. Verificar se está tudo funcionando](#4-verificar-se-está-tudo-funcionando)
- [Usando seus próprios dados](#usando-seus-próprios-dados)
- [Referência rápida da API](#referência-rápida-da-api)
- [Qualidade](#qualidade)
- [Solução de problemas](#solução-de-problemas)
- [Documentação](#documentação)

---

## Estado atual do projeto

| Parte | Situação | Detalhe |
|---|---|---|
| Backend | **Funcional** | Todos os endpoints respondem. Explore-os pelo Swagger em `http://127.0.0.1:8000/docs`. |
| Frontend | **Incompleto** | `frontend/src/App.tsx` está **vazio (0 bytes)**, e `src/main.tsx` importa `App` dele. Enquanto o arquivo não for restaurado, a interface não renderiza. Além disso, nenhuma tela chama a API ainda e `SuspectsPage` é um placeholder. |

Até o frontend ser concluído, valide o sistema pelo backend (veja [Verificar se está tudo funcionando](#4-verificar-se-está-tudo-funcionando)). Lista completa de pendências em [`AGENTS.md`](AGENTS.md#estado-atual-e-pendências).

## O que o sistema detecta

Duas regras independentes. Uma transação é marcada se atender a **pelo menos uma**.

| Regra | Condição | Escopo |
|---|---|---|
| Valor alto | `valor ≥ R$ 1.000,00` | cada transação isoladamente |
| Alta frequência | 8 ou mais transações da mesma conta dentro de 60 minutos (janela móvel) | por conta |

Com a base incluída (`transacoes.txt`: 2.000 transações, 150 contas, outubro de 2026) o resultado é **50 transações marcadas**: 20 por valor alto e 30 por alta frequência (3 contas com 10 operações cada em menos de uma hora).

Detalhes, casos de borda e como alterar as regras: [`docs/regras-de-deteccao.md`](docs/regras-de-deteccao.md).

## Estrutura do repositório

```text
.
├── README.md
├── AGENTS.md                  # decisões de engenharia e arquitetura
├── docs/                      # regras aplicadas no projeto
│   ├── regras-de-deteccao.md  #   regras de negócio (limiares, algoritmo, bordas)
│   ├── regras-de-dados.md     #   contrato e validação do arquivo de entrada
│   └── api.md                 #   referência dos endpoints
├── transacoes.txt             # base de transações (CSV com ';')
├── backend/
│   ├── main.py                # API FastAPI (rotas)
│   ├── fraud_detection.py     # motor de regras (pandas)
│   └── requirements.txt
└── frontend/
    ├── package.json
    └── src/                   # React + TypeScript
```

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Python | **3.11 ou superior** | Exigido pelas versões atuais de pandas e Starlette. |
| Node.js | **20.19+** ou **22.13+** (ou 24+) | Exigido pelo Vite 8 e pelo ESLint 10. |
| npm | o que acompanha o Node | |
| Git | qualquer versão recente | Opcional se você baixar o ZIP. |

Confira o que você já tem:

```bash
python3 --version    # Windows: py --version
node --version
npm --version
```

## Como executar

Abra **dois terminais**, um para o backend e outro para o frontend. Em todos os comandos abaixo, a "raiz do projeto" é a pasta que contém `backend/`, `frontend/` e `transacoes.txt`.

```bash
git clone <URL-DO-REPOSITORIO>
cd <pasta-do-projeto>
```

> **Importante: ignore a pasta `backend/.venv/`.** Se ela veio junto com o código, trata-se de um resto de ambiente Windows (binários `cp314-win_amd64`, sem `Scripts/` nem `pyvenv.cfg`) e **não funciona em nenhum sistema**. Os comandos abaixo criam um ambiente novo em `backend/venv/` (nome já coberto pelo `.gitignore`), evitando misturar os dois.

### 1. Instalar os pré-requisitos

<details>
<summary><strong>macOS</strong></summary>

Com [Homebrew](https://brew.sh):

```bash
brew install python node git
```

O `python3` que acompanha o macOS/Xcode costuma ser antigo. Confirme com `python3 --version` que a versão é 3.11 ou superior depois de instalar. Alternativa ao Homebrew: instaladores oficiais em [python.org](https://www.python.org/downloads/) e [nodejs.org](https://nodejs.org/).

</details>

<details>
<summary><strong>Linux (Debian / Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git curl
```

- O pacote **`python3-venv` é obrigatório** no Debian/Ubuntu. Sem ele, a criação do ambiente virtual falha.
- Distribuições mais antigas trazem Python antigo (o Ubuntu 22.04, por exemplo, traz 3.10). Se `python3 --version` for menor que 3.11, instale uma versão mais nova com [pyenv](https://github.com/pyenv/pyenv) ou [uv](https://docs.astral.sh/uv/).
- O Node dos repositórios da distribuição costuma ser mais antigo que 20.19. Prefira o [nvm](https://github.com/nvm-sh/nvm): depois de instalá-lo, rode `nvm install --lts`.

Em outras distribuições, use o gerenciador de pacotes equivalente (`dnf`, `pacman`, `zypper`…).

</details>

<details>
<summary><strong>Windows</strong></summary>

No PowerShell:

```powershell
winget install --id Python.Python.3.12 -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
```

**Feche e reabra o terminal** depois de instalar, para o `PATH` ser atualizado. Se preferir instaladores manuais, baixe em [python.org](https://www.python.org/downloads/) (marque **Add python.exe to PATH**) e [nodejs.org](https://nodejs.org/).

No Windows, use `py` (o *Python Launcher*) em vez de `python3`: `py --version`.

</details>

### 2. Backend

Execute **dentro de `backend/`**. O `main.py` importa `fraud_detection` diretamente, então o `uvicorn` precisa enxergar essa pasta (veja [Solução de problemas](#solução-de-problemas)).

<details open>
<summary><strong>macOS e Linux</strong> (bash / zsh)</summary>

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

</details>

<details>
<summary><strong>Windows (PowerShell)</strong></summary>

```powershell
cd backend
py -3 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Se o `Activate.ps1` for bloqueado ("a execução de scripts foi desabilitada neste sistema"), escolha uma das saídas:

```powershell
# Opção A: liberar scripts assinados localmente, só para o seu usuário
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Opção B: não ativar o ambiente e chamar o Python do venv diretamente
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

</details>

<details>
<summary><strong>Windows (Prompt de Comando / cmd)</strong></summary>

```bat
cd backend
py -3 -m venv venv
venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

</details>

Deixe esse terminal aberto. Quando o servidor subir, você verá uma linha como `Uvicorn running on http://127.0.0.1:8000`. Para parar: `Ctrl+C`. Para sair do ambiente virtual: `deactivate`.

> O endereço `127.0.0.1:8000` precisa bater com o `baseURL` de `frontend/src/services/api.ts`. Se mudar a porta ou o host, ajuste lá também.

### 3. Frontend

Em **outro terminal**, a partir da raiz do projeto. Os comandos são iguais em macOS, Linux e Windows:

```bash
cd frontend
npm ci
npm run dev
```

`npm ci` instala exatamente as versões do `package-lock.json` (instalação reprodutível). Depois, abra **http://localhost:5173**.

> Abra pelo endereço **`localhost`**, não por `127.0.0.1`. O backend só libera CORS para `http://localhost:5173`; qualquer outra origem (outro host, outra porta) é bloqueada pelo navegador.

No **Windows PowerShell**, se o `npm` reclamar que a execução de scripts está desabilitada, use `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` (como acima) ou rode os mesmos comandos no Prompt de Comando.

Lembre-se do [estado atual do frontend](#estado-atual-do-projeto): enquanto `App.tsx` estiver vazio, a página não carrega.

### 4. Verificar se está tudo funcionando

Com o backend rodando, teste de qualquer sistema:

**macOS / Linux** (e Git Bash no Windows):

```bash
curl http://127.0.0.1:8000/status
curl http://127.0.0.1:8000/resumo
```

**Windows PowerShell** (use `curl.exe`, pois `curl` é um apelido de outro comando):

```powershell
curl.exe http://127.0.0.1:8000/status
Invoke-RestMethod http://127.0.0.1:8000/resumo | ConvertTo-Json
```

Resposta esperada de `/status`:

```json
{"status":"online","sistema":"Detector de Fraudes Bancárias"}
```

Com a base `transacoes.txt` original, `/resumo` deve devolver exatamente estes números (se baterem, a leitura dos dados e as regras estão funcionando):

```json
{"total_transacoes":2000,"total_marcadas":50,"total_nao_marcadas":1950,"por_criterio":{"valor_alto":20,"frequencia_alta":30}}
```

Para explorar a API no navegador: **http://127.0.0.1:8000/docs** (Swagger UI) ou **/redoc**.

## Usando seus próprios dados

A API lê o arquivo `transacoes.txt` da **raiz do projeto**. Para analisar outros dados, substitua o arquivo mantendo o formato:

```text
id_transacao;data_hora;id_conta;tipo;valor;canal;localidade
TX0001;2026-10-01 00:16:00;CTA0030;PIX;18,00;ATM;Salvador-BA
```

Resumo das regras do formato: separador `;`, decimal com vírgula (sem separador de milhar), datas em ISO (`AAAA-MM-DD HH:MM:SS`), arquivo em UTF-8, cabeçalho na primeira linha. **Não é preciso reiniciar o servidor**, porque o arquivo é relido a cada requisição. Linhas inválidas fazem a API responder erro 500 em vez de serem ignoradas. Todos os detalhes estão em [`docs/regras-de-dados.md`](docs/regras-de-dados.md).

## Referência rápida da API

| Método | Rota | O que devolve |
|---|---|---|
| GET | `/` | mensagem de boas-vindas |
| GET | `/status` | `{"status": "online", ...}` |
| GET | `/criterios` | regras aplicadas, limiares e justificativas |
| GET | `/transacoes` | todas as transações classificadas; filtros opcionais `tipo`, `canal`, `marcada` |
| GET | `/transacoes/suspeitas` | somente as marcadas, cada uma com seus `motivos` |
| GET | `/resumo` | totais e contagem por regra, para cartões e gráficos |

Exemplo: `GET /transacoes?tipo=PIX&marcada=true`. Parâmetros, formatos e respostas completas: [`docs/api.md`](docs/api.md).

## Qualidade

**Frontend** (a partir de `frontend/`):

```bash
npm run lint     # ESLint
npm run build    # checagem de tipos (tsc) + build de produção do Vite
```

Enquanto `App.tsx` estiver vazio, o `build` deve falhar na checagem de tipos.

**Backend:** o repositório ainda **não tem testes automatizados**. Os casos de borda das regras estão documentados em [`docs/regras-de-deteccao.md`](docs/regras-de-deteccao.md#casos-de-borda) e são o ponto de partida natural para os primeiros testes.

## Solução de problemas

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| `Could not import module "main"` ou `No module named 'main'` | `uvicorn` executado fora de `backend/` | `cd backend` antes, ou, da raiz: `uvicorn main:app --app-dir backend --reload` |
| `No module named 'fraud_detection'` | idem: `backend/` fora do caminho de importação | idem |
| `No module named 'fastapi'` / `'pandas'` / `'uvicorn'` | ambiente virtual não ativado, ou dependências não instaladas | ative o `venv` e rode `pip install -r requirements.txt` |
| `externally-managed-environment` ao rodar `pip install` | instalação fora de um ambiente virtual (Debian 12+, Ubuntu 23.04+, Python do Homebrew) | crie e ative o `venv` como mostrado acima |
| `ensurepip is not available` ao criar o venv (Debian/Ubuntu) | falta o pacote `python3-venv` | `sudo apt install python3-venv` |
| `Python was not found` / abre a Microsoft Store (Windows) | o apelido da Store intercepta `python` | use `py -3`, ou instale o Python marcando *Add python.exe to PATH* |
| "a execução de scripts foi desabilitada neste sistema" (PowerShell) | política de execução bloqueia `Activate.ps1` / `npm.ps1` | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, ou use o cmd |
| Erro de CORS no console do navegador | o frontend não está em `http://localhost:5173` (ex.: aberto por `127.0.0.1`, ou o Vite subiu na 5174 porque a 5173 estava ocupada) | libere a porta 5173 e abra por `http://localhost:5173`; ou adicione a origem em `allow_origins` no `backend/main.py` |
| `Address already in use` / porta ocupada | outro processo usa 8000 ou 5173 | macOS/Linux: `lsof -i :8000`. Windows: `netstat -ano \| findstr :8000` e depois `taskkill /PID <pid> /F`. Se trocar a porta do backend, ajuste `baseURL` em `frontend/src/services/api.ts` |
| Aviso/erro `Unsupported engine` ou o Vite pedindo Node mais novo | Node abaixo de 20.19 | atualize o Node (veja [Pré-requisitos](#pré-requisitos)) |
| API responde **500** em `/transacoes`, `/resumo` etc. | `transacoes.txt` ausente ou inválido | veja a mensagem no terminal do `uvicorn` (ex.: `Colunas obrigatórias ausentes`, `valores ausentes ou inválidos`) e confira [`docs/regras-de-dados.md`](docs/regras-de-dados.md) |
| Página em branco / `does not provide an export named 'default'` no navegador | `frontend/src/App.tsx` está vazio | veja [Estado atual do projeto](#estado-atual-do-projeto) |
| `UnicodeDecodeError` (500) ao trocar o arquivo de dados | `transacoes.txt` salvo em Latin-1/Windows-1252 | salve como UTF-8 |

## Documentação

| Documento | Conteúdo |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Arquitetura, decisões de engenharia (com motivos e consequências), convenções e pendências conhecidas |
| [`docs/regras-de-deteccao.md`](docs/regras-de-deteccao.md) | Regras de negócio: parâmetros, algoritmo, casos de borda, sensibilidade dos limiares, como alterar |
| [`docs/regras-de-dados.md`](docs/regras-de-dados.md) | Formato do arquivo de entrada, validações aplicadas e comportamentos silenciosos |
| [`docs/api.md`](docs/api.md) | Referência dos endpoints com exemplos reais |
