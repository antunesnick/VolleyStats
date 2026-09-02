import React, { useEffect, useMemo, useState } from 'react';
import GerenciarPartidas from '../Partida/GerenciarPartidas';
import {
  blocoDestaques,
  blocoMetricas,
  blocoTabela,
  escapeHtml,
  montarDocumento,
  nomeArquivoRelatorio,
  salvarRelatorioPdf,
} from '../../utils/relatorioPdf';

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

const normalizeMatchStatus = (status) => {
  const value = String(status || '').toUpperCase();

  if (value === 'FINALIZADA' || value === 'FINALIZADO' || value === 'FINISHED') {
    return 'finished';
  }

  if (value === 'EM_ANDAMENTO' || value === 'AO_VIVO' || value === 'LIVE') {
    return 'live';
  }

  return 'scheduled';
};

const normalizeScoreValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildTeamId = (rawId, name) => {
  if (rawId !== null && rawId !== undefined && rawId !== '') {
    return String(rawId);
  }

  if (name) {
    return `name:${name}`;
  }

  return null;
};

const normalizeMatches = (matches = []) => {
  return matches.map((match) => {
    const team1Name = match.time1Nome || (match.time1 ? `Time ${match.time1}` : 'Time 1');
    const team2Name = match.time2Nome || (match.time2 ? `Time ${match.time2}` : 'Time 2');

    return {
      id: String(match.id),
      team1Id: buildTeamId(match.time1, team1Name),
      team2Id: buildTeamId(match.time2, team2Name),
      team1Name,
      team2Name,
      score1: normalizeScoreValue(match.pontosTime1),
      score2: normalizeScoreValue(match.pontosTime2),
      status: normalizeMatchStatus(match.status),
      phase: match.fase || match.tipo || '',
      isExternal: Boolean(match.externa),
    };
  });
};

const buildTeamsFromMatches = (matches = []) => {
  const map = new Map();

  matches.forEach((match) => {
    if (match.team1Id && !map.has(match.team1Id)) {
      map.set(match.team1Id, { id: match.team1Id, name: match.team1Name });
    }

    if (match.team2Id && !map.has(match.team2Id)) {
      map.set(match.team2Id, { id: match.team2Id, name: match.team2Name });
    }
  });

  return Array.from(map.values());
};

const buildStandings = (teams = [], matches = []) => {
  const statsMap = new Map();

  teams.forEach((team) => {
    statsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      played: 0,
      won: 0,
      lost: 0,
      draws: 0,
      setsWon: 0,
      setsLost: 0,
      points: 0,
      setRatio: 0,
    });
  });

  matches.forEach((match) => {
    if (match.status !== 'finished' || !match.team1Id || !match.team2Id) {
      return;
    }

    if (!statsMap.has(match.team1Id)) {
      statsMap.set(match.team1Id, {
        teamId: match.team1Id,
        teamName: match.team1Name,
        played: 0,
        won: 0,
        lost: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0,
        setRatio: 0,
      });
    }

    if (!statsMap.has(match.team2Id)) {
      statsMap.set(match.team2Id, {
        teamId: match.team2Id,
        teamName: match.team2Name,
        played: 0,
        won: 0,
        lost: 0,
        draws: 0,
        setsWon: 0,
        setsLost: 0,
        points: 0,
        setRatio: 0,
      });
    }

    const team1 = statsMap.get(match.team1Id);
    const team2 = statsMap.get(match.team2Id);

    team1.played += 1;
    team2.played += 1;

    team1.setsWon += match.score1;
    team1.setsLost += match.score2;
    team2.setsWon += match.score2;
    team2.setsLost += match.score1;

    if (match.score1 > match.score2) {
      team1.won += 1;
      team2.lost += 1;
    } else if (match.score2 > match.score1) {
      team2.won += 1;
      team1.lost += 1;
    } else {
      team1.draws += 1;
      team2.draws += 1;
    }
  });

  const standings = Array.from(statsMap.values()).map((team) => {
    const points = team.won * 3 + team.draws;
    const setRatio = team.setsLost === 0 ? team.setsWon : team.setsWon / team.setsLost;

    return {
      ...team,
      points,
      setRatio,
    };
  });

  return standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    if (b.setRatio !== a.setRatio) {
      return b.setRatio - a.setRatio;
    }

    return a.teamName.localeCompare(b.teamName);
  });
};

const getPhaseKey = (phase) => {
  const value = String(phase || '').toLowerCase();

  if (value.includes('oitavas')) {
    return 'Oitavas';
  }

  if (value.includes('quartas')) {
    return 'Quartas';
  }

  if (value.includes('semi')) {
    return 'Semifinal';
  }

  if (value.includes('final')) {
    return 'Final';
  }

  return null;
};

const getRoundIndexFromPhase = (phaseKey, totalRounds) => {
  const phaseOffsets = {
    Final: 1,
    Semifinal: 2,
    Quartas: 3,
    Oitavas: 4,
  };

  const offset = phaseOffsets[phaseKey];
  if (!offset) {
    return 0;
  }

  const roundIndex = totalRounds - offset;
  return roundIndex < 0 ? 0 : roundIndex;
};

const buildBracketRounds = (teams = [], matches = []) => {
  if (teams.length === 0) {
    return [];
  }

  const totalRounds = Math.max(1, Math.ceil(Math.log2(teams.length)));
  const rounds = Array.from({ length: totalRounds }, () => []);

  matches.forEach((match) => {
    const phaseKey = getPhaseKey(match.phase);
    if (!phaseKey) {
      return;
    }

    const roundIndex = getRoundIndexFromPhase(phaseKey, totalRounds);
    if (roundIndex < 0 || roundIndex >= totalRounds) {
      return;
    }

    const winner = match.status === 'finished'
      ? match.score1 > match.score2
        ? match.team1Name
        : match.team2Name
      : undefined;

    rounds[roundIndex].push({
      team1: match.team1Name,
      team2: match.team2Name,
      score: `${match.score1}-${match.score2}`,
      winner,
      status: match.status,
    });
  });

  const firstRoundMatches = Math.pow(2, totalRounds - 1);
  while (rounds[0].length < firstRoundMatches) {
    const index = rounds[0].length;
    rounds[0].push({
      team1: teams[index * 2]?.name || 'TBD',
      team2: teams[index * 2 + 1]?.name || 'TBD',
      score: '0-0',
      status: 'scheduled',
    });
  }

  for (let roundIndex = 1; roundIndex < totalRounds; roundIndex += 1) {
    const expectedMatches = Math.pow(2, totalRounds - roundIndex - 1);
    while (rounds[roundIndex].length < expectedMatches) {
      rounds[roundIndex].push({
        team1: 'TBD',
        team2: 'TBD',
        score: '0-0',
        status: 'scheduled',
      });
    }
  }

  return rounds;
};

const ReportMetric = ({ label, value, featured = false }) => (
  <div className={`${featured ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'} rounded-xl border p-5 shadow-sm`}>
    <p className={`text-[11px] font-black uppercase tracking-widest ${featured ? 'text-red-400' : 'text-gray-500'}`}>
      {label}
    </p>
    <p className={`mt-2 text-2xl font-black tracking-tight ${featured ? 'text-white' : 'text-black'}`}>
      {value}
    </p>
  </div>
);

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
  const [matchReport, setMatchReport] = useState(null);
  const [matchReportOpen, setMatchReportOpen] = useState(false);
  const [matchReportLoading, setMatchReportLoading] = useState(false);
  const [matchReportPdfSaving, setMatchReportPdfSaving] = useState(false);
  const [matchReportFilters, setMatchReportFilters] = useState({
    timeId: '',
    fase: '',
    dataPartida: '',
  });

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

    return dbMatches || [];
  }, [dbMatches, tournament]);

  const normalizedMatches = useMemo(() => normalizeMatches(dbMatches), [dbMatches]);
  const tournamentTeams = useMemo(() => buildTeamsFromMatches(normalizedMatches), [normalizedMatches]);
  const standings = useMemo(() => buildStandings(tournamentTeams, normalizedMatches), [tournamentTeams, normalizedMatches]);
  const bracketRounds = useMemo(() => buildBracketRounds(tournamentTeams, normalizedMatches), [tournamentTeams, normalizedMatches]);

  const tournamentType = Number(tournament?.type);
  const canShowStandings = tournamentType === 1 || tournamentType === 3;
  const canShowBracket = tournamentType === 2 || tournamentType === 3;
  const getTournamentTypeText = (type) => getTournamentTypeLabel(TOURNAMENT_TYPES, type);
  const viewModeLabel = viewMode === 'standings' ? 'CLASSIFICAÇÃO' : viewMode === 'bracket' ? 'CHAVEAMENTO' : 'PARTIDAS';

  const handleToggleViewMode = (mode) => {
    setViewMode((prev) => (prev === mode ? 'matches' : mode));
  };

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

  const formatDateBR = (value) => {
    if (!value) return '--/--/----';
    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };


  const getMatchReportFilterSummary = (report = matchReport) => {
    const filtros = report?.filtrosAplicados || {};
    return `Filtros: Time: ${filtros.timeNome || 'Todos'} | Fase: ${filtros.fase || 'Todas'} | Data: ${filtros.dataPartida ? formatDateBR(filtros.dataPartida) : 'Todas'}`;
  };

  const handleMatchReportFilterChange = (event) => {
    const { name, value } = event.target;
    setMatchReportFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearMatchReportFilters = () => {
    const filtrosLimpos = { timeId: '', fase: '', dataPartida: '' };
    setMatchReportFilters(filtrosLimpos);
    openMatchReport(filtrosLimpos);
  };

  const openMatchReport = async (filters = matchReportFilters) => {
    const filtrosRelatorio = filters?.target ? matchReportFilters : filters;
    if (!tournament) {
      return;
    }

    setMatchReportLoading(true);

    try {
      const report = await window.reportAPI.torneioRelatorio(tournament.id, filtrosRelatorio);
      setMatchReport(report);
      setMatchReportOpen(true);
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel emitir o relatorio do torneio.');
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
      return montarDocumento({ titulo: 'Relatorio do Torneio', eyebrow: 'VolleyStats' });
    }

    const { resumo = {}, destaques = {}, torneio = {} } = matchReport;

    const descreverJogo = (jogo, semDados = 'Sem dados') => (jogo
      ? `${jogo.time1Nome} x ${jogo.time2Nome} (${jogo.placar})`
      : semDados);

    const rowsTimes = (matchReport.times || []).map((time, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(time.nome)}</strong></td>
        <td class="center">${time.jogos}</td>
        <td class="center">${time.pontosClassificacao || 0}</td>
        <td class="center">${time.vitorias}</td>
        <td class="center">${time.derrotas}</td>
        <td class="center">${time.setsGanhos}/${time.setsPerdidos}</td>
        <td class="center">${time.setRatio || 0}</td>
        <td class="center">${time.saldoSets}</td>
      </tr>
    `);

    const rowsJogadores = (matchReport.jogadores || []).map((jogador, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(jogador.nome)}</strong><span>${escapeHtml(jogador.posicaoNome || 'Sem posicao')} | Camisa ${escapeHtml(jogador.numCamisa || '--')}</span></td>
        <td class="center">${jogador.totalAcoes || 0}</td>
        <td class="center">${jogador.acoesPonto || 0}</td>
        <td class="center">${jogador.acoesNeutra || 0}</td>
        <td class="center">${jogador.acoesErro || 0}</td>
        <td class="center">${jogador.eficiencia || 0}%</td>
      </tr>
    `);

    const rowsAcoes = (matchReport.acoesPorTipo || []).map((acao) => `
      <tr>
        <td><strong>${escapeHtml(acao.tipo)}</strong></td>
        <td class="center">${acao.total || 0}</td>
        <td class="center">${acao.Ponto || 0}</td>
        <td class="center">${acao.Neutra || 0}</td>
        <td class="center">${acao.Erro || 0}</td>
      </tr>
    `);

    const rowsGinasios = (matchReport.ginasios || []).map((ginasio) => `
      <tr>
        <td><strong>${escapeHtml(ginasio.nome)}</strong><span>${escapeHtml([ginasio.cidade, ginasio.estado].filter(Boolean).join(' - ') || 'Local sem cidade')}</span></td>
        <td class="center">${ginasio.partidas || 0}</td>
        <td class="center">${ginasio.finalizadas || 0}</td>
      </tr>
    `);

    const rowsJogos = (matchReport.jogos || []).map((jogo) => `
      <tr>
        <td>${escapeHtml(formatDateBR(jogo.dataPartida))}</td>
        <td><strong>${escapeHtml(jogo.time1Nome)} x ${escapeHtml(jogo.time2Nome)}</strong><span>${escapeHtml(jogo.nome || 'Partida')}</span></td>
        <td>${escapeHtml(jogo.fase)}</td>
        <td>${escapeHtml(jogo.ginasioNome)}</td>
        <td class="center">${escapeHtml(jogo.placar)}</td>
        <td class="center">${escapeHtml(jogo.vencedor)}</td>
      </tr>
    `);

    return montarDocumento({
      titulo: 'Relatorio do Torneio',
      eyebrow: 'VolleyStats',
      subtitulo: [
        `${torneio.nome} | ${torneio.tipoNome || 'Formato nao informado'} | ${formatDateBR(torneio.inicio)} ate ${formatDateBR(torneio.termino)}`,
        getMatchReportFilterSummary(matchReport),
      ],
      corpo: `
        ${blocoMetricas([
          { rotulo: 'Lider', valor: destaques.lider?.nome || 'Sem dados', destaque: true },
          { rotulo: 'Pontos do lider', valor: destaques.lider?.pontosClassificacao || 0 },
          { rotulo: 'Melhor jogador', valor: destaques.melhorJogador?.nome || 'Sem scout', destaque: true },
          { rotulo: 'Aproveitamento (pontos)', valor: `${resumo.aproveitamentoPontos || 0}%` },
          { rotulo: 'Total partidas', valor: resumo.totalPartidas || 0 },
          { rotulo: 'Finalizadas', valor: resumo.finalizadas || 0 },
          { rotulo: 'Agendadas', valor: resumo.agendadas || 0 },
          { rotulo: 'Times', valor: resumo.totalTimes || 0 },
          { rotulo: 'Sets disputados', valor: resumo.totalSets || 0 },
          { rotulo: 'Media sets/jogo', valor: resumo.mediaSetsPorPartida || 0 },
          { rotulo: 'Jogos 5 sets', valor: resumo.jogosCincoSets || 0 },
          { rotulo: 'Acoes registradas', valor: resumo.totalAcoes || 0 },
        ])}
        ${blocoDestaques([
          { rotulo: 'Jogo mais disputado', valor: descreverJogo(destaques.jogoMaisDisputado) },
          { rotulo: 'Maior diferenca', valor: descreverJogo(destaques.maiorDiferenca) },
          {
            rotulo: 'Fundamento mais registrado',
            valor: destaques.fundamentoMaisRegistrado
              ? `${destaques.fundamentoMaisRegistrado.tipo} (${destaques.fundamentoMaisRegistrado.total})`
              : 'Sem scout',
          },
        ])}
        ${blocoTabela({
          titulo: 'Classificacao dos times',
          colunas: [
            { rotulo: '#', center: true },
            'Time',
            { rotulo: 'J', center: true },
            { rotulo: 'Pts', center: true },
            { rotulo: 'V', center: true },
            { rotulo: 'D', center: true },
            { rotulo: 'Sets', center: true },
            { rotulo: 'Ratio', center: true },
            { rotulo: 'Saldo', center: true },
          ],
          linhas: rowsTimes,
          vazio: 'Sem times no torneio.',
        })}
        ${blocoTabela({
          titulo: 'Top jogadores',
          colunas: [
            { rotulo: '#', center: true },
            'Jogador',
            { rotulo: 'Acoes', center: true },
            { rotulo: 'Pts', center: true },
            { rotulo: 'Neutras', center: true },
            { rotulo: 'Erros', center: true },
            { rotulo: 'Eficiencia', center: true },
          ],
          linhas: rowsJogadores,
          vazio: 'Sem scouts registrados.',
        })}
        ${blocoTabela({
          titulo: 'Fundamentos e qualidade',
          colunas: [
            'Fundamento',
            { rotulo: 'Total', center: true },
            { rotulo: 'Pts', center: true },
            { rotulo: 'Neutras', center: true },
            { rotulo: 'Erros', center: true },
          ],
          linhas: rowsAcoes,
          vazio: 'Sem acoes registradas.',
        })}
        ${blocoTabela({
          titulo: 'Locais',
          colunas: ['Ginasio', { rotulo: 'Partidas', center: true }, { rotulo: 'Finalizadas', center: true }],
          linhas: rowsGinasios,
          vazio: 'Sem locais registrados.',
        })}
        ${blocoTabela({
          titulo: 'Partidas',
          colunas: [
            'Data',
            'Jogo',
            'Fase',
            'Local',
            { rotulo: 'Placar', center: true },
            { rotulo: 'Vencedor', center: true },
          ],
          linhas: rowsJogos,
          vazio: 'Sem partidas no torneio.',
        })}
      `,
    });
  };

  const saveMatchReportPdf = async () => {
    if (!matchReport) return;

    setMatchReportPdfSaving(true);

    try {
      const result = await salvarRelatorioPdf({
        nomeArquivo: nomeArquivoRelatorio('relatorio', 'torneio', matchReport.torneio.nome),
        html: buildMatchReportHtml(),
      });

      if (result?.success) {
        showToast('success', 'Relatorio do torneio salvo em PDF.');
      }
    } catch (error) {
      showToast('error', error?.message || 'Nao foi possivel salvar o PDF.');
    } finally {
      setMatchReportPdfSaving(false);
    }
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

      {/* Mesmo cuidado do header da Home: a fileira de botoes quebra para
          baixo em vez de passar por cima do nome do torneio. */}
      <header className="bg-white border-b border-gray-100 px-8 py-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 sticky top-0 z-50">
        <div className="flex items-center gap-6 min-w-0">
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

          <div className="min-w-0">
            <h1 className="text-3xl font-black text-[#DC2626] tracking-tighter uppercase italic leading-none truncate">
              {tournament ? tournament.name : 'Torneio'}
            </h1>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mt-1">
              {tournament ? `${getTournamentTypeText(tournament.type)} • ${viewModeLabel}` : 'Carregando...'}

            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={openMatchReport}
            disabled={matchReportLoading || !tournament}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest whitespace-nowrap bg-white border border-gray-200 text-gray-700 hover:border-[#DC2626] hover:text-[#DC2626] hover:bg-red-50 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {matchReportLoading ? 'Emitindo...' : 'Relatorio do Torneio'}
          </button>

          <button
            onClick={handleToggleManage}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-[13px] uppercase tracking-widest whitespace-nowrap transition-all ${
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
                className="px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              >
                Editar Torneio
              </button>

              <button
                onClick={handleDeleteTournament}
                className="px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Excluir Torneio
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="max-w-400 mx-auto px-8 pt-12 space-y-16">
        {isLoading || !tournament ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500 font-semibold">Carregando torneio...</div>
        ) : (
          <>
            <section className="space-y-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">
                    {viewMode === 'standings' ? 'Classificação' : viewMode === 'bracket' ? 'Chaveamento' : 'Jogos'}
                  </h2>
                  <div className="h-px w-24 bg-[#DC2626] opacity-30 mt-2" />
                  <span className="text-[12px] font-black text-gray-300 mt-2 uppercase tracking-[0.2em]">
                    {viewMode === 'standings'
                      ? 'Tabela de Classificação'
                      : viewMode === 'bracket'
                        ? 'Bracket de Mata-Mata'
                        : 'Tournament Schedule'}
                  </span>
                </div>
                <div className="flex gap-3">
                  {canShowStandings && (
                    <button
                      onClick={() => handleToggleViewMode('standings')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                        viewMode === 'standings'
                          ? 'bg-[#000000] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
                      </svg>
                      Classificação
                    </button>
                  )}

                  {canShowBracket && (
                    <button
                      onClick={() => handleToggleViewMode('bracket')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                        viewMode === 'bracket'
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M6 10h12M10 14h4M12 18h0" />
                      </svg>
                      Chaveamento
                    </button>
                  )}
                </div>
              </div>

              {viewMode === 'matches' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <GerenciarPartidas
                    tournamentId={tournamentId}
                    isEmbedded={true}
                    onMatchesUpdated={setDbMatches}
                  />
                </div>
              )}

              {viewMode === 'standings' && <StandingsBoard standings={standings} />}

              {viewMode === 'bracket' && (
                <BracketView rounds={bracketRounds} teams={tournamentTeams} />
              )}
            </section>
          </>
        )}
      </main>

      {matchReportOpen && matchReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-black">
            <div className="bg-black px-7 py-5 border-b-4 border-red-600 flex justify-between items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">VolleyStats</p>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">Relatorio do Torneio</h2>
                <p className="text-sm font-semibold text-gray-300">
                  {matchReport.torneio.nome} - {getMatchReportFilterSummary(matchReport)}
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
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">Filtrar torneio</h3>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    Por time, fase e data das partidas
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Time</label>
                    <select
                      name="timeId"
                      value={matchReportFilters.timeId}
                      onChange={handleMatchReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os times</option>
                      {(matchReport.opcoes?.times || []).map((time) => (
                        <option key={time.id} value={time.id}>{time.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Fase</label>
                    <select
                      name="fase"
                      value={matchReportFilters.fase}
                      onChange={handleMatchReportFilterChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todas as fases</option>
                      {(matchReport.opcoes?.fases || []).map((fase) => (
                        <option key={fase} value={fase}>{fase}</option>
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
                <ReportMetric label="Lider" value={matchReport.destaques?.lider?.nome || 'Sem dados'} featured />
                <ReportMetric label="Pontos do lider" value={matchReport.destaques?.lider?.pontosClassificacao || 0} />
                <ReportMetric label="Melhor jogador" value={matchReport.destaques?.melhorJogador?.nome || 'Sem scout'} featured />
                <ReportMetric label="Aproveitamento (pontos)" value={`${matchReport.resumo.aproveitamentoPontos || 0}%`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportMetric label="Total de partidas" value={matchReport.resumo.totalPartidas} />
                <ReportMetric label="Finalizadas" value={matchReport.resumo.finalizadas} />
                <ReportMetric label="Agendadas" value={matchReport.resumo.agendadas} />
                <ReportMetric label="Times no torneio" value={matchReport.resumo.totalTimes || 0} />
                <ReportMetric label="Sets disputados" value={matchReport.resumo.totalSets || 0} />
                <ReportMetric label="Media sets/jogo" value={matchReport.resumo.mediaSetsPorPartida || 0} />
                <ReportMetric label="Jogos 5 sets" value={matchReport.resumo.jogosCincoSets || 0} />
                <ReportMetric label="Acoes registradas" value={matchReport.resumo.totalAcoes || 0} />
              </div>

              {matchReport.melhorJogador && (
                <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2">Resumo do melhor jogador</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm font-bold text-gray-700">
                    <span>Camisa: #{matchReport.melhorJogador.numCamisa || '--'}</span>
                    <span>Total ações: {matchReport.melhorJogador.totalAcoes || 0}</span>
                    <span>Saque: {matchReport.melhorJogador.saques || 0}</span>
                    <span>Ataque: {matchReport.melhorJogador.ataques || 0}</span>
                    <span>Bloqueio: {matchReport.melhorJogador.bloqueios || 0}</span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-red-600 px-6 py-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Classificacao dos Times</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">#</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Time</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">J</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">V</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">D</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Sets</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Ratio</th>
                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchReport.times.length > 0 ? matchReport.times.map((time, index) => (
                        <tr key={time.nome} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                          <td className="px-4 py-3 text-center text-sm font-black text-red-600">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-black text-black">{time.nome}</td>
                          <td className="px-4 py-3 text-center font-black">{time.jogos}</td>
                          <td className="px-4 py-3 text-center font-black">{time.pontosClassificacao || 0}</td>
                          <td className="px-4 py-3 text-center font-black">{time.vitorias}</td>
                          <td className="px-4 py-3 text-center font-black">{time.derrotas}</td>
                          <td className="px-4 py-3 text-center font-black">{time.setsGanhos}/{time.setsPerdidos}</td>
                          <td className="px-4 py-3 text-center font-black">{time.setRatio || 0}</td>
                          <td className="px-4 py-3 text-center font-black">{time.saldoSets}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="9" className="px-5 py-10 text-center text-sm font-bold text-gray-500">Nenhum time com partidas neste torneio.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-red-600 px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Top Jogadores</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] bg-white">
                      <thead>
                        <tr className="bg-black text-white">
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Jogador</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Acoes</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Neutras</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Erros</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Efet.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchReport.jogadores?.length > 0 ? matchReport.jogadores.slice(0, 6).map((jogador, index) => (
                          <tr key={jogador.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-center text-sm font-black text-red-600">{index + 1}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-black text-black">{jogador.nome}</p>
                              <p className="text-xs font-semibold text-gray-500">{jogador.posicaoNome || 'Sem posicao'} - #{jogador.numCamisa || '--'}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-black">{jogador.totalAcoes || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{jogador.acoesPonto || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{jogador.acoesNeutra || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{jogador.acoesErro || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{jogador.eficiencia || 0}%</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="px-5 py-10 text-center text-sm font-bold text-gray-500">Nenhum scout registrado neste torneio.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-red-600 px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Fundamentos</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] bg-white">
                      <thead>
                        <tr className="bg-black text-white">
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Fundamento</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Total</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Neutras</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Erros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchReport.acoesPorTipo?.length > 0 ? matchReport.acoesPorTipo.map((acao) => (
                          <tr key={acao.tipo} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-black text-black">{acao.tipo}</td>
                            <td className="px-4 py-3 text-center font-black">{acao.total || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{acao.Ponto || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{acao.Neutra || 0}</td>
                            <td className="px-4 py-3 text-center font-black">{acao.Erro || 0}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="px-5 py-10 text-center text-sm font-bold text-gray-500">Nenhuma acao registrada neste torneio.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Pontuacao das Partidas</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-100">{matchReport.jogos.length} jogos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Data</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Jogo</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Fase</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Local</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Placar</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Vencedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchReport.jogos.length > 0 ? matchReport.jogos.map((jogo) => (
                        <tr key={jogo.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{formatDateBR(jogo.dataPartida)}</td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-black">{jogo.time1Nome} x {jogo.time2Nome}</p>
                            <p className="text-xs font-semibold text-gray-500">{jogo.nome || 'Partida'}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-600">{jogo.fase}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-600">{jogo.ginasioNome}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-black text-black">{jogo.placar}</span>
                          </td>
                          <td className="px-5 py-4 text-center text-sm font-black text-black">{jogo.vencedor}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-5 py-10 text-center text-sm font-bold text-gray-500">Nenhuma partida cadastrada neste torneio.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={closeMatchReport}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={saveMatchReportPdf}
                  disabled={matchReportPdfSaving}
                  className="px-6 py-3 font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors uppercase tracking-wider text-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {matchReportPdfSaving ? 'Salvando...' : 'Salvar como PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

const TrophyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 21h8m-4-4v4m-6-4h12a4 4 0 004-4V5H2v8a4 4 0 004 4zm0-12V3h12v2"
    />
  </svg>
);

const StandingsBoard = ({ standings = [] }) => {
  if (!standings.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-black uppercase tracking-widest text-sm">
          Adicione partidas finalizadas para visualizar a classificacao
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-white shadow-sm">
      <div className="bg-linear-to-r from-[#DC2626] to-[#B91C1C] px-6 py-5">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Classificacao Geral</h3>
      </div>

      <div className="overflow-x-auto bg-white p-6">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_minmax(260px,1fr)_78px_78px_78px_90px] gap-2 pb-2">
            <div />
            <div />
            {['P', 'J', 'V', 'S.S'].map((label) => (
              <div key={label} className="flex h-11 items-center justify-center rounded-md border border-gray-100 bg-gray-50 text-sm font-black uppercase tracking-widest text-gray-600">
                {label}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {standings.map((stat, index) => {
              const isQualified = index < 4;
              const setBalance = stat.setsWon - stat.setsLost;

              return (
                <div
                  key={stat.teamId}
                  className="grid grid-cols-[56px_minmax(260px,1fr)_78px_78px_78px_90px] gap-2"
                >
                  <div className={`flex h-12 items-center justify-center rounded-md text-base font-black ${isQualified ? 'bg-[#DC2626] text-white' : 'border border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {index + 1}º
                  </div>
                  <div className="flex h-12 items-center rounded-md border border-gray-100 bg-white px-4 text-sm font-black uppercase tracking-tight text-black shadow-sm">
                    {stat.teamName}
                  </div>
                  <div className="flex h-12 items-center justify-center rounded-md border border-gray-100 bg-white text-lg font-black text-black shadow-sm">
                    {stat.points}
                  </div>
                  <div className="flex h-12 items-center justify-center rounded-md border border-gray-100 bg-white text-lg font-black text-black shadow-sm">
                    {String(stat.played).padStart(2, '0')}
                  </div>
                  <div className="flex h-12 items-center justify-center rounded-md border border-gray-100 bg-white text-lg font-black text-black shadow-sm">
                    {String(stat.won).padStart(2, '0')}
                  </div>
                  <div className={`flex h-12 items-center justify-center rounded-md border border-gray-100 bg-white text-lg font-black shadow-sm ${setBalance < 0 ? 'text-[#DC2626]' : 'text-black'}`}>
                    {setBalance}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3 text-xs font-bold text-gray-500">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <span>P - Pontos</span>
              <span>J - Jogos</span>
              <span>V - Vitorias</span>
              <span>S.S - Saldo de Sets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-sm bg-[#DC2626]" />
              <span>Classificado para a proxima fase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BracketView = ({ rounds = [], teams = [] }) => {
  const getRoundName = (roundIndex, totalRounds) => {
    const fromEnd = totalRounds - roundIndex;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semifinal';
    if (fromEnd === 3) return 'Quartas';
    if (fromEnd === 4) return 'Oitavas';
    return `Rodada ${roundIndex + 1}`;
  };

  if (!teams.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <TrophyIcon className="size-12 mx-auto mb-4 opacity-20" />
        <p className="font-black uppercase tracking-widest text-sm">
          Adicione times ao torneio para visualizar o chaveamento
        </p>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-black uppercase tracking-widest text-sm">
          Nenhuma partida de mata-mata registrada
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <div className="inline-flex gap-8 min-w-full justify-center">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="flex flex-col gap-4 min-w-[280px]">
            <div className="text-center mb-4">
              <h3 className="text-lg font-black uppercase tracking-tighter text-gray-900">
                {getRoundName(roundIndex, rounds.length)}
              </h3>
              <div className="h-1 w-16 bg-[#DC2626] mx-auto mt-2 rounded-full" />
            </div>

            <div className="flex flex-col justify-around flex-1 gap-4">
              {round.map((match, matchIndex) => {
                const [score1, score2] = String(match.score || '0-0')
                  .split('-')
                  .map((value) => parseInt(value, 10) || 0);
                const statusLabel = match.status === 'live' ? 'AO VIVO' : match.status === 'finished' ? 'FINAL' : 'AGENDADO';

                return (
                  <div
                    key={matchIndex}
                    className="relative bg-white border-2 rounded-xl overflow-hidden transition-all hover:shadow-lg border-gray-100"
                    style={{
                      marginTop: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 20}px` : '0',
                    }}
                  >
                    <div
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        match.status === 'live'
                          ? 'bg-red-500 text-white animate-pulse'
                          : match.status === 'finished'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-yellow-50 text-yellow-600'
                      }`}
                    >
                      {statusLabel}
                    </div>

                    <div
                      className={`px-4 py-3 flex items-center justify-between transition-all ${
                        match.winner === match.team1
                          ? 'bg-[#000000] bg-opacity-10 border-b-2 border-[#000000]'
                          : 'border-b border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="size-6 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[8px] font-black text-gray-400">
                            {String(match.team1 || '').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-black truncate ${
                            match.winner === match.team1 ? 'text-[#000000]' : 'text-gray-900'
                          }`}
                        >
                          {match.team1}
                        </span>
                        {match.winner === match.team1 && <TrophyIcon className="size-3 text-[#DC2626]" />}
                      </div>
                      <span
                        className={`text-lg font-black tabular-nums ml-2 ${
                          match.winner === match.team1 ? 'text-[#000000]' : 'text-gray-400'
                        }`}
                      >
                        {score1}
                      </span>
                    </div>

                    <div
                      className={`px-4 py-3 flex items-center justify-between transition-all ${
                        match.winner === match.team2 ? 'bg-[#000000] bg-opacity-10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="size-6 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[8px] font-black text-gray-400">
                            {String(match.team2 || '').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span
                          className={`text-sm font-black truncate ${
                            match.winner === match.team2 ? 'text-[#000000]' : 'text-gray-900'
                          }`}
                        >
                          {match.team2}
                        </span>
                        {match.winner === match.team2 && <TrophyIcon className="size-3 text-[#DC2626]" />}
                      </div>
                      <span
                        className={`text-lg font-black tabular-nums ml-2 ${
                          match.winner === match.team2 ? 'text-[#000000]' : 'text-gray-400'
                        }`}
                      >
                        {score2}
                      </span>
                    </div>

                    {roundIndex < rounds.length - 1 && (
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-0.5 bg-gray-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {rounds.length > 0 && rounds[rounds.length - 1][0]?.winner && (
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 px-12 py-8 bg-linear-to-br from-[#DC2626] to-[#B91C1C] rounded-2xl shadow-2xl">
            <TrophyIcon className="size-12 text-white" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 mb-2">Campeão</p>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
                {rounds[rounds.length - 1][0].winner}
              </h2>
            </div>
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
