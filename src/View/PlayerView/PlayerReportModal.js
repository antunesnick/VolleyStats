import React, { useMemo, useState } from "react";
import { Alertas } from "../../utils/Alertas";

const ACTION_LABELS = ["Saque", "Ataque", "Bloqueio", "Recepcao", "Defesa"];

const formatDate = (value) => {
  if (!value) {
    return "--";
  }

  const parts = String(value).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return String(value);
};

const formatHeight = (value) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  return `${value} m`;
};

const StatCard = ({ label, value }) => (
  <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm">
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-0.5 text-2xl font-black text-gray-900">{value}</p>
  </div>
);

const PlayerAvatar = ({ player, className = "h-16 w-16" }) => {
  const [imageError, setImageError] = useState(false);
  const partesNome = String(player?.nome || "Jogador")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const iniciais = `${partesNome[0]?.slice(0, 1) || "J"}${
    partesNome.length > 1 ? partesNome[partesNome.length - 1].slice(0, 1) : ""
  }`.toUpperCase();

  if (player?.foto && !imageError) {
    return (
      <img
        src={player.foto}
        alt={player.nome}
        onError={() => setImageError(true)}
        className={`${className} rounded-lg object-cover border border-gray-200 bg-gray-100`}
      />
    );
  }

  return (
    <div className={`${className} rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-black text-lg border border-gray-200`}>
      {iniciais}
    </div>
  );
};

const EmptyState = ({ title, message }) => (
  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center">
    <p className="text-sm font-black text-gray-900">{title}</p>
    <p className="text-xs font-medium text-gray-600">{message}</p>
  </div>
);

const getTopAction = (acoesPorTipo = {}) => {
  const entries = Object.entries(acoesPorTipo).filter(([name]) => name !== "Outros");
  if (!entries.length) {
    return null;
  }

  const ordered = entries.sort((a, b) => b[1] - a[1]);
  if ((ordered[0]?.[1] || 0) <= 0) {
    return null;
  }

  return ordered[0];
};

const sumCounts = (counts = {}) => (Number(counts.A) || 0) + (Number(counts.B) || 0) + (Number(counts.C) || 0);

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\"/g, "&quot;")
  .replace(/'/g, "&#039;");

const montarHtmlRelatorioJogador = ({ jogador, totals, partidas, torneios }) => {
  const nomeJogador = jogador?.nome || "Jogador";
  const iniciais = String(nomeJogador)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "J";

  const linhasAcoes = ACTION_LABELS.concat("Outros")
    .filter((label) => totals.acoesPorTipoQualidade?.[label])
    .map((label) => {
      const counts = totals.acoesPorTipoQualidade?.[label] || { A: 0, B: 0, C: 0 };
      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td class="center">${counts.A || 0}</td>
          <td class="center">${counts.B || 0}</td>
          <td class="center">${counts.C || 0}</td>
        </tr>
      `;
    }).join("");

  const linhasPartidas = (partidas || []).map((partida) => {
    const placarLabel = partida.time1Nome && partida.time2Nome
      ? `${partida.time1Nome} x ${partida.time2Nome}`
      : "Partida sem times";
    return `
      <tr>
        <td>${escapeHtml(formatDate(partida.dataPartida))}</td>
        <td>
          <strong>${escapeHtml(partida.nome || placarLabel)}</strong>
          <span>${escapeHtml(partida.torneioNome || "Sem torneio")}</span>
        </td>
        <td class="center">${partida.acoes || 0}</td>
        <td class="center">${partida.qualidade?.A || 0}</td>
        <td class="center">${partida.qualidade?.B || 0}</td>
        <td class="center">${partida.qualidade?.C || 0}</td>
      </tr>
    `;
  }).join("");

  const linhasTorneios = (torneios || []).map((torneio) => `
    <tr>
      <td>${escapeHtml(torneio.nome || "Sem torneio")}</td>
      <td>${escapeHtml(formatDate(torneio.inicio))} - ${escapeHtml(formatDate(torneio.termino))}</td>
      <td class="center">${torneio.partidas || 0}</td>
      <td class="center">${torneio.acoes || 0}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Relatorio do Jogador - ${escapeHtml(nomeJogador)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 22px 24px;
            color: #ffffff;
            background: #000000;
            border-bottom: 6px solid #dc2626;
            border-radius: 14px 14px 0 0;
          }
          .eyebrow {
            margin: 0 0 6px;
            color: #f87171;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          h1 {
            margin: 0;
            font-size: 30px;
            line-height: 1;
            text-transform: uppercase;
          }
          .meta {
            margin-top: 8px;
            color: #d1d5db;
            font-size: 13px;
            font-weight: 700;
          }
          .avatar {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            border-radius: 12px;
            background: #dc2626;
            color: #ffffff;
            font-size: 28px;
            font-weight: 900;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 22px 0;
          }
          .metric {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 16px;
            background: #ffffff;
          }
          .metric span {
            display: block;
            color: #6b7280;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.4px;
            text-transform: uppercase;
          }
          .metric strong {
            display: block;
            margin-top: 8px;
            font-size: 28px;
            font-weight: 900;
          }
          .table-title {
            margin: 26px 0 0;
            padding: 14px 18px;
            background: #dc2626;
            color: #ffffff;
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            border-radius: 12px 12px 0 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
          }
          th {
            padding: 11px;
            background: #000000;
            color: #ffffff;
            font-size: 10px;
            letter-spacing: 1px;
            text-align: left;
            text-transform: uppercase;
          }
          td {
            padding: 12px 11px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
            vertical-align: top;
          }
          td span {
            display: block;
            margin-top: 4px;
            color: #6b7280;
            font-size: 10px;
            font-weight: 700;
          }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <p class="eyebrow">Relatorio do Jogador</p>
            <h1>${escapeHtml(nomeJogador)}</h1>
            <div class="meta">Camisa ${escapeHtml(jogador?.numCamisa || "--")} | ${escapeHtml(jogador?.posicaoNome || "--")} | ${escapeHtml(jogador?.categoriaNome || "--")}</div>
            <div class="meta">Altura ${escapeHtml(formatHeight(jogador?.altura))} | Nascimento ${escapeHtml(formatDate(jogador?.dataNasc))}</div>
          </div>
          <div class="avatar">${escapeHtml(iniciais)}</div>
        </header>

        <section class="metrics">
          <div class="metric"><span>Acoes</span><strong>${totals.acoes || 0}</strong></div>
          <div class="metric"><span>Partidas</span><strong>${totals.partidas || 0}</strong></div>
          <div class="metric"><span>Torneios</span><strong>${totals.torneios || 0}</strong></div>
          <div class="metric"><span>Qualidade A</span><strong>${totals.qualidade?.A || 0}</strong></div>
          <div class="metric"><span>Qualidade B</span><strong>${totals.qualidade?.B || 0}</strong></div>
          <div class="metric"><span>Qualidade C</span><strong>${totals.qualidade?.C || 0}</strong></div>
        </section>

        <h2 class="table-title">Acoes por tipo</h2>
        <table>
          <thead>
            <tr>
              <th>Acao</th>
              <th class="center">A</th>
              <th class="center">B</th>
              <th class="center">C</th>
            </tr>
          </thead>
          <tbody>
            ${linhasAcoes || '<tr><td colspan="4" class="center">Nenhuma acao encontrada.</td></tr>'}
          </tbody>
        </table>

        <h2 class="table-title">Partidas</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Partida</th>
              <th class="center">Acoes</th>
              <th class="center">A</th>
              <th class="center">B</th>
              <th class="center">C</th>
            </tr>
          </thead>
          <tbody>
            ${linhasPartidas || '<tr><td colspan="6" class="center">Nenhuma partida encontrada.</td></tr>'}
          </tbody>
        </table>

        <h2 class="table-title">Torneios</h2>
        <table>
          <thead>
            <tr>
              <th>Torneio</th>
              <th>Periodo</th>
              <th class="center">Partidas</th>
              <th class="center">Acoes</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTorneios || '<tr><td colspan="4" class="center">Nenhum torneio encontrado.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const PlayerReportModal = ({ open, onClose, loading, report, player }) => {
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const jogador = report?.jogador || player || {};
  const totals = report?.totals || {
    acoes: 0,
    partidas: 0,
    torneios: 0,
    qualidade: { A: 0, B: 0, C: 0 },
    acoesPorTipo: {},
    acoesPorTipoQualidade: {},
  };

  const actionCards = useMemo(() => {
    const base = ACTION_LABELS.map((label) => ({
      label,
      counts: totals.acoesPorTipoQualidade?.[label] || { A: 0, B: 0, C: 0 },
    }));

    const outrosCounts = totals.acoesPorTipoQualidade?.Outros || { A: 0, B: 0, C: 0 };
    if (sumCounts(outrosCounts) > 0) {
      base.push({ label: "Outros", counts: outrosCounts });
    }

    return base;
  }, [totals]);

  const partidas = report?.partidas || [];
  const torneios = report?.torneios || [];

  const handleSalvarRelatorioPdf = async () => {
    if (!report) {
      return;
    }

    setIsSavingPdf(true);

    try {
      const nomeJogador = String(jogador?.nome || "jogador")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const result = await window.reportAPI.salvarPdf({
        nomeArquivo: `relatorio-jogador-${nomeJogador}.pdf`,
        html: montarHtmlRelatorioJogador({ jogador, totals, partidas, torneios }),
      });

      if (result?.success) {
        Alertas.sucesso("Relatorio salvo em PDF com sucesso.");
      }
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel salvar o relatorio em PDF.");
    } finally {
      setIsSavingPdf(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm p-2 sm:p-4 overflow-auto flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <PlayerAvatar player={jogador} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Camisa #{jogador.numCamisa || "--"}
              </p>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate">
                {jogador.nome || "Jogador"}
              </h2>
              <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-bold text-gray-600">
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 whitespace-nowrap">
                  {jogador.posicaoNome || "--"}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 whitespace-nowrap">
                  {jogador.categoriaNome || "--"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSalvarRelatorioPdf}
              disabled={!report || isSavingPdf}
              className="rounded-full bg-black px-3 py-2 text-xs font-black text-white hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingPdf ? "Salvando..." : "Exportar PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Fechar"
            >
              X
            </button>
          </div>
        </div>

        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
          Estatísticas baseadas em ações registradas
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm font-semibold text-gray-500">
            Carregando relatorio do jogador...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-5">
              <StatCard label="Ações" value={totals.acoes} />
              <StatCard label="Partidas" value={totals.partidas} />
              <StatCard label="Torneios" value={totals.torneios} />
              <StatCard label="Qualidade A" value={totals.qualidade?.A || 0} />
              <StatCard label="Qualidade B" value={totals.qualidade?.B || 0} />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ações por tipo</p>
                  <h3 className="text-sm font-black text-gray-900">Distribuição</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-500">Q.C: {totals.qualidade?.C || 0}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {actionCards.map((item) => (
                  <div key={item.label} className="rounded-lg bg-white p-2 text-center border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[9px] font-black text-gray-600">
                      <span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5">
                        A {item.counts?.A || 0}
                      </span>
                      <span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5">
                        B {item.counts?.B || 0}
                      </span>
                      <span className="rounded-full bg-gray-50 border border-gray-100 px-2 py-0.5">
                        C {item.counts?.C || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Partidas</p>
                  <h3 className="text-sm font-black text-gray-900">Resumo por partida</h3>
                </div>
              </div>

              {partidas.length === 0 ? (
                <EmptyState
                  title="Nenhuma partida encontrada"
                  message="Não há ações registradas para este jogador."
                />
              ) : (
                <div className="space-y-2 max-h-[20vh] overflow-auto pr-1">
                  {partidas.map((partida) => {
                    const topAction = getTopAction(partida.acoesPorTipo);
                    const placarLabel = partida.time1Nome && partida.time2Nome
                      ? `${partida.time1Nome} x ${partida.time2Nome}`
                      : "Partida sem times";

                    return (
                      <div key={partida.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              {formatDate(partida.dataPartida)}
                            </p>
                            <h4 className="text-sm font-black text-gray-900 truncate">{partida.nome || placarLabel}</h4>
                            <p className="text-[10px] font-bold text-gray-500 truncate">
                              {partida.torneioNome || "Sem torneio"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-gray-900 px-3 py-2 text-center text-white flex-shrink-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Ações</p>
                            <p className="text-xl font-black">{partida.acoes}</p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-black">
                          <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5 text-gray-700">
                            A: {partida.qualidade?.A || 0}
                          </span>
                          <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5 text-gray-700">
                            B: {partida.qualidade?.B || 0}
                          </span>
                          <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5 text-gray-700">
                            C: {partida.qualidade?.C || 0}
                          </span>
                          {topAction ? (
                            <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5 text-gray-700">
                              {topAction[0]} ({topAction[1]})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Torneios</p>
                <h3 className="text-sm font-black text-gray-900">Presença por torneio</h3>
              </div>

              {torneios.length === 0 ? (
                <EmptyState
                  title="Nenhum torneio encontrado"
                  message="Registre ações em partidas para exibir os torneios."
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 max-h-[15vh] overflow-auto">
                  {torneios.map((torneio) => (
                    <div key={`${torneio.id || "sem"}-${torneio.nome}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">{torneio.nome}</p>
                      <h4 className="text-sm font-black text-gray-900 truncate">
                        {formatDate(torneio.inicio)} - {formatDate(torneio.termino)}
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-black text-gray-700">
                        <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5">
                          P: {torneio.partidas}
                        </span>
                        <span className="rounded-full bg-white border border-gray-100 px-2 py-0.5">
                          A: {torneio.acoes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerReportModal;
