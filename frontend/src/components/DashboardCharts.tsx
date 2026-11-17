import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransactionRecord } from "./TransactionsPage";
import "./DashboardCharts.css";

export interface ResumoAPI {
  total_transacoes: number;
  total_marcadas: number;
  total_nao_marcadas: number;
  por_criterio: {
    valor_alto: number;
    frequencia_alta: number;
  };
}

interface DashboardChartsProps {
  resumo: ResumoAPI | null;
  transactions: TransactionRecord[];
  carregando: boolean;
}

const CORES_STATUS = ["#4ade80", "#f87171"];
const CORES_CRITERIO = ["#fbbf24", "#f87171"];

function DashboardCharts({
  resumo,
  transactions,
  carregando,
}: DashboardChartsProps) {
  const dadosProporcao = useMemo(() => {
    if (!resumo) return [];
    return [
      { nome: "Normais", quantidade: resumo.total_nao_marcadas },
      { nome: "Suspeitas", quantidade: resumo.total_marcadas },
    ];
  }, [resumo]);

  const dadosCriterio = useMemo(() => {
    if (!resumo) return [];
    return [
      {
        criterio: "Valor Alto (≥ R$ 1k)",
        alertas: resumo.por_criterio.valor_alto,
      },
      {
        criterio: "Alta Frequência (60m)",
        alertas: resumo.por_criterio.frequencia_alta,
      },
    ];
  }, [resumo]);

  const dadosPorTipo = useMemo(() => {
    const mapa = new Map<
      string,
      { tipo: string; normais: number; suspeitas: number; total: number }
    >();

    for (const item of transactions) {
      const tipo = String(item.tipo ?? "OUTRO").toUpperCase();
      const marcada = Boolean(item.marcada);
      const atual = mapa.get(tipo) ?? {
        tipo,
        normais: 0,
        suspeitas: 0,
        total: 0,
      };

      if (marcada) {
        atual.suspeitas += 1;
      } else {
        atual.normais += 1;
      }
      atual.total += 1;
      mapa.set(tipo, atual);
    }

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const dadosPorCanal = useMemo(() => {
    const mapa = new Map<
      string,
      { canal: string; normais: number; suspeitas: number; total: number }
    >();

    for (const item of transactions) {
      const canal = String(item.canal ?? "OUTRO").toUpperCase();
      const marcada = Boolean(item.marcada);
      const atual = mapa.get(canal) ?? {
        canal,
        normais: 0,
        suspeitas: 0,
        total: 0,
      };

      if (marcada) {
        atual.suspeitas += 1;
      } else {
        atual.normais += 1;
      }
      atual.total += 1;
      mapa.set(canal, atual);
    }

    return Array.from(mapa.values()).sort((a, b) => b.suspeitas - a.suspeitas);
  }, [transactions]);

  const dadosEvolucaoDiaria = useMemo(() => {
    const mapa = new Map<
      string,
      { dataIso: string; dia: string; total: number; suspeitas: number }
    >();

    for (const item of transactions) {
      const dataHora = String(item.data_hora ?? "");
      const dataIso = dataHora.slice(0, 10);
      if (!dataIso) continue;

      const partes = dataIso.split("-");
      const diaFormatado =
        partes.length === 3 ? `${partes[2]}/${partes[1]}` : dataIso;

      const marcada = Boolean(item.marcada);
      const atual = mapa.get(dataIso) ?? {
        dataIso,
        dia: diaFormatado,
        total: 0,
        suspeitas: 0,
      };

      atual.total += 1;
      if (marcada) {
        atual.suspeitas += 1;
      }
      mapa.set(dataIso, atual);
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.dataIso.localeCompare(b.dataIso)
    );
  }, [transactions]);

  if (carregando) {
    return (
      <section className="charts-section">
        <div className="section-heading">
          <div>
            <h2>Análise gráfica do monitoramento</h2>
            <p>Visualização estatística das transações e regras acionadas.</p>
          </div>
        </div>
        <div className="charts-empty">
          <div className="empty-icon">◔</div>
          <h3>Carregando gráficos...</h3>
          <p>Processando indicadores das transações bancárias.</p>
        </div>
      </section>
    );
  }

  if (!resumo && transactions.length === 0) {
    return (
      <section className="charts-section">
        <div className="section-heading">
          <div>
            <h2>Análise gráfica do monitoramento</h2>
            <p>Visualização estatística das transações e regras acionadas.</p>
          </div>
        </div>
        <div className="charts-empty">
          <div className="empty-icon">◔</div>
          <h3>Gráficos indisponíveis no momento</h3>
          <p>
            Conecte o servidor backend para visualizar a distribuição das
            transações e alertas no painel.
          </p>
        </div>
      </section>
    );
  }

  const percentualNormais =
    resumo && resumo.total_transacoes > 0
      ? ((resumo.total_nao_marcadas / resumo.total_transacoes) * 100).toFixed(1)
      : "0.0";

  const percentualSuspeitas =
    resumo && resumo.total_transacoes > 0
      ? ((resumo.total_marcadas / resumo.total_transacoes) * 100).toFixed(1)
      : "0.0";

  const canalMaisCritico = dadosPorCanal[0];

  return (
    <section className="charts-section">
      <div className="section-heading">
        <div>
          <h2>Análise gráfica do monitoramento</h2>
          <p>
            Visualização estatística das movimentações, canais e critérios de
            detecção.
          </p>
        </div>
      </div>

      <div className="charts-grid">
        {/* GRÁFICO 1: PROPORÇÃO NORMAIS X SUSPEITAS */}
        <article className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Classificação das transações</h3>
              <p>Proporção entre operações regulares e suspeitas.</p>
            </div>
            <span className="chart-badge">
              {resumo?.total_transacoes ?? transactions.length} analisadas
            </span>
          </div>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosProporcao}
                  dataKey="quantidade"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={4}
                  stroke="#151e2e"
                  strokeWidth={2}
                >
                  {dadosProporcao.map((entrada, index) => (
                    <Cell
                      key={entrada.nome}
                      fill={CORES_STATUS[index % CORES_STATUS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend-pills">
            <div className="legend-pill">
              <span className="legend-pill-label">
                <span className="legend-dot green" />
                Normais ({percentualNormais}%)
              </span>
              <span className="legend-pill-value">
                {resumo?.total_nao_marcadas ?? 0}
              </span>
            </div>

            <div className="legend-pill">
              <span className="legend-pill-label">
                <span className="legend-dot red" />
                Suspeitas ({percentualSuspeitas}%)
              </span>
              <span className="legend-pill-value">
                {resumo?.total_marcadas ?? 0}
              </span>
            </div>
          </div>
        </article>

        {/* GRÁFICO 2: ALERTAS POR CRITÉRIO DE DETECÇÃO */}
        <article className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Suspeitas por critério de detecção</h3>
              <p>Ocorrências sinalizadas por cada regra explicável.</p>
            </div>
            <span className="chart-badge alert">Regras ativas</span>
          </div>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosCriterio}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#28364b"
                  vertical={false}
                />
                <XAxis
                  dataKey="criterio"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#28364b" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 41, 59, 0.55)" }}
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="alertas"
                  name="Transações sinalizadas"
                  radius={[8, 8, 0, 0]}
                  barSize={52}
                >
                  {dadosCriterio.map((entrada, index) => (
                    <Cell
                      key={entrada.criterio}
                      fill={CORES_CRITERIO[index % CORES_CRITERIO.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend-pills">
            <div className="legend-pill">
              <span className="legend-pill-label">
                <span className="legend-dot amber" />
                Valor ≥ R$ 1.000,00
              </span>
              <span className="legend-pill-value">
                {resumo?.por_criterio.valor_alto ?? 0}
              </span>
            </div>

            <div className="legend-pill">
              <span className="legend-pill-label">
                <span className="legend-dot red" />
                8+ em 60 minutos
              </span>
              <span className="legend-pill-value">
                {resumo?.por_criterio.frequencia_alta ?? 0}
              </span>
            </div>
          </div>
        </article>

        {/* GRÁFICO 3: TRANSAÇÕES POR TIPO DE OPERAÇÃO */}
        <article className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Volume por modalidade de operação</h3>
              <p>Comparativo de transações normais e suspeitas por tipo.</p>
            </div>
            <span className="chart-badge">{dadosPorTipo.length} tipos</span>
          </div>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosPorTipo}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#28364b"
                  vertical={false}
                />
                <XAxis
                  dataKey="tipo"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#28364b" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 41, 59, 0.55)" }}
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="normais"
                  name="Normais"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="suspeitas"
                  name="Suspeitas"
                  fill="#f87171"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* GRÁFICO 4: INCIDÊNCIA DE SUSPEITAS POR CANAL */}
        <article className="chart-card">
          <div className="chart-header">
            <div>
              <h3>Alertas por canal de atendimento</h3>
              <p>Concentração de transações suspeitas em cada canal.</p>
            </div>
            {canalMaisCritico && (
              <span className="chart-badge alert">
                Maior foco: {canalMaisCritico.canal} ({canalMaisCritico.suspeitas})
              </span>
            )}
          </div>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosPorCanal}
                layout="vertical"
                margin={{ top: 6, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#28364b"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#28364b" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="canal"
                  stroke="#cbd5e1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
                <Tooltip
                  cursor={{ fill: "rgba(30, 41, 59, 0.55)" }}
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="suspeitas"
                  name="Suspeitas"
                  fill="#f87171"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* GRÁFICO 5: EVOLUÇÃO DIÁRIA DE TRANSAÇÕES E SUSPEITAS */}
        <article className="chart-card chart-card-wide">
          <div className="chart-header">
            <div>
              <h3>Evolução diária de transações e suspeitas</h3>
              <p>
                Acompanhamento temporal do volume diário de movimentações e
                alertas registrados no período.
              </p>
            </div>
            <span className="chart-badge">
              {dadosEvolucaoDiaria.length} dias monitorados
            </span>
          </div>

          <div className="chart-body chart-body-tall">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dadosEvolucaoDiaria}
                margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="corTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="corSuspeitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#28364b"
                  vertical={false}
                />
                <XAxis
                  dataKey="dia"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#28364b" }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total no dia"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#corTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="suspeitas"
                  name="Suspeitas no dia"
                  stroke="#f87171"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#corSuspeitas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}

export default DashboardCharts;
