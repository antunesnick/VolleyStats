import React, { useEffect, useMemo, useState } from 'react';
import TournamentView from '../Tournament/Tournament';
import vsLogo from '../../assets/vslogo.jpeg';
import { homeController } from '../../Control/homeController';

const TOURNAMENT_TYPES = [
  { value: 1, label: 'Pontos Corridos' },
  { value: 2, label: 'Mata-Mata' },
  { value: 3, label: 'Pontos + Mata-Mata' },
];

const DEFAULT_FORM = {
  id: null,
  name: '',
  type: 1,
  startDate: '',
  endDate: '',
};

const MOCK_PLAYERS = Array.from({ length: 12 }).map((_, index) => ({
  id: index + 1,
  number: String(index + 1).padStart(2, '0'),
  name: `Jogador ${index + 1}`,
  role: index % 2 === 0 ? 'Titular' : 'Reserva',
}));

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

const decorateTournaments = (tournaments) => {
  return tournaments.map((item, index) => {
    const status = getTournamentStatusByDates(item.startDate, item.endDate);
    const start = new Date(item.startDate);
    const year = Number.isNaN(start.getTime()) ? 2026 + (index % 2) : start.getFullYear();

    return {
      ...item,
      status,
      year,
      date: item.endDate ? item.endDate.split('-').reverse().join('/') : '--/--/----',
    };
  });
};

const Home = () => {
  const [activePage, setActivePage] = useState('home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [scheduleFilterName, setScheduleFilterName] = useState('');

  const showToast = (type, text) => {
    showToastMessage(setToasts, type, text);
  };

  const loadTournaments = async () => {
    setIsLoading(true);

    try {
      const rows = await homeController.listTournaments();
      setTournaments(rows);
    } catch (error) {
      showToast('error', error.message || 'Erro ao carregar torneios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const decoratedTournaments = useMemo(() => {
    return decorateTournaments(tournaments);
  }, [tournaments]);

  const ongoingTournaments = decoratedTournaments.filter((item) => item.status === 'ongoing');
  const upcomingTournaments = decoratedTournaments.filter((item) => item.status === 'upcoming');
  const finishedTournaments = decoratedTournaments.filter((item) => item.status === 'finished');
  const scheduleTournaments = useMemo(() => {
    const source = [...upcomingTournaments, ...finishedTournaments];
    const normalizedName = scheduleFilterName.trim().toLowerCase();

    return source.filter((item) => {
      const matchName =
        normalizedName.length === 0 ||
        String(item.name || '')
          .toLowerCase()
          .includes(normalizedName);

      return matchName;
    });
  }, [finishedTournaments, scheduleFilterName, upcomingTournaments]);

  const selectedTournament = tournaments.find((item) => item.id === selectedTournamentId) || null;

  const openCreateModal = () => {
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (tournament) => {
    setFormData({
      id: tournament.id,
      name: tournament.name,
      type: Number(tournament.type),
      startDate: tournament.startDate || '',
      endDate: tournament.endDate || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(DEFAULT_FORM);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'type' ? Number(value) : value,
    }));
  };

  const handleSubmitTournament = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = homeController.buildTournamentPayload(formData);

      if (payload.id) {
        await homeController.updateTournament(payload);
        showToast('success', 'Torneio atualizado com sucesso.');
      } else {
        const created = await homeController.createTournament(payload);
        setSelectedTournamentId(created.id);
        showToast('success', 'Torneio criado com sucesso.');
      }

      closeModal();
      await loadTournaments();
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel salvar o torneio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (id) => {
    const shouldDelete = window.confirm('Deseja realmente excluir este torneio?');
    if (!shouldDelete) {
      return;
    }

    try {
      await homeController.deleteTournamentById(id);
      if (selectedTournamentId === id) {
        setSelectedTournamentId(null);
      }
      showToast('success', 'Torneio excluido com sucesso.');
      await loadTournaments();
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel excluir o torneio.');
    }
  };

  const openTournamentDetail = (id) => {
    setSelectedTournamentId(id);
    setActivePage('tournament-detail');
  };

  if (activePage === 'tournament-detail') {
    return (
      <TournamentView
        tournamentId={selectedTournamentId}
        onBack={() => setActivePage('home')}
        onTournamentChanged={loadTournaments}
        onTournamentDeleted={() => {
          setSelectedTournamentId(null);
          setActivePage('home');
          loadTournaments();
        }}
      />
    );
  }

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
        <div className="flex items-center gap-4">
          <img src={vsLogo} alt="VolleyStats logo" className="size-12 rounded-full flex items-center justify-center shadow-lg shadow-red-100" />
          <h1 className="text-3xl font-black text-[#DC2626] tracking-tighter uppercase italic">VolleyStats</h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            Categorias
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            Importar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            Exportar
          </button>

          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest transition-all ${
              isEditing
                ? 'bg-[#000000] text-white shadow-lg shadow-gray-300'
                : 'bg-white border-2 border-[#000000] text-[#000000] hover:bg-[#000000] hover:text-white'
            }`}
          >
            {isEditing ? 'Done Managing' : 'Manage Assets'}
          </button>
        </div>
      </header>

      <main className="max-w-400 mx-auto px-8 pt-12 space-y-16">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em]">Live Now</h2>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500 font-semibold">Carregando torneios...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ongoingTournaments.map((tournament) => (
                <article
                  key={tournament.id}
                  onClick={() => openTournamentDetail(tournament.id)}
                  className="group relative bg-white border-2 border-[#DC2626] rounded-2xl p-8 shadow-xl shadow-red-50/50 overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#DC2626] opacity-[0.05] rounded-bl-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-red-50 text-[#B91C1C] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {tournament.year} Season
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openTournamentDetail(tournament.id);
                      }}
                      className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all group-hover:translate-x-1"
                    >
                      View Details
                    </button>
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 leading-tight mb-2 uppercase tracking-tighter">{tournament.name}</h3>
                  <p className="text-gray-400 font-bold text-[13px]">LIVE EVENT • Ends {tournament.date}</p>

                  {isEditing && (
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(tournament);
                        }}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-white hover:shadow-md transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTournament(tournament.id);
                        }}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </article>
              ))}

              {isEditing && (
                <button
                  onClick={openCreateModal}
                  className="h-full min-h-55 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-[#DC2626] hover:text-[#DC2626] transition-all bg-white group"
                >
                  <div className="size-14 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-red-50 transition-colors">
                    <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </div>
                  <span className="font-black uppercase tracking-widest text-[12px]">New Tournament</span>
                </button>
              )}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Roster</h2>
              <div className="h-px w-24 bg-[#000000] opacity-30 mt-2" />
              <span className="text-[12px] font-black text-gray-300 mt-2 uppercase tracking-[0.2em]">{MOCK_PLAYERS.length} Athletes</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {MOCK_PLAYERS.map((player) => (
              <article key={player.id} className="group relative flex flex-col items-center">
                <div className="relative w-full aspect-4/5 bg-white border-2 border-[#000000]/20 rounded-2xl p-2 transition-all duration-300 overflow-hidden group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="w-full h-full rounded-xl bg-linear-to-br from-zinc-200 via-zinc-100 to-red-100 flex flex-col items-center justify-center gap-3">
                    <div className="size-16 rounded-full bg-white/70 border border-zinc-300 flex items-center justify-center text-zinc-700 font-black text-lg">
                      {player.number}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500">{player.role}</span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-[10px] font-black text-[#000000] uppercase tracking-widest mb-1">#{player.number}</p>
                  <h4 className="font-black text-gray-900 uppercase tracking-tight line-clamp-1">{player.name}</h4>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Schedule</h2>
              <div className="h-px w-24 bg-[#DC2626] opacity-30 mt-2" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xl">
              <input
                type="text"
                value={scheduleFilterName}
                onChange={(event) => setScheduleFilterName(event.target.value)}
                placeholder="Filtrar por nome"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-red-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500 font-semibold">Carregando agenda...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {scheduleTournaments.length > 0 ? (
                scheduleTournaments.map((tournament) => (
                  <article
                    key={tournament.id}
                    onClick={() => openTournamentDetail(tournament.id)}
                    className={`group relative bg-white border-2 rounded-2xl p-6 transition-all hover:shadow-lg ${
                      tournament.status === 'finished' ? 'border-gray-100 opacity-60 grayscale' : 'border-[#DC2626]/30 hover:border-[#DC2626]'
                    } cursor-pointer`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                          tournament.status === 'finished' ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {tournament.status}
                      </span>
                      <span className="text-[11px] font-black text-gray-400">{tournament.year}</span>
                    </div>

                    <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4 group-hover:text-[#DC2626] transition-colors">
                      {tournament.name}
                    </h4>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">{tournament.date}</div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <p className="font-black uppercase tracking-widest text-[12px]">Nenhum torneio encontrado</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-7 pt-6 pb-5 border-b border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Tournament Dialog</p>
              <h2 className="text-2xl text-zinc-900 font-black uppercase tracking-tighter">
                {formData.id ? 'Editar Torneio' : 'Novo Torneio'}
              </h2>
              <p className="text-sm font-semibold text-zinc-400 mt-2">Defina o formato e periodo do torneio.</p>
            </div>

            <form onSubmit={handleSubmitTournament} className="p-7 space-y-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Nome do torneio *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  maxLength={80}
                  placeholder="Ex: Campeonato Nacional 2026"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Tipo do torneio *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
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
                      getTournamentStatusByDates(formData.startDate, formData.endDate) === 'ongoing'
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : getTournamentStatusByDates(formData.startDate, formData.endDate) === 'finished'
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-500'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}
                  >
                    {getTournamentStatusByDates(formData.startDate, formData.endDate) === 'ongoing'
                      ? 'Em andamento'
                      : getTournamentStatusByDates(formData.startDate, formData.endDate) === 'finished'
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
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Data de termino *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-bold outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-5 border-t border-zinc-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-black uppercase tracking-widest"
                >
                  {isSubmitting ? 'Salvando...' : formData.id ? 'Salvar' : 'Criar Torneio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
