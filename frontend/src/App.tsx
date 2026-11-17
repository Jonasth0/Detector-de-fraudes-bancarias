
import { useEffect, useState } from "react";
import api from "./services/api";
import "./App.css";

interface StatusAPI {
  status: string;
  sistema: string;
  versao: string;
}

function App() {
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

  return (
    <main className="dashboard">
      <header className="header">
        <div>
          <h1>Detector de Fraudes</h1>
          <p>Sistema de monitoramento de transações bancárias</p>
        </div>

        <span className="version">v1.0.0</span>
      </header>

      <section className="welcome">
        <h2>Painel de controle</h2>
        <p>
          Bem-vindo ao sistema de análise de transações bancárias.
        </p>
      </section>

      <section className="status-card">
        <div>
          <h3>Estado do sistema</h3>

          {carregando ? (
            <p>Verificando conexão...</p>
          ) : erro ? (
            <p className="offline">● Backend desconectado</p>
          ) : (
            <p className="online">● Backend conectado</p>
          )}
        </div>

        <div className="status-icon">↗</div>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <span>API</span>
          <h3>{dados?.status === "online" ? "Online" : "--"}</h3>
          <p>Conexão com o servidor</p>
        </article>

        <article className="info-card">
          <span>Versão</span>
          <h3>{dados?.versao ?? "--"}</h3>
          <p>Versão da aplicação</p>
        </article>

        <article className="info-card">
          <span>Transações</span>
          <h3>--</h3>
          <p>Aguardando carregamento dos dados</p>
        </article>
      </section>

      <footer>
        Detector de Fraudes Bancárias · Projeto acadêmico
      </footer>
    </main>
  );
}

export default App;
