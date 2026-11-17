import "./SuspectsPage.css";

function SuspectsPage() {
  return (
    <div className="suspects-container">
      <div className="suspects-heading">
        <div>
          <h2>Gerenciamento de suspeitas</h2>
          <p>
            Consulte e acompanhe os registros de transações suspeitas
            disponibilizados pela ferramenta.
          </p>
        </div>

        <span className="suspects-count">
          Aguardando dados
        </span>
      </div>

      <section className="suspects-panel">
        <div className="suspects-panel-top">
          <div>
            <h3>Registros suspeitos</h3>
            <p>
              Área destinada à visualização dos registros encaminhados
              para análise.
            </p>
          </div>
        </div>

        <div className="suspects-empty">
          <div className="suspects-empty-icon">
            <span>!</span>
          </div>

          <h3>Nenhuma suspeita disponível</h3>

          <p>
            Os registros serão apresentados aqui quando forem
            disponibilizados pelo sistema.
          </p>
        </div>

        <div className="suspects-footer">
          Exibindo 0 registros
        </div>
      </section>
    </div>
  );
}

export default SuspectsPage;