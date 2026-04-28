import React, { useEffect, useState } from 'react';
import EstatisticaControl from '../../Control/EstatisticaControl';

const TAB_ITEMS = [
  { id: 'geral', label: 'Geral' },
  { id: 'jogadores', label: 'Jogadores' },
  { id: 'sets', label: 'Sets' },
];

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 text-3xl font-black text-gray-900">{value}</p>
  </div>
);

const EmptyState = ({ title, message }) => (
  <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
    <p className="text-xl font-black text-gray-900 mb-2">{title}</p>
    <p className="text-sm font-medium text-gray-600">{message}</p>
  </div>
);

const EstatisticaView = ({
  open,
  onClose,
  homeLabel,
  awayLabel,
  matchInfo,
  score,
  partidaId,
  onConfirm,
}) => {
  const initialState = EstatisticaControl.criarEstadoInicial(score);
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [draftSets, setDraftSets] = useState(initialState.draftSets);
  const [statistics, setStatistics] = useState(initialState.statistics);
  const [statisticsError, setStatisticsError] = useState(initialState.statisticsError);

  const resultadoPartida = EstatisticaControl.obterResultadoPartida(statistics, draftSets);

  useEffect(() => {
    if (open) {
      const resetState = EstatisticaControl.resetarAoAbrir(score);
      const resumoState = EstatisticaControl.carregarResumo(partidaId);

      setActiveTab(resetState.activeTab);
      setDraftSets(resumoState.draftSets);
      setStatistics(resumoState.statistics);
      setStatisticsError(resumoState.statisticsError);
    }
  }, [open, score, partidaId]);

  const handleDraftSetChange = (numSet, side, value) => {
    setDraftSets((current) => EstatisticaControl.alterarPlacarSet(current, numSet, side, value));
  };

  const handleSaveSets = () => {
    try {
      const nextState = EstatisticaControl.salvarSets(partidaId, draftSets);
      setStatistics(nextState.statistics);
      setDraftSets(nextState.draftSets);
      setStatisticsError(nextState.statisticsError);
      return nextState;
    } catch (error) {
      console.error('Erro ao salvar sets:', error);
      setStatisticsError('Nao foi possivel salvar a pontuacao dos sets.');
      return { statistics, draftSets };
    }
  };

  const handleConfirm = () => {
    const savedState = handleSaveSets();
    EstatisticaControl.confirmar(onConfirm, savedState.statistics, savedState.draftSets);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm p-4 sm:p-6 overflow-auto flex items-center justify-center">
      <div className="w-full max-w-6xl rounded-[2rem] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Encerramento da partida</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Finalizar Partida</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Fechar"
          >
            X
          </button>
        </div>

        {statisticsError && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {statisticsError}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-100 pb-4">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                activeTab === item.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <StatCard label="Sets da partida" value={`${resultadoPartida.home} x ${resultadoPartida.away}`} />
              <StatCard label="Sets registrados" value={statistics.totals.sets} />
              <StatCard label="Pontos registrados" value={statistics.totals.pontos} />
              <StatCard label="Acoes registradas" value={statistics.totals.acoes} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dados da partida</p>
                <div className="space-y-3 text-sm font-medium text-gray-700">
                  <p><span className="font-black text-gray-900">Nome:</span> {matchInfo.name}</p>
                  <p><span className="font-black text-gray-900">Data:</span> {matchInfo.date}</p>
                  <p><span className="font-black text-gray-900">Ginasio:</span> {matchInfo.gymnasium}</p>
                  <p><span className="font-black text-gray-900">Mandante:</span> {homeLabel}</p>
                  <p><span className="font-black text-gray-900">Visitante:</span> {awayLabel}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Vencedor de cada set</p>
                {draftSets.length === 0 ? (
                  <p className="text-sm font-medium text-gray-600">Nenhum set registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {draftSets.map((setScore) => {
                      const winner = setScore.home > setScore.away
                        ? homeLabel
                        : setScore.away > setScore.home
                          ? awayLabel
                          : 'Empate';

                      return (
                        <div key={setScore.numSet} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-gray-100">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Set {setScore.numSet}</span>
                          <span className="text-sm font-black text-gray-900">
                            {setScore.home} x {setScore.away} - {winner}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jogadores' && (
          <div className="space-y-4 max-h-[52vh] overflow-auto pr-1">
            {statistics.jogadores.length === 0 ? (
              <EmptyState
                title="Nenhuma acao registrada"
                message="Os scouts digitados durante a partida aparecem aqui por jogador."
              />
            ) : (
              statistics.jogadores.map((jogador) => (
                <div key={jogador.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Camisa #{jogador.numero}</p>
                      <h3 className="text-xl font-black text-gray-900">{jogador.nome}</h3>
                    </div>
                    <div className="rounded-2xl bg-gray-900 px-5 py-3 text-center text-white">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
                      <p className="text-2xl font-black">{jogador.totalAcoes}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-5">
                    {Object.entries(jogador.acoes).map(([nome, total]) => (
                      <div key={nome} className="rounded-2xl bg-white p-3 text-center border border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{nome}</p>
                        <p className="text-xl font-black text-gray-900">{total}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(jogador.qualidade).map(([qualidade, total]) => (
                      <span key={qualidade} className="rounded-full bg-white border border-gray-100 px-4 py-2 text-xs font-black text-gray-700">
                        Qualidade {qualidade}: {total}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sets' && (
          <div className="space-y-4 max-h-[52vh] overflow-auto pr-1">
            {draftSets.length === 0 ? (
              <EmptyState
                title="Nenhum set registrado"
                message="Quando um scout e gravado, o set atual passa a aparecer neste resumo."
              />
            ) : (
              <>
                {draftSets.map((setScore) => {
                  const setStats = statistics.sets.find((item) => Number(item.numSet) === Number(setScore.numSet));
                  const winner = setScore.home > setScore.away
                    ? homeLabel
                    : setScore.away > setScore.home
                      ? awayLabel
                      : 'Empate';

                  return (
                    <div key={setScore.numSet} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Set {setScore.numSet}</p>
                          <h3 className="text-xl font-black text-gray-900">Vencedor: {winner}</h3>
                        </div>
                        <div className="flex gap-3">
                          <StatCard label="Pontos" value={setStats?.pontos || 0} />
                          <StatCard label="Acoes" value={setStats?.acoes || 0} />
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{homeLabel}</p>
                          <input
                            type="number"
                            min="0"
                            value={setScore.home}
                            onChange={(event) => handleDraftSetChange(setScore.numSet, 'home', event.target.value)}
                            className="w-full text-center text-4xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                          />
                        </div>
                        <div className="text-3xl font-black text-gray-300 pt-6">x</div>
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{awayLabel}</p>
                          <input
                            type="number"
                            min="0"
                            value={setScore.away}
                            onChange={(event) => handleDraftSetChange(setScore.numSet, 'away', event.target.value)}
                            className="w-full text-center text-4xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              </>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-green-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-green-600 transition-colors"
          >
            Confirmar resultado
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstatisticaView;
