
import { useEffect, useState } from "react";
import api from "./services/api";
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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    async function verificarAPI() {
      try {
        const resposta = await api.get<StatusAPI>("/status");
        setDados(resposta.data);
        setErro(false);
      } catch {
        setErro(true);
      } finally {
        setCarregando(false);
      }
    }

    verificarAPI();
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

          <div className="topbar-version">Versão 1.0.0</div>
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
                <h3>--</h3>
                <p>Aguardando os dados</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Transações normais</span>
                  <div className="stat-icon green">✓</div>
                </div>
                <h3>--</h3>
                <p>Movimentações regulares</p>
              </article>

              <article className="stat-card">
                <div className="stat-top">
                  <span>Transações suspeitas</span>
                  <div className="stat-icon red">!</div>
                </div>
                <h3>--</h3>
                <p>Precisam de atenção</p>
              </article>
            </section>

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

              <div className="empty-state">
                <div className="empty-icon">⌕</div>
                <h3>Nenhum alerta disponível</h3>
                <p>
                  Os alertas aparecerão aqui quando as transações forem
                  analisadas.
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className="page-content">
            <section className="empty-page">
              <div className="empty-icon">
                {pagina === "transacoes" ? "⇄" : "⚠"}
              </div>
              <h2>
                {pagina === "transacoes"
                  ? "Lista de transações"
                  : "Transações suspeitas"}
              </h2>
              <p>
                Esta área será desenvolvida na próxima etapa, quando
                integraremos os dados do sistema.
              </p>
              <button
                className="back-button"
                onClick={() => mudarPagina("inicio")}
              >
                Voltar à visão geral
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
