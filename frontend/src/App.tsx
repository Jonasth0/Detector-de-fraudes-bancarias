
import { useEffect, useState } from "react";
import api from "./services/api";
import DashboardCharts, { type ResumoAPI } from "./components/DashboardCharts";
import TransactionsPage, {
  type TransactionRecord,
} from "./components/TransactionsPage";
import SuspectsPage from "./components/SuspectsPage";
import "./App.css";

interface StatusAPI {
  status: string;
  sistema: string;
  versao?: string;
}

type Pagina = "inicio" | "transacoes" | "suspeitas";

function App() {
  const [pagina, setPagina] = useState<Pagina>("inicio");
  const [dados, setDados] = useState<StatusAPI | null>(null);
  const [resumo, setResumo] = useState<ResumoAPI | null>(null);
  const [transacoes, setTransacoes] = useState<TransactionRecord[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Seleciona as cinco primeiras transações sinalizadas.
  const alertasRecentes = transacoes
    .filter((transacao) => transacao.marcada === true)
    .slice(0, 5);

  useEffect(() => {
    async function carregarPainel() {
      try {
        const [respostaStatus, respostaResumo, respostaTransacoes] =
          await Promise.all([
            api.get<StatusAPI>("/status"),
            api.get<ResumoAPI>("/resumo"),
            api.get<TransactionRecord[]>("/transacoes"),
          ]);

        setDados(respostaStatus.data);
        setResumo(respostaResumo.data);
        setTransacoes(respostaTransacoes.data);
        setErro(false);
      } catch (error) {
        console.error("Erro ao carregar painel:", error);
        setErro(true);
      } finally {
        setCarregando(false);
      }
    }

    carregarPainel();
  }, []);

  function mudarPagina(novaPagina: Pagina) {
    setPagina(novaPagina);
  }

  const titulo =
    pagina === "inicio"
      ? "Visão geral"
      : pagina === "transacoes"
        ? "Todas as transações"
        : "Transações suspeitas";

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">D</div>
          <div>
            <h2>Detector</h2>
            <span>Fraudes Bancárias</span>
          </div>
        </div>

        <div className="menu-title">MENU PRINCIPAL</div>

        <nav className="menu">
          <button
            className={pagina === "inicio" ? "menu-item active" : "menu-item"}
            onClick={() => mudarPagina("inicio")}
          >
            <span className="menu-icon">⌂</span>
            Visão geral
          </button>

          <button
            className={
              pagina === "transacoes" ? "menu-item active" : "menu-item"
            }
            onClick={() => mudarPagina("transacoes")}
          >
            <span className="menu-icon">⇄</span>
            Todas as transações
          </button>

          <button
            className={
              pagina === "suspeitas" ? "menu-item active" : "menu-item"
            }
            onClick={() => mudarPagina("suspeitas")}
          >
            <span className="menu-icon">⚠</span>
            Suspeitas
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="footer-dot"></span>
          Sistema de monitoramento
          <small>Projeto acadêmico</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Detector de Fraudes /</span>
            <h1>{titulo}</h1>
          </div>

          <div className="topbar-version">
            Versão {dados?.versao ?? "1.0.0"}
          </div>
        </header>

        {pagina === "inicio" ? (
          <div className="page-content">
            <section className="welcome">
              <div>
                <h2>Bem-vindo ao painel!</h2>
                <p>
                  Acompanhe as transações bancárias e possíveis atividades
                  suspeitas.
                </p>
              </div>
            </section>

            <section className="connection-card">
              <div className="connection-info">
                <div className="connection-icon">↗</div>

                <div>
                  <h3>Conexão com o servidor</h3>

                  {carregando ? (
                    <p className="connection-loading">
                      Verificando conexão...
                    </p>
                  ) : erro ? (
                    <p className="connection-error">
                      ● Backend desconectado
                    </p>
                  ) : (
                    <p className="connection-online">
                      ● Backend conectado
                    </p>
                  )}
                </div>
              </div>

              <span className="connection-label">
                {carregando ? "Verificando" : erro ? "Offline" : "Online"}
              </span>
            </section>

            <section className="section-heading">
              <div>
                <h2>Resumo das transações</h2>
                <p>Visão geral das movimentações analisadas.</p>
              </div>
            </section>

            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Total de transações</span>
                  <div className="stat-icon blue">⇄</div>
                </div>
                <h3>{resumo ? resumo.total_transacoes : "--"}</h3>
                <p>
                  {resumo ? "Transações analisadas" : "Aguardando os dados"}
                </p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Transações normais</span>
                  <div className="stat-icon green">✓</div>
                </div>
                <h3>{resumo ? resumo.total_nao_marcadas : "--"}</h3>
                <p>Movimentações regulares</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Transações suspeitas</span>
                  <div className="stat-icon red">!</div>
                </div>
                <h3>{resumo ? resumo.total_marcadas : "--"}</h3>
                <p>Precisam de atenção</p>
              </article>
            </section>

            <DashboardCharts
              resumo={resumo}
              transactions={transacoes}
              carregando={carregando}
            />

            <section className="recent-section">
              <div className="section-heading">
                <div>
                  <h2>Alertas recentes</h2>
                  <p>Transações que precisam de atenção.</p>
                </div>

                <button
                  className="view-button"
                  onClick={() => mudarPagina("suspeitas")}
                >
                  Ver suspeitas →
                </button>
              </div>

              {alertasRecentes.length > 0 ? (
                <div className="alerts-list">
                  {alertasRecentes.map((transacao, index) => {
                    const valor = Number(transacao.valor);

                    const motivos = Array.isArray(transacao.motivos)
                      ? transacao.motivos.join(" • ")
                      : String(
                          transacao.motivos ?? "Critério de detecção"
                        );

                    return (
                      <article
                        className="alert-item"
                        key={String(
                          transacao.id_transacao ?? index
                        )}
                      >
                        <div className="alert-item-icon">!</div>

                        <div className="alert-item-info">
                          <strong>
                            Transação{" "}
                            {String(
                              transacao.id_transacao ?? index + 1
                            )}
                          </strong>

                          <span>
                            {String(transacao.tipo ?? "Operação")} •{" "}
                            {String(
                              transacao.canal ?? "Canal não informado"
                            )}
                          </span>

                          <small>{motivos}</small>
                        </div>

                        <div className="alert-item-value">
                          <strong>
                            {Number.isFinite(valor)
                              ? valor.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                              : "Valor indisponível"}
                          </strong>

                          <span>
                            {String(transacao.data_hora ?? "")}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">⌕</div>
                  <h3>Nenhum alerta disponível</h3>
                  <p>
                    {carregando
                      ? "Carregando transações..."
                      : "Não existem transações sinalizadas no momento."}
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : pagina === "transacoes" ? (
          <div className="page-content">
            <TransactionsPage transactions={transacoes} />
          </div>
        ) : (
          <div className="page-content">
            <SuspectsPage transactions={transacoes} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
