import React, { useEffect, useMemo, useState } from 'react';
import GerenciarPartidas from '../Partida/GerenciarPartidas';

const TOURNAMENT_TYPES = [
  { value: 1, label: 'Pontos Corridos' },
  { value: 2, label: 'Mata-Mata' },
  { value: 3, label: 'Mata-Mata + Pontos Corridos' },
];

const DEFAULT_MATCH_FORM = {
  id: null,
  isExternal: false,
  opponent: '',
  team1: '',
  team2: '',
  date: '',
  gymnasium: '',
  status: 'scheduled',
  score: '0-0',
};

const showToastMessage = (setToasts, type, text, duration = 3200) => {
  const id = `${Date.now()}-${Math.random()}`;
  setToasts((prev) => [...prev, { id, type, text }]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, duration);
};

const getTournamentStatusByDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'upcoming';
  }

  if (now < start) {
    return 'upcoming';
  }

  if (now >= start && now <= end) {
    return 'ongoing';
  }

  return 'finished';
};

const getTournamentTypeLabel = (types, type) => {
  return types.find((item) => item.value === Number(type))?.label || 'Mata-Mata';
};

const upsertMatchInTournament = (matchesByTournament, tournamentId, matchForm) => {
  const current = matchesByTournament[tournamentId] || [];

  if (matchForm.id) {
    return {
      ...matchesByTournament,
      [tournamentId]: current.map((item) => (item.id === matchForm.id ? { ...item, ...matchForm } : item)),
    };
  }

  const newMatch = {
    ...matchForm,
    id: `m-${Date.now()}`,
    tournamentId,
  };

  return {
    ...matchesByTournament,
    [tournamentId]: [...current, newMatch],
  };
};

const TournamentView = ({ tournamentId, onBack, onTournamentChanged, onTournamentDeleted }) => {
  const [tournament, setTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [isManaging, setIsManaging] = useState(false);
  const [viewMode, setViewMode] = useState('matches');

  const [matchesByTournament, setMatchesByTournament] = useState({});
  const [dbMatches, setDbMatches] = useState([]);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchSubmitting, setMatchSubmitting] = useState(false);
  const [matchForm, setMatchForm] = useState(DEFAULT_MATCH_FORM);

  const [tournamentModalOpen, setTournamentModalOpen] = useState(false);
  const [tournamentSubmitting, setTournamentSubmitting] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({ id: null, name: '', type: 1, startDate: '', endDate: '' });

  const showToast = (type, text) => {
    showToastMessage(setToasts, type, text);
  };

  const loadTournamentMatches = async () => {
    if (!tournamentId) {
      return [];
    }

    try {
      const matches = await window.api.partidas.findByTournament(tournamentId);
      setDbMatches(matches || []);
      return matches || [];
    } catch (error) {
      setDbMatches([]);
      showToast('error', 'Não foi possível carregar partidas do torneio.');
      return [];
    }
  };

  const handleToggleManage = () => {
    setIsManaging((prev) => !prev);
  };

  const loadTournament = async () => {
    setIsLoading(true);

    try {
      const rows = await window.tournamentAPI.list();
      const found = rows.find((item) => item.id === tournamentId) || rows[0] || null;
      setTournament(found);
    } catch (error) {
      showToast('error', error.message || 'Erro ao carregar torneio.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTournament();
    loadTournamentMatches();
  }, [tournamentId]);

  const tournamentMatches = useMemo(() => {
    if (!tournament) {
      return [];
    }

    return matchesByTournament[tournament.id] || [];
  }, [matchesByTournament, tournament]);

  const tournamentType = Number(tournament?.type);
  const canShowStandings = tournamentType === 1 || tournamentType === 3;
  const canShowBracket = tournamentType === 2 || tournamentType === 3;
  const getTournamentTypeText = (type) => getTournamentTypeLabel(TOURNAMENT_TYPES, type);

  useEffect(() => {
    if (viewMode === 'standings' && !canShowStandings) {
      setViewMode('matches');
    }

    if (viewMode === 'bracket' && !canShowBracket) {
      setViewMode('matches');
    }
  }, [canShowBracket, canShowStandings, viewMode]);

  const openMatchCreate = () => {
    setMatchForm(DEFAULT_MATCH_FORM);
    setMatchModalOpen(true);
  };

  const openMatchEdit = (match) => {
    setMatchForm(match);
    setMatchModalOpen(true);
  };

  const closeMatchModal = () => {
    setMatchModalOpen(false);
    setMatchForm(DEFAULT_MATCH_FORM);
  };

  const handleMatchInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setMatchForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveMatch = async (event) => {
    event.preventDefault();

    if (!tournament) {
      return;
    }

    setMatchSubmitting(true);

    try {
      setMatchesByTournament((prev) => upsertMatchInTournament(prev, tournament.id, matchForm));
      showToast('success', 'Partida salva com sucesso.');
      closeMatchModal();
    } finally {
      setMatchSubmitting(false);
    }
  };

  const handleDeleteMatch = (matchId) => {
    if (!tournament) {
      return;
    }

    const shouldDelete = window.confirm('Deseja realmente excluir esta partida?');
    if (!shouldDelete) {
      return;
    }

    setMatchesByTournament((prev) => ({
      ...prev,
      [tournament.id]: (prev[tournament.id] || []).filter((item) => item.id !== matchId),
    }));

    showToast('success', 'Partida removida.');
  };

  const openTournamentEdit = () => {
    if (!tournament) {
      return;
    }

    setTournamentForm({
      id: tournament.id,
      name: tournament.name,
      type: Number(tournament.type),
      startDate: tournament.startDate || '',
      endDate: tournament.endDate || '',
    });
    setTournamentModalOpen(true);
  };

  const closeTournamentModal = () => {
    setTournamentModalOpen(false);
    setTournamentForm({ id: null, name: '', type: 1, startDate: '', endDate: '' });
  };

  const handleTournamentInputChange = (event) => {
    const { name, value } = event.target;
    setTournamentForm((prev) => ({
      ...prev,
      [name]: name === 'type' ? Number(value) : value,
    }));
  };

  const handleSaveTournament = async (event) => {
    event.preventDefault();
    setTournamentSubmitting(true);

    try {
      await window.tournamentAPI.update({
        id: tournamentForm.id,
        name: tournamentForm.name,
        type: Number(tournamentForm.type),
        startDate: tournamentForm.startDate,
        endDate: tournamentForm.endDate,
      });

      showToast('success', 'Torneio atualizado com sucesso.');
      closeTournamentModal();
      await loadTournament();

      if (typeof onTournamentChanged === 'function') {
        onTournamentChanged();
      }
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel atualizar o torneio.');
    } finally {
      setTournamentSubmitting(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournament) {
      return;
    }

    const shouldDelete = window.confirm('Deseja realmente excluir este torneio?');
    if (!shouldDelete) {
      return;
    }

    try {
      await window.tournamentAPI.delete(tournament.id);
      if (typeof onTournamentDeleted === 'function') {
        onTournamentDeleted();
      }
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel excluir o torneio.');
    }
  };

  const exportTournamentReport = () => {
    if (!tournament) {
      return;
    }

    const report = {
      tournament,
      matches: tournamentMatches,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = `tournament-${tournament.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    element.click();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="fixed top-5 right-5 z-80 space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-70 max-w-96 rounded-xl px-4 py-3 text-sm font-bold shadow-xl border ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <header className="bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          {typeof onBack === 'function' && (
            <button
              onClick={onBack}
              className="size-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all shadow-sm"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div>
            <h1 className="text-3xl font-black text-[#DC2626] tracking-tighter uppercase italic leading-none">
              {tournament ? tournament.name : 'Torneio'}
            </h1>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mt-1">
              {tournament ? `${getTournamentTypeText(tournament.type)} • MATCHES` : 'Carregando...'}

            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={exportTournamentReport}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            Exportar Relatorio
          </button>

          <button
            onClick={handleToggleManage}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest transition-all ${
              isManaging
                ? 'bg-[#000000] text-white shadow-lg shadow-gray-300'
                : 'bg-white border-2 border-[#000000] text-[#000000] hover:bg-[#000000] hover:text-white'
            }`}
          >
            {isManaging ? 'Concluir' : 'Gerenciar'}
          </button>

          {isManaging && (
            <>
              <button
                onClick={openTournamentEdit}
                className="px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              >
                Editar Torneio
              </button>

              <button
                onClick={handleDeleteTournament}
                className="px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Excluir Torneio
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-400 mx-auto px-8 pt-12 space-y-16">
        {isLoading || !tournament ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500 font-semibold">Carregando torneio...</div>
        ) : (
          <>
            <section className="space-y-8">
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <GerenciarPartidas tournamentId={tournamentId} isEmbedded={true} />
              </div>
            </section>
            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Desempenho</h2>
                  <div className="h-px w-24 bg-[#3B82F6] opacity-30 mt-2" />
                  <span className="text-[12px] font-black text-gray-300 mt-2 uppercase tracking-[0.2em]">Selected Squad Performance</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Avg. Hits / Match" value="12.4" trend="+15%" color="#000000" />
                <StatCard label="Pass Accuracy" value="88%" trend="+2%" color="#3B82F6" />
                <StatCard label="Service Errors" value="4.2" trend="-8%" color="#EF4444" />
                <StatCard label="Win Probability" value="76%" trend="+5%" color="#DC2626" />
              </div>
            </section>
          </>
        )}
      </main>

      {matchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-6 py-4 bg-zinc-900 flex items-center justify-between">
              <h2 className="text-xl text-white font-black uppercase tracking-wide">
                {matchForm.id ? 'Editar Partida' : 'Nova Partida'}
              </h2>
              <button onClick={closeMatchModal} className="text-zinc-400 hover:text-white text-sm font-bold uppercase">
                Fechar
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="p-6 space-y-5">
              <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg mb-2">
                <div>
                  <h4 className="font-bold text-black text-sm uppercase">Partida Externa</h4>
                  <p className="text-xs text-gray-500">Registrar resultado entre outros times.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isExternal"
                    checked={matchForm.isExternal}
                    onChange={handleMatchInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-red-600" />
                </label>
              </div>

              {matchForm.isExternal ? (
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Time 1</label>
                    <input
                      type="text"
                      name="team1"
                      value={matchForm.team1}
                      onChange={handleMatchInputChange}
                      required
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Time 2</label>
                    <input
                      type="text"
                      name="team2"
                      value={matchForm.team2}
                      onChange={handleMatchInputChange}
                      required
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Adversario</label>
                  <input
                    type="text"
                    name="opponent"
                    value={matchForm.opponent}
                    onChange={handleMatchInputChange}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Data</label>
                  <input
                    type="date"
                    name="date"
                    value={matchForm.date}
                    onChange={handleMatchInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Ginasio</label>
                  <input
                    type="text"
                    name="gymnasium"
                    value={matchForm.gymnasium}
                    onChange={handleMatchInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Status</label>
                  <select
                    name="status"
                    value={matchForm.status}
                    onChange={handleMatchInputChange}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="live">live</option>
                    <option value="finished">finished</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Placar</label>
                  <input
                    type="text"
                    name="score"
                    value={matchForm.score}
                    onChange={handleMatchInputChange}
                    placeholder="Ex: 3-1"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeMatchModal}
                  className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={matchSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-black uppercase tracking-wider"
                >
                  {matchSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tournamentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-7 pt-6 pb-5 border-b border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Torneio</p>
              <h2 className="text-2xl text-zinc-900 font-black uppercase tracking-tighter">Editar Torneio</h2>
              <p className="text-sm font-semibold text-zinc-400 mt-2">Defina o formato e periodo do torneio.</p>
            </div>

            <form onSubmit={handleSaveTournament} className="p-7 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Nome do torneio *</label>
                <input
                  type="text"
                  name="name"
                  value={tournamentForm.name}
                  onChange={handleTournamentInputChange}
                  required
                  maxLength={80}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Tipo do torneio *</label>
                  <select
                    name="type"
                    value={tournamentForm.type}
                    onChange={handleTournamentInputChange}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                  >
                    {TOURNAMENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Status previsto</label>
                  <div
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm font-black uppercase tracking-wider ${
                      getTournamentStatusByDates(tournamentForm.startDate, tournamentForm.endDate) === 'ongoing'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : getTournamentStatusByDates(tournamentForm.startDate, tournamentForm.endDate) === 'finished'
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-500'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {getTournamentStatusByDates(tournamentForm.startDate, tournamentForm.endDate) === 'ongoing'
                      ? 'Em andamento'
                      : getTournamentStatusByDates(tournamentForm.startDate, tournamentForm.endDate) === 'finished'
                        ? 'Finalizado'
                        : 'Futuro'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Data de inicio *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={tournamentForm.startDate}
                    onChange={handleTournamentInputChange}
                    required
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Data de termino *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={tournamentForm.endDate}
                    onChange={handleTournamentInputChange}
                    required
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-5 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeTournamentModal}
                  className="px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={tournamentSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-black uppercase tracking-widest"
                >
                  {tournamentSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, trend, color }) => {
  const isPositive = trend.startsWith('+');

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-gray-50 text-gray-400" style={{ color }}>
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4v7H4v-7zm6-9h4v16h-4V4zm6 5h4v11h-4V9z" />
          </svg>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tighter italic">{value}</p>
    </div>
  );
};

export default TournamentView;
