from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from fraud_detection import (  # noqa: E402
    REGRA_FREQUENCIA,
    REGRA_VALOR,
    classificar_transacoes,
)


def criar_transacoes(
    quantidade: int = 1,
    *,
    valor: float = 100.0,
    id_conta: str | None = "CTA001",
    inicio: str = "2026-10-09 01:00:00",
    intervalo_minutos: int = 0,
) -> pd.DataFrame:
    inicio_dt = pd.Timestamp(inicio)
    return pd.DataFrame(
        {
            "id_transacao": [f"T{i}" for i in range(quantidade)],
            "data_hora": [
                inicio_dt + pd.Timedelta(minutes=i * intervalo_minutos)
                for i in range(quantidade)
            ],
            "id_conta": [id_conta] * quantidade,
            "tipo": ["COMPRA"] * quantidade,
            "valor": [valor] * quantidade,
            "canal": ["WEB"] * quantidade,
            "localidade": ["SAO PAULO"] * quantidade,
        }
    )


@pytest.mark.parametrize(
    ("valor", "marcada"),
    [(1000.0, True), (999.99, False), (-5000.0, False)],
)
def test_limite_inclusivo_da_regra_de_valor(valor: float, marcada: bool) -> None:
    resultado = classificar_transacoes(criar_transacoes(valor=valor))

    assert bool(resultado.loc[0, "marcada"]) is marcada
    if marcada:
        assert resultado.loc[0, "motivos"] == [REGRA_VALOR]
    else:
        assert resultado.loc[0, "motivos"] == []


@pytest.mark.parametrize(
    ("ultima_transacao", "marcada"),
    [("2026-10-09 02:00:00", True), ("2026-10-09 02:00:01", False)],
)
def test_oitava_transacao_na_ultima_extremidade_da_janela(
    ultima_transacao: str,
    marcada: bool,
) -> None:
    transacoes = criar_transacoes()
    transacoes = pd.concat(
        [
            transacoes,
            pd.DataFrame(
                {
                    coluna: [valor] * 7
                    for coluna, valor in [
                        ("id_transacao", "T"),
                        ("data_hora", pd.Timestamp("2026-10-09 01:10:00")),
                        ("id_conta", "CTA001"),
                        ("tipo", "COMPRA"),
                        ("valor", 100.0),
                        ("canal", "WEB"),
                        ("localidade", "SAO PAULO"),
                    ]
                }
            ),
        ],
        ignore_index=True,
    )
    transacoes.loc[7, "data_hora"] = pd.Timestamp(ultima_transacao)

    resultado = classificar_transacoes(transacoes)

    assert resultado["marcada"].eq(marcada).all()
    if marcada:
        assert all(REGRA_FREQUENCIA in motivos for motivos in resultado["motivos"])


def test_sete_transacoes_na_mesma_conta_nao_disparam_frequencia() -> None:
    resultado = classificar_transacoes(
        criar_transacoes(7, intervalo_minutos=1)
    )

    assert not resultado["marcada"].any()


def test_contas_diferentes_nao_somam_transacoes() -> None:
    transacoes = criar_transacoes(4, id_conta="CTA001", intervalo_minutos=1)
    outra_conta = criar_transacoes(4, id_conta="CTA002", intervalo_minutos=1)

    resultado = classificar_transacoes(pd.concat([transacoes, outra_conta], ignore_index=True))

    assert not resultado["marcada"].any()


def test_coluna_obrigatoria_ausente_interrompe_classificacao() -> None:
    transacoes = criar_transacoes().drop(columns="id_conta")

    with pytest.raises(ValueError, match="Colunas obrigatórias ausentes: id_conta"):
        classificar_transacoes(transacoes)
