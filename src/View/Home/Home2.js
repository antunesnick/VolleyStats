import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TournamentView from '../Tournament/Tournament';
import vsLogo from '../../assets/vslogo.jpeg';
import TournamentControl from '../../Control/TournamentControl'; 

// Importe o componente PlayerView (Ajuste o caminho da pasta conforme a estrutura do seu projeto)
import { PlayerRegView } from '../PlayerRegister/PlayerRegView';
import PlayerView from '../PlayerView/PlayerView';
import Ginasio from '../Ginasios/Ginasio';

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

const ACTIVE_PAGE_STORAGE_KEY = 'volleystats.activePage';
const SELECTED_TOURNAMENT_STORAGE_KEY = 'volleystats.selectedTournamentId';

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

const getTournamentStatusLabel = (status) => {
  const labels = {
    ongoing: 'Em andamento',
    upcoming: 'Em breve',
    finished: 'Finalizado',
  };

  return labels[status] || status;
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
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState(() => sessionStorage.getItem(ACTIVE_PAGE_STORAGE_KEY) || 'home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(() => {
    const storedId = Number(sessionStorage.getItem(SELECTED_TOURNAMENT_STORAGE_KEY));
    return storedId || null;
  });
  const [tournaments, setTournaments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [scheduleFilterName, setScheduleFilterName] = useState('');
  const [scheduleSortBy, setScheduleSortBy] = useState('date');

  const [modalExcelOpen, setModalExcelOpen] = useState(false);
  const [dadosExcel, setDadosExcel] = useState([]);
  const [nomeArquivoExcel, setNomeArquivoExcel] = useState('');
  const [isReadingExcel, setIsReadingExcel] = useState(false);
  
  const showToast = (type, text) => {
    showToastMessage(setToasts, type, text);
  };

  const handleImportarExcel = async () => {
    setIsReadingExcel(true)
    
    try {
      const result = await window.excelAPI.importar();
      
      if (result.success) {
        setDadosExcel(result.data);
        setNomeArquivoExcel(result.fileName);
        setModalExcelOpen(true); 
      } else if (result.error) {
        // Passo 2.1 - Fluxo Alternativo: Estrutura Incorreta
        showToast('error', result.error); 
      }
  }catch (error) {
    showToast('error', 'Erro ao abrir o seletor de arquivos.');
  }finally {
    setIsReadingExcel(false);
  }
};

const handleConfirmarImportacao = async () => {
    setIsSubmitting(true);
    try {
      const result = await window.excelAPI.salvarDados(dadosExcel);
      if (result.success) {
        showToast('success', 'Dados importados com sucesso!');
        setModalExcelOpen(false);
        setDadosExcel([]);
        setTimeout(() => { // recarregar a pagina para reapparecer os jogadores
          window.location.reload();
        }, 1500);
      } else {
        showToast('error', result.error);
      }
    } catch (error) {
      showToast('error', 'Falha ao salvar no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTournaments = async () => {
    setIsLoading(true);

    try {
      const rows = await TournamentControl.listTournaments();
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

  useEffect(() => {
    sessionStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
  }, [activePage]);

  useEffect(() => {
    if (selectedTournamentId) {
      sessionStorage.setItem(SELECTED_TOURNAMENT_STORAGE_KEY, String(selectedTournamentId));
    } else {
      sessionStorage.removeItem(SELECTED_TOURNAMENT_STORAGE_KEY);
    }
  }, [selectedTournamentId]);

  const decoratedTournaments = useMemo(() => {
    return decorateTournaments(tournaments);
  }, [tournaments]);

  const ongoingTournaments = decoratedTournaments.filter((item) => item.status === 'ongoing');
  const upcomingTournaments = decoratedTournaments.filter((item) => item.status === 'upcoming');
  const finishedTournaments = decoratedTournaments.filter((item) => item.status === 'finished');
  
  const scheduleTournaments = useMemo(() => {
    const source = [...upcomingTournaments, ...finishedTournaments];
    const normalizedName = scheduleFilterName.trim().toLowerCase();

    const filtered = source.filter((item) => {
      const matchName =
        normalizedName.length === 0 ||
        String(item.name || '')
          .toLowerCase()
          .includes(normalizedName);

      return matchName;
    });

    if (scheduleSortBy === 'name') {
      return [...filtered].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' }));
    }

    const getTimeValue = (item) => {
      const primaryDate = item.startDate || item.endDate || item.date;
      const parsed = primaryDate ? new Date(primaryDate).getTime() : Number.NaN;
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return [...filtered].sort((a, b) => getTimeValue(a) - getTimeValue(b));
  }, [finishedTournaments, scheduleFilterName, scheduleSortBy, upcomingTournaments]);

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
      if (formData.id) {
        await TournamentControl.updateTournament(formData);
        showToast('success', 'Torneio atualizado com sucesso.');
      } else {
        const created = await TournamentControl.createTournament(formData);
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
    if (!shouldDelete) return;

    try {
      await TournamentControl.deleteTournamentById(id);
      if (selectedTournamentId === id) setSelectedTournamentId(null);
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

  const backToHome = () => {
    setActivePage('home');
    sessionStorage.removeItem('volleystats.activeMatch');
  };

  if (activePage === 'tournament-detail') {
    return (
      <TournamentView
        tournamentId={selectedTournamentId}
        onBack={backToHome}
        onTournamentChanged={loadTournaments}
        onTournamentDeleted={() => {
          setSelectedTournamentId(null);
          setActivePage('home');
          sessionStorage.removeItem('volleystats.activeMatch');
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
          <button 
            onClick={() => navigate('/categorias')}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
             Categorias
          </button>
          <button
            onClick={() => navigate('/ginasios')}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            Ginasios
          </button>
          <button 
            onClick={handleImportarExcel}
            disabled={isReadingExcel}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest border transition-all ${
              isReadingExcel 
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-wait' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isReadingExcel ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Lendo...
              </>
            ) : (
              'Importar'
            )}
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
            {isEditing ? 'Concluir' : 'Gerenciar Torneios'}
          </button>
        </div>
      </header>

      <main className="max-w-400 mx-auto px-8 pt-12 space-y-16">
        
        {/* --- SESSÃO: TORNEIOS AO VIVO --- */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.3em]">Ao vivo agora</h2>
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
                      {tournament.year} Temporada
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openTournamentDetail(tournament.id);
                      }}
                      className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all group-hover:translate-x-1"
                    >
                      Ver detalhes
                    </button>
                  </div>

                  <h3 className="text-3xl font-black text-gray-900 leading-tight mb-2 uppercase tracking-tighter">{tournament.name}</h3>
                  <p className="text-gray-400 font-bold text-[13px]">EVENTO AO VIVO • Termina em {tournament.date}</p>

                  {isEditing && (
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(tournament);
                        }}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-white hover:shadow-md transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTournament(tournament.id);
                        }}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        Excluir
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
                  <span className="font-black uppercase tracking-widest text-[12px]">Novo torneio</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* --- SESSÃO: ELENCO DINÂMICO (COMPONENTIZADA) --- */}
        <section className="space-y-8">
          <PlayerView />
        </section>

        {/* --- SESSÃO: GINÁSIOS (COMPONENTIZADA) --- */}
        <section className="space-y-8">
          <Ginasio />
        </section>

        {/* --- SESSÃO: AGENDA --- */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Agenda</h2>
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
              <button
                type="button"
                onClick={() => setScheduleSortBy((prev) => (prev === 'date' ? 'name' : 'date'))}
                className="shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-black uppercase tracking-wider text-zinc-600 hover:border-red-500 hover:text-red-600 transition-colors"
              >
                Ordenar: {scheduleSortBy === 'date' ? 'Data' : 'Nome (A-Z)'}
              </button>
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
                        {getTournamentStatusLabel(tournament.status)}
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

      {/* --- MODAL DE TORNEIO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
            <div className="px-7 pt-6 pb-5 border-b border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">Cadastro de Torneio</p>
              <h2 className="text-2xl text-zinc-900 font-black uppercase tracking-tighter">
                {formData.id ? 'Editar Torneio' : 'Novo Torneio'}
              </h2>
              <p className="text-sm font-semibold text-zinc-400 mt-2">Defina o formato e o período do torneio.</p>
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
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Data de início *</label>
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
                  <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">Data de término *</label>
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

    {modalExcelOpen && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
        <div className="px-7 pt-6 pb-5 border-b border-zinc-100">
          <h2 className="text-2xl text-zinc-900 font-black uppercase tracking-tighter">Confirmar Importação</h2>
          <p className="text-sm font-semibold text-zinc-400 mt-2">Arquivo: {nomeArquivoExcel}</p>
        </div>
        <div className="p-7 overflow-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {dadosExcel.length > 0 && Object.keys(dadosExcel[0]).map((key) => (
                  <th key={key} className="border-b-2 pb-3 text-[11px] font-black uppercase text-gray-500 px-4">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosExcel.slice(0, 10).map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="py-3 px-4 border-b text-sm text-gray-700">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {dadosExcel.length > 10 && <p className="text-center text-xs mt-4">Mostrando os primeiros 10 registros de {dadosExcel.length}...</p>}
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={() => setModalExcelOpen(false)} className="px-6 py-2 border rounded-lg">Cancelar</button>
          <button onClick={handleConfirmarImportacao} className="px-6 py-2 bg-red-600 text-white rounded-lg">Confirmar e Salvar</button>
        </div>
      </div>
  </div>
)}
    </div>
  );
};

export default Home;
