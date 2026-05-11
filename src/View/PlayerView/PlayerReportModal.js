import React, { useMemo } from "react";

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

const PlayerReportModal = ({ open, onClose, loading, report, player }) => {
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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm p-2 sm:p-4 overflow-auto flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
              {jogador.foto ? (
                <img src={jogador.foto} alt={jogador.nome} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-gray-400">
                  Sem foto
                </div>
              )}
            </div>
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            X
          </button>
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
