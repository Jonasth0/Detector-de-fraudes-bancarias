
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Detector de Fraudes Bancárias",
    description="API para análise de possíveis fraudes em transações bancárias",
    version="1.0.0"
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
    return {
        "mensagem": "API do Detector de Fraudes Bancárias funcionando!"
    }


@app.get("/status")
def status():
    return {
        "status": "online",
        "sistema": "Detector de Fraudes Bancárias"
    }
