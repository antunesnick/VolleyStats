import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TournamentView from '../Tournament/Tournament';
import vsLogo from '../../assets/vslogo.jpeg';
import TournamentControl from '../../Control/TournamentControl'; 
import TimesControl from '../../Control/TimesControl';
import {
  blocoMetricas,
  blocoTabela,
  escapeHtml,
  montarDocumento,
  nomeArquivoRelatorio,
  salvarRelatorioPdf,
} from '../../utils/relatorioPdf';

/**
 * Pilulas do menu do topo. `whitespace-nowrap` mantem o rotulo em uma linha
 * dentro da pilula: sem ele "Relatorio Torneios" quebrava em duas e deixava a
 * fileira de botoes desalinhada.
 */
const BOTAO_MENU = 'flex items-center gap-2 px-4 py-2 rounded-full font-black text-[11px] uppercase tracking-widest whitespace-nowrap border transition-all';
const BOTAO_MENU_PADRAO = `${BOTAO_MENU} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`;
const BOTAO_MENU_OCUPADO = `${BOTAO_MENU} bg-gray-100 border-gray-300 text-gray-400 cursor-wait`;

// Importe o componente PlayerView (Ajuste o caminho da pasta conforme a estrutura do seu projeto)
import PlayerView from '../PlayerView/PlayerView';
import EstatisticaControl from '../../Control/EstatisticaControl';

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

const DEFAULT_GENERAL_TOURNAMENT_REPORT_FILTERS = {
  dataInicio: '',
  dataFim: '',
  tipoTorneio: '',
  timeId: '',
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

const formatDateBR = (value) => {
  if (!value) return '--/--/----';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const formatDateTimeBR = (value) => {
  if (!value) return '--/--/---- --:--';

  const normalizedValue = String(value).includes('T')
    ? String(value)
    : String(value).replace(' ', 'T');
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [generalTournamentReport, setGeneralTournamentReport] = useState(null);
  const [generalTournamentReportOpen, setGeneralTournamentReportOpen] = useState(false);
  const [generalTournamentReportLoading, setGeneralTournamentReportLoading] = useState(false);
  const [generalTournamentReportPdfSaving, setGeneralTournamentReportPdfSaving] = useState(false);
  const [generalTournamentReportFilters, setGeneralTournamentReportFilters] = useState(DEFAULT_GENERAL_TOURNAMENT_REPORT_FILTERS);
  const [matchReport, setMatchReport] = useState(null);
  const [matchReportOpen, setMatchReportOpen] = useState(false);
  const [matchReportLoading, setMatchReportLoading] = useState(false);
  const [matchReportPdfSaving, setMatchReportPdfSaving] = useState(false);
  const [matchReportFilters, setMatchReportFilters] = useState({
    torneioId: '',
    dataPartida: '',
    timeId: '',
  });
  const [timesCadastrados, setTimesCadastrados] = useState([]);

  const [modalExcelOpen, setModalExcelOpen] = useState(false);
  const [dadosExcel, setDadosExcel] = useState([]);
  const [nomeArquivoExcel, setNomeArquivoExcel] = useState('');
  const [isReadingExcel, setIsReadingExcel] = useState(false);
  const [historicoExcelOpen, setHistoricoExcelOpen] = useState(false);
  const [historicoExcel, setHistoricoExcel] = useState([]);
  const [historicoExcelLoading, setHistoricoExcelLoading] = useState(false);
  const [historicoExcelReverting, setHistoricoExcelReverting] = useState(null);
  
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
      const result = await window.excelAPI.salvarDados(dadosExcel, nomeArquivoExcel);
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

  const carregarHistoricoExcel = async () => {
    setHistoricoExcelLoading(true);

    try {
      const result = await window.excelAPI.listarHistorico();
      if (result?.success) {
        setHistoricoExcel(result.data || []);
      } else {
        showToast('error', result?.error || 'Nao foi possivel carregar o historico de importacoes.');
        setHistoricoExcel([]);
      }
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel carregar o historico de importacoes.');
      setHistoricoExcel([]);
    } finally {
      setHistoricoExcelLoading(false);
    }
  };

  const abrirHistoricoExcel = async () => {
    setHistoricoExcelOpen(true);
    await carregarHistoricoExcel();
  };

  const fecharHistoricoExcel = () => {
    setHistoricoExcelOpen(false);
    setHistoricoExcelReverting(null);
  };

  const reverterImportacaoExcel = async (id) => {
    const confirmed = window.confirm('Deseja reverter esta importacao? As acoes importadas desse arquivo serao removidas.');

    if (!confirmed) {
      return;
    }

    setHistoricoExcelReverting(id);

    try {
      const result = await window.excelAPI.reverter(id);
      if (result?.success) {
        showToast('success', 'Importacao revertida com sucesso.');
        await carregarHistoricoExcel();
      } else {
        showToast('error', result?.error || 'Nao foi possivel reverter a importacao.');
      }
    } catch (error) {
      showToast('error', error.message || 'Nao foi possivel reverter a importacao.');
    } finally {
      setHistoricoExcelReverting(null);
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

  const loadTimes = async () => {
    try {
      const rows = await TimesControl.getInstance().listarTimes();
      setTimesCadastrados(rows || []);
    } catch (error) {
      setTimesCadastrados([]);
    }
  };

  useEffect(() => {
    loadTournaments();
    loadTimes();
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

  const openGeneralTournamentReport = async (filters = generalTournamentReportFilters) => {
    const filtrosRelatorio = filters?.target ? { ...generalTournamentReportFilters } : { ...filters };
    setGeneralTournamentReportLoading(true);

    try {
      const report = typeof window.reportAPI?.torneiosGeral === 'function' && window.reportAPI.torneiosGeral.length > 0
        ? await window.reportAPI.torneiosGeral(filtrosRelatorio)
        : await TournamentControl.emitirRelatorioGeralTorneios(filtrosRelatorio);
      setGeneralTournamentReport(report);
      setGeneralTournamentReportOpen(true);
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel emitir o relatorio geral de torneios.');
    } finally {
      setGeneralTournamentReportLoading(false);
    }
  };

  const closeGeneralTournamentReport = () => {
    setGeneralTournamentReportOpen(false);
    setGeneralTournamentReport(null);
    setGeneralTournamentReportPdfSaving(false);
  };

  const handleGeneralTournamentReportFilterChange = (event) => {
    const { name, value } = event.target;
    setGeneralTournamentReportFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearGeneralTournamentReportFilters = () => {
    setGeneralTournamentReportFilters(DEFAULT_GENERAL_TOURNAMENT_REPORT_FILTERS);
    openGeneralTournamentReport(DEFAULT_GENERAL_TOURNAMENT_REPORT_FILTERS);
  };

  const getGeneralTournamentReportFilterSummary = (report = generalTournamentReport) => {
    const filtros = report?.filtrosAplicados || {};
    const itens = [];
    let periodo = 'Todos';

    if (filtros.dataInicio && filtros.dataFim) {
      periodo = `${formatDateBR(filtros.dataInicio)} ate ${formatDateBR(filtros.dataFim)}`;
    } else if (filtros.dataInicio) {
      periodo = `A partir de ${formatDateBR(filtros.dataInicio)}`;
    } else if (filtros.dataFim) {
      periodo = `Ate ${formatDateBR(filtros.dataFim)}`;
    }

    itens.push(`Periodo: ${periodo}`);
    itens.push(`Tipo: ${filtros.tipoTorneioNome || 'Todos'}`);
    itens.push(`Time: ${filtros.timeNome || 'Todos'}`);

    return `Filtros: ${itens.join(' | ')}`;
  };

  const buildGeneralTournamentReportHtml = () => {
    if (!generalTournamentReport) {
      return montarDocumento({ titulo: 'Relatorio Geral de Torneios', eyebrow: 'VolleyStats' });
    }

    const report = generalTournamentReport;
    const linhasTorneios = report.torneios.map((torneio) => `
      <tr>
        <td><strong>${escapeHtml(torneio.nome)}</strong><span>${escapeHtml(torneio.tipoNome)}</span></td>
        <td class="center">${escapeHtml(formatDateBR(torneio.inicio))}</td>
        <td class="center">${escapeHtml(formatDateBR(torneio.termino))}</td>
        <td class="center">${torneio.totalPartidas}</td>
        <td class="center">${torneio.finalizadas}</td>
        <td class="center">${torneio.totalSets}</td>
        <td>${escapeHtml(torneio.campeao?.nome || 'Sem campeao')}</td>
      </tr>
    `);

    const linhasTimes = report.times.map((time, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(time.nome)}</strong></td>
        <td class="center">${time.torneios}</td>
        <td class="center">${time.jogos}</td>
        <td class="center">${time.vitorias}</td>
        <td class="center">${time.derrotas}</td>
        <td class="center">${time.taxaVitoria}%</td>
        <td class="center">${time.saldoSets}</td>
      </tr>
    `);

    const linhasJogadores = report.jogadores.map((jogador, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>#${escapeHtml(jogador.numCamisa || '--')} - ${escapeHtml(jogador.nome)}</strong><span>${escapeHtml(jogador.posicaoNome || 'Sem posicao')}</span></td>
        <td class="center">${jogador.torneios}</td>
        <td class="center">${jogador.partidas}</td>
        <td class="center">${jogador.totalAcoes}</td>
        <td class="center">${jogador.acoesPonto}</td>
        <td class="center">${jogador.aproveitamentoPontos}%</td>
        <td class="center">${jogador.saques}</td>
        <td class="center">${jogador.ataques}</td>
        <td class="center">${jogador.bloqueios}</td>
      </tr>
    `);

    return montarDocumento({
      titulo: 'Relatorio Geral de Torneios',
      eyebrow: 'VolleyStats',
      subtitulo: [
        'Resumo consolidado de todos os torneios cadastrados',
        getGeneralTournamentReportFilterSummary(report),
      ],
      corpo: `
        ${blocoMetricas([
          { rotulo: 'Time que ganhou mais', valor: report.destaques.timeMaisVitorias?.nome || 'Sem dados', destaque: true },
          { rotulo: 'Vitorias', valor: report.destaques.timeMaisVitorias?.vitorias || 0 },
          { rotulo: 'Melhor jogador do time principal', valor: report.destaques.melhorJogadorTimePrincipal?.nome || 'Sem scout', destaque: true },
          { rotulo: 'Aproveitamento (pontos)', valor: `${report.destaques.melhorJogadorTimePrincipal?.aproveitamentoPontos || 0}%` },
          { rotulo: 'Torneios', valor: report.resumo.totalTorneios },
          { rotulo: 'Partidas', valor: report.resumo.totalPartidas },
          { rotulo: 'Finalizadas', valor: report.resumo.finalizadas },
          { rotulo: 'Sets', valor: report.resumo.totalSets },
        ])}
        ${blocoTabela({
          titulo: 'Torneios',
          colunas: [
            'Torneio',
            { rotulo: 'Inicio', center: true },
            { rotulo: 'Termino', center: true },
            { rotulo: 'Partidas', center: true },
            { rotulo: 'Final.', center: true },
            { rotulo: 'Sets', center: true },
            'Campeao estimado',
          ],
          linhas: linhasTorneios,
          vazio: 'Nenhum torneio encontrado.',
        })}
        ${blocoTabela({
          titulo: 'Ranking geral dos times',
          colunas: [
            { rotulo: '#', center: true },
            'Time',
            { rotulo: 'Torneios', center: true },
            { rotulo: 'Jogos', center: true },
            { rotulo: 'V', center: true },
            { rotulo: 'D', center: true },
            { rotulo: 'Taxa', center: true },
            { rotulo: 'Saldo', center: true },
          ],
          linhas: linhasTimes,
          vazio: 'Nenhum time encontrado.',
        })}
        ${blocoTabela({
          titulo: 'Jogadores do time principal',
          colunas: [
            { rotulo: '#', center: true },
            'Jogador',
            { rotulo: 'Torneios', center: true },
            { rotulo: 'Partidas', center: true },
            { rotulo: 'Acoes', center: true },
            { rotulo: 'Pts', center: true },
            { rotulo: 'Pts%', center: true },
            { rotulo: 'Saque', center: true },
            { rotulo: 'Ataque', center: true },
            { rotulo: 'Bloq', center: true },
          ],
          linhas: linhasJogadores,
          vazio: 'Nenhum jogador encontrado.',
        })}
      `,
    });
  };

  const saveGeneralTournamentReportPdf = async () => {
    if (!generalTournamentReport) {
      return;
    }

    setGeneralTournamentReportPdfSaving(true);

    try {
      const result = await salvarRelatorioPdf({
        nomeArquivo: nomeArquivoRelatorio('relatorio', 'geral', 'torneios'),
        html: buildGeneralTournamentReportHtml(),
      });

      if (result?.success) {
        showToast('success', 'Relatorio geral de torneios salvo em PDF.');
      }
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel salvar o relatorio em PDF.');
    } finally {
      setGeneralTournamentReportPdfSaving(false);
    }
  };

  const getMatchReportFilterSummary = (report = matchReport) => {
    const filtros = report?.filtrosAplicados || {};
    const itens = [];

    itens.push(`Torneio: ${filtros.torneioNome || 'Todos'}`);
    itens.push(`Data da partida: ${filtros.dataPartida ? formatDateBR(filtros.dataPartida) : 'Todas'}`);
    itens.push(`Time: ${filtros.timeNome || 'Todos'}`);

    return `Filtros: ${itens.join(' | ')}`;
  };

  const handleMatchReportFilterChange = (event) => {
    const { name, value } = event.target;
    setMatchReportFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearMatchReportFilters = () => {
    const filtrosLimpos = {
      torneioId: '',
      dataPartida: '',
      timeId: '',
    };
    setMatchReportFilters(filtrosLimpos);
    openMatchReport(filtrosLimpos);
  };

  const openMatchReport = (filters = matchReportFilters) => {
    const filtrosRelatorio = filters?.target ? matchReportFilters : filters;
    setMatchReportLoading(true);

    try {
      const result = EstatisticaControl.carregarRelatorioGeralPartidas(filtrosRelatorio);
      if (result.erro) {
        showToast('error', result.erro);
        return;
      }

      setMatchReport(result.relatorio);
      setMatchReportOpen(true);
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel emitir o relatorio de partidas.');
    } finally {
      setMatchReportLoading(false);
    }
  };

  const closeMatchReport = () => {
    setMatchReportOpen(false);
    setMatchReport(null);
    setMatchReportPdfSaving(false);
  };

  const buildMatchReportHtml = () => {
    if (!matchReport) {
      return montarDocumento({ titulo: 'Relatorio Partidas', eyebrow: 'VolleyStats' });
    }

    const linhasPartidas = (matchReport.jogos || []).map((jogo) => `
      <tr>
        <td>${escapeHtml(formatDateBR(jogo.dataPartida))}</td>
        <td>${escapeHtml(jogo.torneioNome || 'Sem torneio')}</td>
        <td><strong>${escapeHtml(jogo.time1Nome || 'Time 1')} x ${escapeHtml(jogo.time2Nome || 'Time 2')}</strong><span>${escapeHtml(jogo.nome || 'Partida')}</span></td>
        <td>${escapeHtml(jogo.tipo || 'Sem tipo')}</td>
        <td>${escapeHtml(jogo.ginasioNome || 'Local nao definido')}</td>
        <td class="center">${escapeHtml(jogo.status)}</td>
        <td class="center">${escapeHtml(jogo.placar)}</td>
        <td class="center">${jogo.totalSets || 0}</td>
        <td>${escapeHtml(jogo.vencedor)}</td>
      </tr>
    `);

    const linhasTimes = (matchReport.times || []).map((time, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(time.nome)}</strong></td>
        <td class="center">${time.jogos}</td>
        <td class="center">${time.vitorias}</td>
        <td class="center">${time.derrotas}</td>
        <td class="center">${time.taxaVitoria}%</td>
        <td class="center">${time.saldoSets}</td>
      </tr>
    `);

    return montarDocumento({
      titulo: 'Relatorio Partidas',
      eyebrow: 'VolleyStats',
      subtitulo: getMatchReportFilterSummary(matchReport),
      corpo: `
        ${blocoMetricas([
          { rotulo: 'Quem ganhou mais', valor: matchReport.melhorTime?.nome || 'Sem dados', destaque: true },
          { rotulo: 'Vitorias', valor: matchReport.melhorTime?.vitorias || 0 },
          { rotulo: 'Total partidas', valor: matchReport.resumo.totalPartidas || 0 },
          { rotulo: 'Finalizadas', valor: matchReport.resumo.finalizadas || 0 },
          { rotulo: 'Agendadas', valor: matchReport.resumo.agendadas || 0 },
          { rotulo: 'Sets disputados', valor: matchReport.resumo.totalSetsDisputados || 0 },
          { rotulo: 'Media sets/partida', valor: matchReport.resumo.mediaSetsPorPartida || 0 },
          { rotulo: 'Total times', valor: matchReport.resumo.totalTimes || 0 },
        ])}
        ${blocoTabela({
          titulo: 'Desempenho por time',
          colunas: [
            { rotulo: '#', center: true },
            'Time',
            { rotulo: 'Jogos', center: true },
            { rotulo: 'V', center: true },
            { rotulo: 'D', center: true },
            { rotulo: 'Taxa', center: true },
            { rotulo: 'Saldo', center: true },
          ],
          linhas: linhasTimes,
          vazio: 'Nenhum time encontrado.',
        })}
        ${blocoTabela({
          titulo: 'Partidas',
          colunas: [
            'Data',
            'Torneio',
            'Partida',
            'Tipo',
            'Local',
            { rotulo: 'Status', center: true },
            { rotulo: 'Placar', center: true },
            { rotulo: 'Sets', center: true },
            'Vencedor',
          ],
          linhas: linhasPartidas,
          vazio: 'Nenhuma partida encontrada.',
        })}
      `,
    });
  };

  const saveMatchReportPdf = async () => {
    if (!matchReport) {
      return;
    }

    setMatchReportPdfSaving(true);

    try {
      const result = await salvarRelatorioPdf({
        nomeArquivo: nomeArquivoRelatorio('relatorio', 'partidas'),
        html: buildMatchReportHtml(),
      });

      if (result?.success) {
        showToast('success', 'Relatorio de partidas salvo em PDF.');
      }
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel salvar o relatorio de partidas em PDF.');
    } finally {
      setMatchReportPdfSaving(false);
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

      {/*
        `flex-wrap` + `shrink-0` na marca: sem isso o bloco do logo encolhia, o
        texto "VolleyStats" vazava da caixa dele e os botoes do menu - que vem
        depois no DOM - eram pintados por cima do vazamento.
      */}
      <header className="bg-white border-b border-gray-100 px-8 py-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 sticky top-0 z-50">
        <div className="flex items-center gap-4 shrink-0">
          <img src={vsLogo} alt="VolleyStats logo" className="size-12 rounded-full flex items-center justify-center shadow-lg shadow-red-100" />
          <h1 className="text-3xl font-black text-[#DC2626] tracking-tighter uppercase italic whitespace-nowrap">VolleyStats</h1>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-3">
          <button 
            onClick={() => navigate('/categorias')}
            className={BOTAO_MENU_PADRAO}>
             Categorias
          </button>
          <button
            onClick={() => navigate('/ginasios')}
            className={BOTAO_MENU_PADRAO}
          >
            Ginasios
          </button>
          <button
            onClick={() => navigate('/times')}
            className={BOTAO_MENU_PADRAO}
          >
            Times
          </button>
          <button 
            onClick={handleImportarExcel}
            disabled={isReadingExcel}
            className={isReadingExcel ? BOTAO_MENU_OCUPADO : BOTAO_MENU_PADRAO}
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
          <button
            type="button"
            onClick={abrirHistoricoExcel}
            disabled={historicoExcelLoading}
            className={historicoExcelLoading ? BOTAO_MENU_OCUPADO : BOTAO_MENU_PADRAO}
          >
            {historicoExcelLoading ? 'Carregando...' : 'Historico'}
          </button>
          <button className={BOTAO_MENU_PADRAO}>
            Exportar
          </button>

          <button
            type="button"
            onClick={openGeneralTournamentReport}
            disabled={generalTournamentReportLoading}
            className={`${BOTAO_MENU} bg-black text-white border-black hover:bg-neutral-800 disabled:bg-gray-400 disabled:border-gray-400`}
          >
            {generalTournamentReportLoading ? 'Emitindo...' : 'Relatorio Torneios'}
          </button>

          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest whitespace-nowrap transition-all ${
              isEditing
                ? 'bg-[#000000] text-white shadow-lg shadow-gray-300'
                : 'bg-white border-2 border-[#000000] text-[#000000] hover:bg-[#000000] hover:text-white'
            }`}
          >
            {isEditing ? 'Concluir' : 'Gerenciar Torneios'}
          </button>
        </nav>
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
          <PlayerView
            onOpenMatchReport={openMatchReport}
            matchReportLoading={matchReportLoading}
          />
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

      {matchReportOpen && matchReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-black">
            <div className="bg-black px-7 py-5 border-b-4 border-red-600 flex justify-between items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">VolleyStats</p>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Relatorio Partidas</h2>
                <p className="text-sm font-semibold text-gray-300">
                  {getMatchReportFilterSummary(matchReport)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMatchReport}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-3xl font-light p-2"
              >
                ×
              </button>
            </div>

            <div className="p-7 space-y-8">
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Filtros do Relatorio</p>
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">Filtrar partidas</h3>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    Por torneio, data da partida e time
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Torneio</label>
                    <select
                      name="torneioId"
                      value={matchReportFilters.torneioId}
                      onChange={handleMatchReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os torneios</option>
                      {tournaments.map((torneio) => (
                        <option key={torneio.id} value={torneio.id}>{torneio.name || torneio.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Data da Partida</label>
                    <input
                      type="date"
                      name="dataPartida"
                      value={matchReportFilters.dataPartida}
                      onChange={handleMatchReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Time</label>
                    <select
                      name="timeId"
                      value={matchReportFilters.timeId}
                      onChange={handleMatchReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os times</option>
                      {timesCadastrados.map((time) => (
                        <option key={time.id} value={time.id}>{time.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => openMatchReport(matchReportFilters)}
                      disabled={matchReportLoading}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-red-700 disabled:bg-red-300"
                    >
                      {matchReportLoading ? 'Filtrando...' : 'Aplicar'}
                    </button>
                    <button
                      type="button"
                      onClick={clearMatchReportFilters}
                      disabled={matchReportLoading}
                      className="flex-1 rounded-xl bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-neutral-800 disabled:bg-gray-400"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-black text-white border-black p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-400">Quem ganhou mais</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.melhorTime?.nome || 'Sem dados'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Vitorias</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.melhorTime?.vitorias || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Total de partidas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.totalPartidas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Finalizadas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.finalizadas || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Agendadas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.agendadas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Sets disputados</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.totalSetsDisputados || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Media sets/partida</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.mediaSetsPorPartida || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Times</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{matchReport.resumo.totalTimes || 0}</p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Desempenho por Time</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-100">{matchReport.times.length} times</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Time</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Jogos</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">V</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">D</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Taxa</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchReport.times.length > 0 ? matchReport.times.map((time, index) => (
                        <tr key={time.id || time.nome} className="border-b border-gray-100 hover:bg-red-50/50">
                          <td className="px-4 py-3 text-center font-black text-red-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-black text-black">{time.nome}</td>
                          <td className="px-4 py-3 text-center font-bold">{time.jogos}</td>
                          <td className="px-4 py-3 text-center font-bold">{time.vitorias}</td>
                          <td className="px-4 py-3 text-center font-bold">{time.derrotas}</td>
                          <td className="px-4 py-3 text-center font-bold">{time.taxaVitoria}%</td>
                          <td className="px-4 py-3 text-center font-bold">{time.saldoSets}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-sm font-bold text-gray-500">Nenhum time encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                <div className="bg-black px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Partidas</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-300">{matchReport.jogos.length} jogos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1240px] bg-white">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Data</th>
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Torneio</th>
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Partida</th>
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Tipo</th>
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Local</th>
                        <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Status</th>
                        <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Placar</th>
                        <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Sets</th>
                        <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Vencedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchReport.jogos.length > 0 ? matchReport.jogos.map((jogo) => (
                        <tr key={jogo.id} className="border-b border-gray-100 hover:bg-red-50/50">
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{formatDateBR(jogo.dataPartida)}</td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{jogo.torneioNome || 'Sem torneio'}</td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-black">{jogo.time1Nome || 'Time 1'} x {jogo.time2Nome || 'Time 2'}</p>
                            <p className="text-xs font-bold text-gray-500">{jogo.nome || 'Partida'}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{jogo.tipo || 'Sem tipo'}</td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{jogo.ginasioNome || 'Local nao definido'}</td>
                          <td className="px-5 py-4 text-center font-bold">{jogo.status}</td>
                          <td className="px-5 py-4 text-center text-lg font-black text-red-600">{jogo.placar}</td>
                          <td className="px-5 py-4 text-center font-bold">{jogo.totalSets || 0}</td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{jogo.vencedor}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="9" className="px-5 py-10 text-center text-sm font-bold text-gray-500">Nenhuma partida encontrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={saveMatchReportPdf}
                  disabled={matchReportPdfSaving}
                  className="px-6 py-3 font-black text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors uppercase tracking-widest text-xs"
                >
                  {matchReportPdfSaving ? 'Salvando...' : 'Salvar como PDF'}
                </button>
                <button
                  type="button"
                  onClick={closeMatchReport}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {generalTournamentReportOpen && generalTournamentReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-black">
            <div className="bg-black px-7 py-5 border-b-4 border-red-600 flex justify-between items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">VolleyStats</p>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Relatorio Geral de Torneios</h2>
                <p className="text-sm font-semibold text-gray-300">
                  Consolidado de torneios, times campeoes e destaque do time principal
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-300">
                  {getGeneralTournamentReportFilterSummary(generalTournamentReport)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeGeneralTournamentReport}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-3xl font-light p-2"
              >
                ×
              </button>
            </div>

            <div className="p-7 space-y-8">
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Filtros do Relatorio</p>
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">Filtrar torneios</h3>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    Por data, tipo e time
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Data de inicio</label>
                    <input
                      type="date"
                      name="dataInicio"
                      value={generalTournamentReportFilters.dataInicio}
                      onChange={handleGeneralTournamentReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Data de fim</label>
                    <input
                      type="date"
                      name="dataFim"
                      value={generalTournamentReportFilters.dataFim}
                      onChange={handleGeneralTournamentReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Tipo de Torneio</label>
                    <select
                      name="tipoTorneio"
                      value={generalTournamentReportFilters.tipoTorneio}
                      onChange={handleGeneralTournamentReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os tipos</option>
                      {TOURNAMENT_TYPES.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Time</label>
                    <select
                      name="timeId"
                      value={generalTournamentReportFilters.timeId}
                      onChange={handleGeneralTournamentReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os times</option>
                      {(generalTournamentReport.opcoes?.times || timesCadastrados).map((time) => (
                        <option key={time.id} value={time.id}>{time.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => openGeneralTournamentReport(generalTournamentReportFilters)}
                      disabled={generalTournamentReportLoading}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-red-700 disabled:bg-red-300"
                    >
                      {generalTournamentReportLoading ? 'Filtrando...' : 'Aplicar'}
                    </button>
                    <button
                      type="button"
                      onClick={clearGeneralTournamentReportFilters}
                      disabled={generalTournamentReportLoading}
                      className="flex-1 rounded-xl bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-neutral-800 disabled:bg-gray-400"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-black text-white border-black p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-400">Time que ganhou mais</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.destaques.timeMaisVitorias?.nome || 'Sem dados'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Vitorias</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.destaques.timeMaisVitorias?.vitorias || 0}</p>
                </div>
                <div className="rounded-xl border bg-black text-white border-black p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-400">Melhor jogador do time principal</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.destaques.melhorJogadorTimePrincipal?.nome || 'Sem scout'}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Aproveitamento (pontos)</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.destaques.melhorJogadorTimePrincipal?.aproveitamentoPontos || 0}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Torneios</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.resumo.totalTorneios}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Partidas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.resumo.totalPartidas}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Sets disputados</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.resumo.totalSets}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Media partidas/torneio</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{generalTournamentReport.resumo.mediaPartidasPorTorneio}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Time mais presente</p>
                  <p className="mt-2 text-xl font-black text-black">{generalTournamentReport.destaques.timeMaisParticipou?.nome || 'Sem dados'}</p>
                  <p className="mt-1 text-sm font-bold text-gray-600">{generalTournamentReport.destaques.timeMaisParticipou?.torneios || 0} torneios</p>
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Torneio com mais partidas</p>
                  <p className="mt-2 text-xl font-black text-black">{generalTournamentReport.destaques.torneioMaisPartidas?.nome || 'Sem dados'}</p>
                  <p className="mt-1 text-sm font-bold text-gray-600">{generalTournamentReport.destaques.torneioMaisPartidas?.partidas || 0} partidas</p>
                </div>
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Time principal</p>
                  <p className="mt-2 text-xl font-black text-black">{generalTournamentReport.destaques.timePrincipal?.nome || 'Sem dados'}</p>
                  <p className="mt-1 text-sm font-bold text-gray-600">{generalTournamentReport.jogadoresTimePrincipal.length} jogadores ranqueados</p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Torneios</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-100">{generalTournamentReport.torneios.length} torneios</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Torneio</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Periodo</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Partidas</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Final.</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Times</th>
                        <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Sets</th>
                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Campeao estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalTournamentReport.torneios.length > 0 ? generalTournamentReport.torneios.map((torneio) => (
                        <tr key={torneio.id} className="border-b border-gray-100 hover:bg-red-50/50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-black text-black">{torneio.nome}</p>
                            <p className="text-xs font-bold text-gray-500">{torneio.tipoNome}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{formatDateBR(torneio.inicio)} - {formatDateBR(torneio.termino)}</td>
                          <td className="px-4 py-3 text-center font-bold">{torneio.partidas}</td>
                          <td className="px-4 py-3 text-center font-bold">{torneio.finalizadas}</td>
                          <td className="px-4 py-3 text-center font-bold">{torneio.times}</td>
                          <td className="px-4 py-3 text-center font-bold">{torneio.setsDisputados}</td>
                          <td className="px-4 py-3 text-sm font-black text-black">{torneio.campeao?.nome || 'Sem campeao'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-sm font-bold text-gray-500">Nenhum torneio encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                  <div className="bg-black px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Ranking Geral dos Times</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] bg-white">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700">
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">#</th>
                          <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Time</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Torneios</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Jogos</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">V</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">D</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Taxa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generalTournamentReport.times.slice(0, 10).map((time, index) => (
                          <tr key={time.id || time.nome} className="border-b border-gray-100 hover:bg-red-50/50">
                            <td className="px-4 py-3 text-center font-black text-red-600">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-black text-black">{time.nome}</td>
                            <td className="px-4 py-3 text-center font-bold">{time.torneios}</td>
                            <td className="px-4 py-3 text-center font-bold">{time.jogos}</td>
                            <td className="px-4 py-3 text-center font-bold">{time.vitorias}</td>
                            <td className="px-4 py-3 text-center font-bold">{time.derrotas}</td>
                            <td className="px-4 py-3 text-center font-bold">{time.taxaVitoria}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
                  <div className="bg-red-600 px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Jogadores do Time Principal</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] bg-white">
                      <thead>
                        <tr className="bg-black text-white">
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">#</th>
                          <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest">Jogador</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Torneios</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Partidas</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Acoes</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">Pts</th>
                          <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest">A%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generalTournamentReport.jogadoresTimePrincipal.length > 0 ? generalTournamentReport.jogadoresTimePrincipal.slice(0, 10).map((jogador, index) => (
                          <tr key={jogador.id} className="border-b border-gray-100 hover:bg-red-50/50">
                            <td className="px-4 py-3 text-center font-black text-red-600">{index + 1}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-black text-black">#{jogador.numCamisa || '--'} - {jogador.nome}</p>
                              <p className="text-xs font-bold text-gray-500">{jogador.posicaoNome || 'Sem posicao'}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{jogador.torneios}</td>
                            <td className="px-4 py-3 text-center font-bold">{jogador.partidas}</td>
                            <td className="px-4 py-3 text-center font-bold">{jogador.totalAcoes}</td>
                            <td className="px-4 py-3 text-center font-bold">{jogador.acoesPonto}</td>
                            <td className="px-4 py-3 text-center font-bold">{jogador.aproveitamentoPontos}%</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-10 text-center text-sm font-bold text-gray-500">Nenhum jogador do time principal encontrado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={saveGeneralTournamentReportPdf}
                  disabled={generalTournamentReportPdfSaving}
                  className="px-6 py-3 font-black text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors uppercase tracking-widest text-xs"
                >
                  {generalTournamentReportPdfSaving ? 'Salvando...' : 'Salvar como PDF'}
                </button>
                <button
                  type="button"
                  onClick={closeGeneralTournamentReport}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

    {historicoExcelOpen && (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh]">
          <div className="px-7 pt-6 pb-5 border-b border-zinc-100 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl text-zinc-900 font-black uppercase tracking-tighter">Historico de Importacoes</h2>
              <p className="text-sm font-semibold text-zinc-400 mt-2">Arquivos Excel importados no sistema.</p>
            </div>
            <button
              type="button"
              onClick={carregarHistoricoExcel}
              disabled={historicoExcelLoading}
              className="px-4 py-2 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 text-zinc-700 text-[11px] font-black uppercase tracking-widest"
            >
              {historicoExcelLoading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          <div className="p-7 overflow-auto flex-1">
            {historicoExcelLoading ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm font-bold text-zinc-400">
                Carregando historico...
              </div>
            ) : historicoExcel.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-lg font-black text-zinc-900 uppercase tracking-tight">Nenhuma importacao encontrada</p>
                <p className="text-sm font-semibold text-zinc-400 mt-2">Quando um Excel for importado, ele aparecera aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">Arquivo</th>
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest">Data</th>
                      <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-right">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoExcel.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-zinc-900">{item.nomeArquivo || 'Arquivo sem nome'}</p>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Importacao #{item.id}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-zinc-600">
                          {formatDateTimeBR(item.dataImportacao)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => reverterImportacaoExcel(item.id)}
                            disabled={historicoExcelReverting === item.id}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-black uppercase tracking-widest"
                          >
                            {historicoExcelReverting === item.id ? 'Revertendo...' : 'Reverter'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-zinc-100 flex justify-end">
            <button
              type="button"
              onClick={fecharHistoricoExcel}
              className="px-6 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-[11px] font-black uppercase tracking-widest"
            >
              Fechar
            </button>
          </div>
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
