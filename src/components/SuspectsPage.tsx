
import { useMemo } from "react";
import "./SuspectsPage.css";

type TransactionRecord = Record<string, unknown>;

interface SuspectsPageProps {
  transactions: TransactionRecord[];
}

function SuspectsPage({ transactions }: SuspectsPageProps) {
  const suspeitas = useMemo(
    () =>
      transactions.filter(
        (transaction) => transaction.marcada === true
      ),
    [transactions]
  );

  const colunas = useMemo(
    () =>
      suspeitas.length > 0
        ? Object.keys(suspeitas[0])
        : [],
    [suspeitas]
  );

  return (
    <div className="suspects-container">
      <div className="suspects-heading">
        <div>
          <h2>Gerenciamento de suspeitas</h2>
          <p>
            Consulte e acompanhe os registros de transações
            sinalizadas pelo sistema.
          </p>
        </div>

        <span className="suspects-count">
          {suspeitas.length} suspeitas encontradas
        </span>
      </div>

      <section className="suspects-panel">
        <div className="suspects-panel-top">
          <div>
            <h3>Registros suspeitos</h3>
            <p>
              Transações que atenderam aos critérios de detecção.
            </p>
          </div>
        </div>

        {suspeitas.length > 0 ? (
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
                {suspeitas.map((registro, index) => (
                  <tr
                    key={String(
                      registro.id_transacao ?? index
                    )}
                  >
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
          </div>
        ) : (
          <div className="suspects-empty">
            <div className="suspects-empty-icon">
              <span>!</span>
            </div>

            <h3>Nenhuma suspeita disponível</h3>

            <p>
              Nenhuma transação foi sinalizada pelo sistema.
            </p>
          </div>
        )}

        <div className="suspects-footer">
          Exibindo {suspeitas.length} registros
        </div>
      </section>
    </div>
  );
}

export default SuspectsPage;
