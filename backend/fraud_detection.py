"""Regras explicáveis para sinalizar transações que precisam de revisão."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

VALOR_MINIMO = 1000.0
QUANTIDADE_MINIMA = 8
JANELA_MINUTOS = 60

REGRA_VALOR = "Valor igual ou superior a R$ 1.000,00"
REGRA_FREQUENCIA = (
    "8 ou mais transações da mesma conta em uma janela de 60 minutos"
)

COLUNAS_OBRIGATORIAS = {
    "id_transacao",
    "data_hora",
    "id_conta",
    "tipo",
    "valor",
    "canal",
    "localidade",
}


def classificar_transacoes(transacoes: pd.DataFrame) -> pd.DataFrame:
    """Devolve uma cópia com ``marcada`` e a lista explicativa ``motivos``.

    Uma marcação significa possível atividade incomum para revisão; não confirma
    que a transação seja fraudulenta.
    """
    ausentes = COLUNAS_OBRIGATORIAS - set(transacoes.columns)
    if ausentes:
        nomes = ", ".join(sorted(ausentes))
        raise ValueError(f"Colunas obrigatórias ausentes: {nomes}")

    resultado = transacoes.copy().reset_index(drop=True)
    resultado["valor"] = pd.to_numeric(
        resultado["valor"].astype("string").str.replace(",", ".", regex=False),
        errors="coerce",
    )
    resultado["data_hora"] = pd.to_datetime(
        resultado["data_hora"], errors="coerce", format="mixed"
    )
    if resultado["valor"].isna().any():
        raise ValueError("Há valores ausentes ou inválidos na coluna valor.")
    if resultado["data_hora"].isna().any():
        raise ValueError("Há datas ausentes ou inválidas na coluna data_hora.")

    valor_alto = resultado["valor"] >= VALOR_MINIMO
    alta_frequencia = pd.Series(False, index=resultado.index)
    limite_janela = pd.Timedelta(minutes=JANELA_MINUTOS)

    # Janela móvel por conta. Marca as transações que pertencem a pelo menos
    # uma janela de 60 minutos com 8 ou mais operações.
    for _, grupo in resultado.groupby("id_conta", sort=False):
        indices = grupo.sort_values("data_hora", kind="stable").index.to_list()
        horarios = resultado.loc[indices, "data_hora"].to_list()
        direita = 0
        for esquerda, inicio in enumerate(horarios):
            if direita < esquerda:
                direita = esquerda
            while direita < len(horarios) and horarios[direita] <= inicio + limite_janela:
                direita += 1
            if direita - esquerda >= QUANTIDADE_MINIMA:
                alta_frequencia.loc[indices[esquerda:direita]] = True

    motivos: list[list[str]] = []
    for indice in resultado.index:
        lista: list[str] = []
        if valor_alto.loc[indice]:
            lista.append(REGRA_VALOR)
        if alta_frequencia.loc[indice]:
            lista.append(REGRA_FREQUENCIA)
        motivos.append(lista)

    resultado["motivos"] = motivos
    resultado["marcada"] = resultado["motivos"].map(bool)
    return resultado


def carregar_transacoes_classificadas(
    caminho: str | Path | None = None,
) -> pd.DataFrame:
    """Lê ``transacoes.txt`` do diretório do projeto e aplica as regras."""
    arquivo = Path(caminho) if caminho else Path(__file__).resolve().parents[1] / "transacoes.txt"
    if not arquivo.is_file():
        raise FileNotFoundError(f"Arquivo de transações não encontrado: {arquivo}")

    transacoes = pd.read_csv(
        arquivo,
        sep=";",
        decimal=",",
        dtype={
            "id_transacao": "string",
            "id_conta": "string",
            "tipo": "string",
            "canal": "string",
            "localidade": "string",
        },
    )
    return classificar_transacoes(transacoes)


def para_resposta_api(transacoes: pd.DataFrame) -> list[dict[str, object]]:
    """Converte o resultado em registros serializáveis pela API."""
    resposta = transacoes.copy()
    resposta["data_hora"] = resposta["data_hora"].dt.strftime("%Y-%m-%d %H:%M:%S")
    resposta["valor"] = resposta["valor"].astype(float)
    return resposta.to_dict(orient="records")
