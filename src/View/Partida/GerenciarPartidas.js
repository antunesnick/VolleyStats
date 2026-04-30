import React, { useState, useEffect } from 'react';
import logoTime from '../assets/logoTransparent.png';
import ControlePartida from './ControlePartida';
import { Alertas } from '../../utils/Alertas';

const ACTIVE_MATCH_STORAGE_KEY = 'volleystats.activeMatch';

const CustomSelect = ({ label, icon, children, ...props }) => (
  <div className="flex-1 min-w-[260px]">
    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
      {icon}
      {label}
    </label>
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none bg-white border-2 border-gray-200 text-black rounded-xl p-4 pr-10 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all cursor-pointer text-sm font-semibold"
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);

const showToastMessage = (setToasts, type, text, duration = 3200) => {
  const id = `${Date.now()}-${Math.random()}`;
  setToasts((prev) => [...prev, { id, type, text }]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, duration);
};

const GerenciarPartidas = ({ tournamentId = null }) => {
  const [partidas, setPartidas] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [timesCadastrados, setTimesCadastrados] = useState([]);
  const [ginasiosCadastrados, setGinasiosCadastrados] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [partidaAtiva, setPartidaAtiva] = useState(null);

  const [partidaParaControlar, setPartidaParaControlar] = useState(null);
  const [isControleCarregado, setIsControleCarregado] = useState(false);

  const [filtros, setFiltros] = useState({
    dataPartida: '',
    timeId: ''
  });

  const estadoInicialForm = {
    nome: '',
    dataPartida: '',
    tipo: '',
    externa: false,
    ginasio_id: '',
    time1: '',
    time2: '',
    videoLink: '',
    torneio_id: tournamentId || null
  };

  const [formData, setFormData] = useState(estadoInicialForm);
  const [placar, setPlacar] = useState({ pontosTime1: '', pontosTime2: '' });

  const [videoLinkAtualizando, setVideoLinkAtualizando] = useState(false);
  const [videoLinkValidado, setVideoLinkValidado] = useState(true);
  const [videoLinkValidadoValor, setVideoLinkValidadoValor] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    onConfirm: null
  });

  const showToast = (type, text) => {
    showToastMessage(setToasts, type, text);
  };

  const abrirConfirmacao = ({ title, message, confirmLabel = 'Confirmar', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmLabel,
      onConfirm
    });
  };

  const fecharConfirmacao = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirmar',
      onConfirm: null
    });
  };

  const confirmarAcao = async () => {
    try {
      if (typeof confirmDialog.onConfirm === 'function') {
        await confirmDialog.onConfirm();
      }
    } finally {
      fecharConfirmacao();
    }
  };

  useEffect(() => {
    if(tournamentId)
      carregarTudo();
  }, [tournamentId]);

  useEffect(() => {
    const restoreActiveMatch = async () => {
      if (!tournamentId || partidaParaControlar) {
        return;
      }

      const rawActiveMatch = sessionStorage.getItem(ACTIVE_MATCH_STORAGE_KEY);
      if (!rawActiveMatch) {
        return;
      }

      try {
        const activeMatch = JSON.parse(rawActiveMatch);
        if (Number(activeMatch?.tournamentId) !== Number(tournamentId) || !activeMatch?.partidaId) {
          return;
        }

        const partidaBanco = await window.api.partidas.findById(activeMatch.partidaId);
        if (partidaBanco) {
          setPartidaParaControlar(partidaBanco);
          setIsControleCarregado(true);
        } else {
          sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Erro ao restaurar controle da partida:', error);
        sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
      }
    };

    restoreActiveMatch();
  }, [tournamentId, partidaParaControlar]);

const formatarDataBrasil = (dataString) => {
  if (!dataString) return '';
  
  const [ano, mes, dia] = dataString.split('-');

  return `${dia}/${mes}/${ano}`;
};

  const carregarTudo = async () => {
    try {
      const dadosPartidas = await window.api.partidas.findByTournament(tournamentId);
      setPartidas(dadosPartidas);

      const mockTimes = [
        { id: 1, nome: 'Vôlei Prudente', cidade: 'Presidente Prudente' },
        { id: 2, nome: 'Sada Cruzeiro', cidade: 'Belo Horizonte' },
        { id: 3, nome: 'Vôlei Renata', cidade: 'Campinas' }
      ];

      const dadosGinasios = await window.ElectronAPI.listarGinasios();

      setTimesCadastrados(mockTimes);
      setGinasiosCadastrados(dadosGinasios);

    } catch (error) {
      console.error("Erro na integração visual:", error);
    }
  };

  const getNomeTime = (id) => timesCadastrados.find(t => t.id === Number(id))?.nome || `Time ${id}`;
  const getNomeGinasio = (id) => ginasiosCadastrados.find(g => g.id === Number(id))?.nome || `Ginásio ${id}`;

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros({ ...filtros, [name]: value });
  };

  const handleAplicarFiltros = async () => {
    try {
      const partidasFiltradas = await window.api.partidas.findByDateAndTeam(filtros, tournamentId);
      setPartidas(partidasFiltradas);
    } catch (error) {
      console.error("Erro ao aplicar filtros.", error);
    }
  };

  

  const handleLimparFiltros = async () => {
    setFiltros({ dataPartida: '', timeId: '' });
    await carregarTudo();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData((current) => ({ ...current, [name]: nextValue }));

    if (name === 'videoLink') {
      const trimmed = String(nextValue || '').trim();
      if (trimmed === '') {
        setVideoLinkValidado(true);
        setVideoLinkValidadoValor('');
      } else if (trimmed === videoLinkValidadoValor) {
        setVideoLinkValidado(true);
      } else {
        setVideoLinkValidado(false);
      }
    }
  };

  const handleSalvarPartida = async (e) => {
    e.preventDefault();
    if (formData.time1 === formData.time2) {
      showToast('error', 'O Time 1 nao pode ser igual ao Time 2.');
      return;
    }

    const torneioIdNumerico = Number(tournamentId);
    const podeValidarPeriodoDoTorneio =
      torneioIdNumerico && !Number.isNaN(torneioIdNumerico) && typeof window.tournamentAPI?.getById === 'function';

    if (podeValidarPeriodoDoTorneio) {
      try {
        const torneio = await window.tournamentAPI.getById(torneioIdNumerico);
        const dataInicio = torneio?.inicio || torneio?.startDate;
        const dataFim = torneio?.termino || torneio?.endDate;

        if (dataInicio && dataFim) {
          if (formData.dataPartida < dataInicio || formData.dataPartida > dataFim) {
            Alertas.aviso(`A data da partida deve estar entre ${formatarDataBrasil(dataInicio)} e ${formatarDataBrasil(dataFim)} (Período do Torneio).`);
            return;
          }
        }
      } catch (error) {
        // Nao bloqueia o cadastro se a consulta de periodo do torneio falhar.
        console.warn('Nao foi possivel validar o periodo do torneio. Cadastro seguira sem essa validacao.', error);
      }
    }

    const rawVideoLink = typeof formData.videoLink === 'string' ? formData.videoLink.trim() : '';
    const videoLinkVazio = rawVideoLink === '';
    const resolvedVideoLink = videoLinkValidado || videoLinkVazio
      ? rawVideoLink
      : (videoLinkValidadoValor || '');

    if (!videoLinkValidado && !videoLinkVazio) {
      showToast('error', 'Link de video nao validado. Use "Anexar Video" para salvar o link.');
    }

    const payload = {
      ...formData,
      videoLink: resolvedVideoLink,
      torneio_id: torneioIdNumerico && !Number.isNaN(torneioIdNumerico) ? torneioIdNumerico : null,
    };

    try {
      if (editandoId) {
        await window.api.partidas.update({ ...payload, id: editandoId });
        showToast('success', 'Partida atualizada com sucesso.');
      } else {
        await window.api.partidas.create(payload);
        showToast('success', 'Partida criada com sucesso.');
      }
      await carregarTudo();
      fecharModal();
    } catch (error) {
      showToast('error', error?.message || 'Falha ao salvar partida na base de dados.');
    }
  };

  const handleDeletar = async (id) => {
    const confirmado = await Alertas.confirmacao(
      "Esta ação é irreversível. Deseja realmente apagar esta partida?"
    );

    if (!confirmado) {
      return;
    }

    try {
      await window.api.partidas.delete(id);
      await carregarTudo();
      Alertas.sucesso("Partida apagada com sucesso.");
    } catch (error) {
      console.error("Erro ao apagar partida:", error);
      Alertas.erro(error?.message || "Erro ao comunicar com o banco de dados.");
    }
  };

  const handleFinalizar = async (e) => {
    e.preventDefault();
    try {
      await window.api.partidas.finalizar(partidaAtiva.id, placar.pontosTime1, placar.pontosTime2);
      await carregarTudo();
      setIsFinalizarModalOpen(false);
    } catch (error) {
      Alertas.erro("Erro ao registrar resultado.");
    }
  };

  const handleAnexarVideo = async () => {
    if (!editandoId) {
      showToast('error', 'Selecione uma partida para anexar o video.');
      return;
    }

    setVideoLinkAtualizando(true);
    try {
      const result = await window.api.partidas.updateVideoLink(editandoId, formData.videoLink || '');
      const normalizedLink = result?.videoLink ?? formData.videoLink;
      setFormData((current) => ({
        ...current,
        videoLink: normalizedLink
      }));
      setVideoLinkValidado(true);
      setVideoLinkValidadoValor(normalizedLink || '');
      showToast('success', 'Link de video atualizado com sucesso.');
      await carregarTudo();
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel atualizar o link de video.');
    } finally {
      setVideoLinkAtualizando(false);
    }
  };

  const abrirModalCriar = () => {
    setFormData(estadoInicialForm);
    setVideoLinkValidado(true);
    setVideoLinkValidadoValor('');
    setEditandoId(null);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (partida) => {
    const existingVideoLink = partida.videoLink || '';
    setFormData({
      ...partida,
      time1: String(partida.time1),
      time2: String(partida.time2),
      ginasio_id: String(partida.ginasio_id)
    });
    setVideoLinkValidado(true);
    setVideoLinkValidadoValor(existingVideoLink);
    setEditandoId(partida.id);
    setIsModalOpen(true);
  };

  const abrirControlePartida = async (id) => {
    try {
      const partidaBanco = await window.api.partidas.findById(id);
      if (!partidaBanco) {
        Alertas.erro('Partida não encontrada no banco de dados.');
        return;
      }
      sessionStorage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify({
        tournamentId,
        partidaId: partidaBanco.id,
      }));
      setPartidaParaControlar(partidaBanco);
      setIsControleCarregado(true);
    } catch (error) {
      console.error('Erro ao carregar partida para controle:', error);
      Alertas.erro('Não foi possível carregar o controle da partida. Veja o console.');
    }
  };

  const fecharModal = () => setIsModalOpen(false);

  const voltarDaTelaControle = async () => {
    sessionStorage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
    await carregarTudo();
    setPartidaParaControlar(null);
  };

  // ==========================================
  // FIX: RENDERIZAÇÃO CONDICIONAL DA PÁGINA
  // ==========================================
  // Se houver uma partida selecionada para controle, a tela inteira vira o ControlePartida
  if (partidaParaControlar) {
    return (
      <ControlePartida
        partida={partidaParaControlar}
        aoVoltar={voltarDaTelaControle}
      />
    );
  }

  // Caso contrário, renderiza a tela de listagem padrão
  return (
    <div className="w-full text-neutral-900 font-sans">
      {toasts.length > 0 && (
        <div className="fixed top-6 right-6 z-[3000] flex flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border border-white/20 text-white ${toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                  ? 'bg-red-600'
                  : 'bg-gray-900'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}
      {/* TÍTULO E BOTÃO NOVA PARTIDA INTEGRADOS */}
      <div className="mb-10 pb-6 border-b-4 border-neutral-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-12 bg-red-600 rounded-full shadow-lg"></div>
          <div>
            <h2 className="text-4xl font-black text-black tracking-tighter uppercase">Cronograma de Jogos</h2>
            <p className="text-gray-600 text-sm font-medium mt-1">Gerencie, edite e acompanhe os confrontos agendados</p>
          </div>
        </div>
        <button
          onClick={abrirModalCriar}
          className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-8 rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-2.5 active:scale-95 text-base whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          NOVA PARTIDA
        </button>
      </div>

      {/* SEÇÃO DE FILTROS - GRID ESTÁTICO */}
      <div className="mb-10 bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
          <h3 className="text-xl font-bold text-black uppercase tracking-wide">Filtros de Busca</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Data da Partida
            </label>
            <input
              type="date"
              name="dataPartida"
              value={filtros.dataPartida}
              onChange={handleFiltroChange}
              className="w-full bg-white border-2 border-gray-200 text-black rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a1 1 0 11-2 0 1 1 0 012 0zM5 20a6 6 0 1112 0v-2a6 6 0 00-12 0v2z"></path></svg>
              Time
            </label>
            <div className="relative">
              <select
                name="timeId"
                value={filtros.timeId}
                onChange={handleFiltroChange}
                className="w-full appearance-none bg-white border-2 border-gray-200 text-black rounded-xl p-3 pr-10 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all cursor-pointer text-sm font-semibold"
              >
                <option value="">Selecionar Time...</option>
                {timesCadastrados.map((time) => (
                  <option key={time.id} value={time.id}>{time.nome}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3 items-end col-span-2">
            <button onClick={handleAplicarFiltros} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              Aplicar Filtros
            </button>
            <button onClick={handleLimparFiltros} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* GRID DE CARDS ESTÁTICO */}
      <div className="grid grid-cols-2 gap-10">
        {partidas.map((partida) => (
          <div key={partida.id} className={`bg-white rounded-3xl shadow-lg border-2 ${partida.status === 'AGENDADA' ? 'border-yellow-400' : 'border-gray-200'} overflow-hidden hover:shadow-2xl transition-all group flex flex-col`}>

            <div className={`px-7 py-4 flex justify-between items-center ${partida.status === 'FINALIZADA' ? 'bg-neutral-800' : 'bg-black'} text-white`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${partida.status === 'FINALIZADA' ? 'text-gray-400' : 'text-red-500'} bg-red-950/30 px-3 py-1.5 rounded-full`}>{partida.tipo}</span>
              <span className={`text-xs font-semibold ${partida.status === 'FINALIZADA' ? 'text-gray-300' : 'text-yellow-400'} flex items-center gap-2`}>
                <div className={`w-2 h-2 rounded-full ${partida.status === 'FINALIZADA' ? 'bg-gray-500' : 'bg-yellow-400'}`}></div>
                {partida.status}
              </span>
            </div>

            <div className="p-8 flex-grow flex flex-col">
              <div className="flex justify-between items-baseline mb-3">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{formatarDataBrasil(partida.dataPartida)}</p>
                <span className="text-xs text-gray-400">ID: {partida.id}</span>
              </div>
              <h3 className="text-3xl font-black text-black mb-7 leading-tight group-hover:text-red-600 transition-colors">{partida.nome}</h3>

              <div className="flex items-center gap-6 bg-neutral-900 p-6 rounded-2xl border-2 border-neutral-800 mb-7 shadow-lg">
                <div className="flex-1 text-center font-bold text-xl text-white truncate">{getNomeTime(partida.time1)}</div>
                <div className="text-3xl font-black text-red-500 flex items-center gap-1.5">
                  <span className="w-1 h-5 bg-yellow-400 rounded-full"></span>
                  VS
                  <span className="w-1 h-5 bg-yellow-400 rounded-full"></span>
                </div>
                <div className="flex-1 text-center font-bold text-xl text-white truncate">{getNomeTime(partida.time2)}</div>
              </div>

              {partida.status === 'FINALIZADA' && (
                <div className="bg-black p-5 rounded-xl text-center mb-7 border-2 border-red-800 shadow-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Placar Final</p>
                  <p className="text-5xl font-black text-white tracking-tighter">{partida.pontosTime1} <span className="text-red-500">x</span> {partida.pontosTime2}</p>
                </div>
              )}

              <div className="flex items-center text-gray-700 text-sm mb-7 gap-2.5 mt-auto border-t pt-5 border-gray-100">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="truncate font-medium">{getNomeGinasio(partida.ginasio_id)}</span>
              </div>

              {partida.videoLink && (
                <a
                  href={partida.videoLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-red-700 hover:bg-red-100 transition-colors"
                >
                  Assistir Video da Partida
                </a>
              )}

              <div className="grid grid-cols-2 gap-4 mt-2 border-t pt-6 border-gray-100">
                {partida.status !== 'FINALIZADA' && (
                  <button onClick={() => abrirModalEditar(partida)} className="col-span-2 bg-black hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border-2 border-neutral-800 hover:border-yellow-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2-2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Editar Confronto
                  </button>
                )}
                <button onClick={() => handleDeletar(partida.id)} className="bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 font-semibold py-3.5 rounded-xl text-sm transition-colors">
                  Apagar
                </button>
                <button 
                onClick={() => abrirControlePartida(partida.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all transform hover:scale-105 active:scale-95 shadow-lg">
                  Iniciar Controle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {partidas.length === 0 && (
        <div className="text-center py-24 text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-300 shadow-sm">
          <svg className="w-16 h-16 mx-auto mb-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <p className="text-xl font-bold">Nenhuma partida cadastrada atualmente.</p>
          <p className="mt-2">Clique em "NOVA PARTIDA" para começar o cronograma.</p>
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2000] p-10 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto">

            <div className="bg-black px-8 py-5 flex justify-between items-center border-b-4 border-red-600 shadow-lg">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">{editandoId ? 'Atualizar Confronto' : 'Cadastrar Confronto Temporada'}</h2>
              <button onClick={fecharModal} className="text-gray-400 hover:text-red-500 transition-colors text-3xl font-light p-2">✕</button>
            </div>

            <form onSubmit={handleSalvarPartida} className="p-10 space-y-8">

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Identificação da Partida (Nome/Descrição) *
                </label>
                <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} required placeholder="Ex: Semifinal - Jogo 1 ou Amistoso de Verão" className="w-full bg-white border-2 border-gray-200 text-black rounded-xl p-4 shadow-inner focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-semibold transition-all" />
              </div>

              <div className="flex gap-6 border-2 border-dashed border-gray-200 p-6 rounded-2xl bg-gray-50 shadow-inner items-end">
                <CustomSelect
                  label="Time 1 (Mandante/Principal) *"
                  name="time1"
                  value={formData.time1}
                  onChange={handleInputChange}
                  required
                  icon={<svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9"></path></svg>}
                >
                  <option value="">Selecione o Time 1...</option>
                  {timesCadastrados.map(time => (
                    <option key={time.id} value={time.id}>{time.nome} ({time.cidade})</option>
                  ))}
                </CustomSelect>

                <div className="text-3xl font-black text-red-600 pb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
                  VS
                  <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
                </div>

                <CustomSelect
                  label="Time 2 (Visitante/Adversário) *"
                  name="time2"
                  value={formData.time2}
                  onChange={handleInputChange}
                  required
                  icon={<svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9"></path></svg>}
                >
                  <option value="">Selecione o Time 2...</option>
                  {timesCadastrados.map(time => (
                    <option key={time.id} value={time.id}>{time.nome} ({time.cidade})</option>
                  ))}
                </CustomSelect>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Data do Confronto *
                  </label>
                  <input type="date" name="dataPartida" value={formData.dataPartida} onChange={handleInputChange} required className="w-full bg-white border-2 border-gray-200 text-black rounded-xl p-4 shadow-inner focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-semibold transition-all" />
                </div>

                <CustomSelect
                  label="Tipo de Competição *"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  required
                  icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>}
                >
                  <option value="">Selecione a fase...</option>
                  <option value="Fase de Grupos">Fase de Grupos</option>
                  <option value="Oitavas de Final">Oitavas de Final</option>
                  <option value="Quartas de Final">Quartas de Final</option>
                  <option value="Semifinal">Semifinal</option>
                  <option value="Final">Grande Final</option>
                  <option value="Amistoso">Amistoso / Treino</option>
                </CustomSelect>

                <CustomSelect
                  label="Local (Ginásio) *"
                  name="ginasio_id"
                  value={formData.ginasio_id}
                  onChange={handleInputChange}
                  required
                  icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>}
                >
                  <option value="">Selecione o Ginásio...</option>
                  {ginasiosCadastrados.map(gin => (
                    <option key={gin.id} value={gin.id}>{gin.nome} ({gin.cidade}/{gin.estado})</option>
                  ))}
                </CustomSelect>
              </div>
              <div className="flex items-center gap-4 bg-red-50 border-2 border-dashed border-red-100 p-5 rounded-2xl shadow-inner">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="externa" checked={formData.externa} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-14 h-7 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                </label>
                <div>
                  <h4 className="font-extrabold text-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-yellow-400 rounded-full block shadow"></span>
                    Partida Externa
                  </h4>
                  <p className="text-xs text-gray-600 font-medium">Ative se esta partida ocorrer fora dos domínios do Vôlei Prudente.</p>
                </div>
              </div>

              {editandoId && (
                <div className="space-y-3 rounded-2xl border-2 border-blue-100 bg-blue-50 p-5 shadow-inner">
                  <label className="block text-xs font-bold text-blue-700 uppercase tracking-widest">
                    Link do Video da Partida
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      name="videoLink"
                      value={formData.videoLink || ''}
                      onChange={handleInputChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border-2 border-blue-200 bg-white p-3 text-sm font-semibold text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-300"
                    />
                    <button
                      type="button"
                      onClick={handleAnexarVideo}
                      disabled={videoLinkAtualizando}
                      className="whitespace-nowrap rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {videoLinkAtualizando ? 'Anexando...' : 'Anexar Video'}
                    </button>
                  </div>
                  <p className="text-xs font-medium text-blue-700">
                    Use o botao "Anexar Video" para validar e vincular o link ao confronto.
                  </p>
                </div>
              )}
              <div className="mt-12 flex justify-end gap-4 pt-7 border-t-2 border-gray-100">
                <button type="button" onClick={fecharModal} className="px-8 py-3.5 font-extrabold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-base border border-gray-200">
                  Cancelar
                </button>
                <button type="submit" className="px-10 py-3.5 font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95 text-base">
                  {editandoId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR CADASTRO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR PARTIDA */}
      {isFinalizarModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-black">
            <div className="bg-green-600 px-6 py-4 border-b-4 border-green-800 shadow-lg">
              <h2 className="text-xl font-black text-white tracking-wide uppercase text-center">Registrar Placar Final</h2>
            </div>
            <form onSubmit={handleFinalizar} className="p-8 space-y-9">
              <div className="flex justify-between items-center gap-5">
                <div className="text-center flex-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-3 truncate">{getNomeTime(partidaAtiva?.time1)}</label>
                  <input type="number" min="0" required value={placar.pontosTime1} onChange={(e) => setPlacar({ ...placar, pontosTime1: e.target.value })} className="w-full text-center text-5xl font-black bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-inner focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all" />
                </div>
                <span className="text-3xl font-black text-gray-300 self-end pb-5 flex items-center gap-1">
                  <span className="w-1 h-6 bg-yellow-400 rounded-full block"></span>
                  X
                  <span className="w-1 h-6 bg-yellow-400 rounded-full block"></span>
                </span>
                <div className="text-center flex-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-3 truncate">{getNomeTime(partidaAtiva?.time2)}</label>
                  <input type="number" min="0" required value={placar.pontosTime2} onChange={(e) => setPlacar({ ...placar, pontosTime2: e.target.value })} className="w-full text-center text-5xl font-black bg-white border-2 border-gray-300 rounded-2xl p-4 shadow-inner focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-3.5 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsFinalizarModalOpen(false)} className="px-5 py-3.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg w-full transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-3.5 font-black text-white bg-green-600 hover:bg-green-700 rounded-lg w-full transition-all shadow-lg transform hover:scale-105 active:scale-95">Confirmar Resultado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarPartidas;
