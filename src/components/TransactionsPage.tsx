
import { useMemo, useState } from "react";
import "./TransactionsPage.css";

export type TransactionRecord = Record<string, unknown>;

interface TransactionsPageProps {
  transactions: TransactionRecord[];
}

function TransactionsPage({ transactions }: TransactionsPageProps) {
  const [pesquisa, setPesquisa] = useState("");
  const [campoFiltro, setCampoFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  // Os campos são identificados automaticamente a partir dos dados recebidos.
  const colunas = useMemo(
    () => transactions.length > 0
      ? Object.keys(transactions[0])
      : [],
    [transactions]
  );

  const valoresFiltro = useMemo(() => {
    if (!campoFiltro) return [];

    return Array.from(
      new Set(
        transactions.map((item) => String(item[campoFiltro] ?? ""))
      )
    );
  }, [transactions, campoFiltro]);

  const filtradas = useMemo(() => {
    return transactions.filter((item) => {
      const correspondePesquisa = Object.values(item).some((valor) =>
        String(valor ?? "")
          .toLowerCase()
          .includes(pesquisa.toLowerCase())
      );

      const correspondeFiltro =
        !campoFiltro ||
        !valorFiltro ||
        String(item[campoFiltro] ?? "") === valorFiltro;

      return correspondePesquisa && correspondeFiltro;
    });
  }, [transactions, pesquisa, campoFiltro, valorFiltro]);

  return (
    <div className="transactions-page">
      <section className="transactions-intro">
        <div>
          <h2>Gerenciamento de transações</h2>
          <p>
            Consulte e organize os registros disponibilizados na ferramenta.
          </p>
        </div>

        <span className="records-count">
          {transactions.length} registros
        </span>
      </section>

      <section className="transactions-panel">
        <div className="transactions-toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Pesquisar nos registros..."
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select
              value={campoFiltro}
              onChange={(event) => {
                setCampoFiltro(event.target.value);
                setValorFiltro("");
              }}
              disabled={colunas.length === 0}
            >
              <option value="">Filtrar por campo</option>
              {colunas.map((coluna) => (
                <option key={coluna} value={coluna}>
                  {coluna}
                </option>
              ))}
            </select>

            <select
              value={valorFiltro}
              onChange={(event) => setValorFiltro(event.target.value)}
              disabled={!campoFiltro}
            >
              <option value="">Todos os valores</option>
              {valoresFiltro.map((valor) => (
                <option key={valor} value={valor}>
                  {valor || "(vazio)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {transactions.length > 0 ? (
          <div className="dynamic-table-wrapper">
            <table className="dynamic-table">
              <thead>
                <tr>
                  {colunas.map((coluna) => (
                    <th key={coluna}>{coluna}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtradas.map((registro, index) => (
                  <tr key={String(registro.id ?? index)}>
                    {colunas.map((coluna) => (
                      <td key={coluna}>
                        {registro[coluna] == null
                          ? "—"
                          : typeof registro[coluna] === "object"
                            ? JSON.stringify(registro[coluna])
                            : String(registro[coluna])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {filtradas.length === 0 && (
              <div className="transactions-empty">
                Nenhum registro corresponde à pesquisa.
              </div>
            )}
          </div>
        ) : (
          <div className="transactions-empty">
            <div className="transactions-empty-icon">⇄</div>
            <h3>Nenhuma transação disponível</h3>
            <p>
              Os registros aparecerão aqui quando forem disponibilizados
              pela ferramenta.
            </p>
          </div>
        )}

        <div className="transactions-footer">
          Exibindo {filtradas.length} de {transactions.length} registros
        </div>
      </section>
    </div>
  );
}

export default TransactionsPage;
