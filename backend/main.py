from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fraud_detection import (
    REGRA_FREQUENCIA,
    REGRA_VALOR,
    JANELA_MINUTOS,
    QUANTIDADE_MINIMA,
    VALOR_MINIMO,
    carregar_transacoes_classificadas,
    para_resposta_api,
)

app = FastAPI(
    title="Detector de Fraudes Bancárias",
    description="API para análise de possíveis fraudes em transações bancárias",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def inicio():
    return {"mensagem": "API do Detector de Fraudes Bancárias funcionando!"}


@app.get("/status")
def status():
    return {"status": "online", "sistema": "Detector de Fraudes Bancárias"}


@app.get("/criterios")
def criterios():
    """Explica os limites aplicados e deixa explícito que são alertas."""
    return {
        "observacao": "Os critérios sinalizam possíveis anomalias; não confirmam fraude.",
        "regras": [
            {
                "id": "valor_alto",
                "descricao": REGRA_VALOR,
                "limite": VALOR_MINIMO,
                "justificativa": "O limite fica bem acima do percentil 95 observado nos dados.",
            },
            {
                "id": "frequencia_alta",
                "descricao": REGRA_FREQUENCIA,
                "quantidade_minima": QUANTIDADE_MINIMA,
                "janela_minutos": JANELA_MINUTOS,
                "justificativa": "Detecta várias operações concentradas da mesma conta.",
            },
        ],
    }


@app.get("/transacoes")
def listar_transacoes():
    """Lista todas as transações com a marcação e seus motivos."""
    dados = carregar_transacoes_classificadas()
    return para_resposta_api(dados)


@app.get("/transacoes/suspeitas")
def listar_transacoes_marcadas():
    """Lista somente transações sinalizadas e explica cada marcação."""
    dados = carregar_transacoes_classificadas()
    marcadas = dados.loc[dados["marcada"]]
    return para_resposta_api(marcadas)


@app.get("/resumo")
def resumo():
    """Devolve totais para os cartões e gráficos do dashboard."""
    dados = carregar_transacoes_classificadas()
    motivos = dados["motivos"]
    por_valor = motivos.map(lambda lista: REGRA_VALOR in lista)
    por_frequencia = motivos.map(lambda lista: REGRA_FREQUENCIA in lista)
    return {
        "total_transacoes": int(len(dados)),
        "total_marcadas": int(dados["marcada"].sum()),
        "total_nao_marcadas": int((~dados["marcada"]).sum()),
        "por_criterio": {
            "valor_alto": int(por_valor.sum()),
            "frequencia_alta": int(por_frequencia.sum()),
        },
    }
