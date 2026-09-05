import React, { useEffect, useRef, useState } from 'react';
import EstatisticaControl from '../../Control/EstatisticaControl';
import SubstituicaoControl from '../../Control/SubstituicaoControl';
import AcaoAdversarioControl from '../../Control/AcaoAdversarioControl';
import { Alertas } from '../../utils/Alertas';
import {
  ESCALA,
  FUNDAMENTOS,
  QUALIDADE_PARA_TECLA,
  TIPO_ACAO_PARA_FUNDAMENTO,
  descrever,
  nomeQualidade,
  rotularQualidade,
} from '../../Model/Qualidade';
import {
  blocoMetricas,
  blocoTabela,
  escapeHtml,
  montarDocumento,
  nomeArquivoRelatorio,
  salvarRelatorioPdf,
} from '../../utils/relatorioPdf';

const TAB_ITEMS = [
  { id: 'geral', label: 'Geral' },
  { id: 'jogadores', label: 'Jogadores' },
  { id: 'sets', label: 'Sets' },
];

const StatCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
  </div>
);

const EmptyState = ({ title, message }) => (
  <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
    <p className="text-xl font-black text-gray-900 mb-2">{title}</p>
    <p className="text-sm font-medium text-gray-600">{message}</p>
  </div>
);

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const ScoutCard = ({ label, value, tone = 'dark' }) => (
  <div className={`rounded-xl border px-4 py-3 ${
    tone === 'red'
      ? 'border-red-100 bg-red-50 text-red-700'
      : 'border-gray-100 bg-white text-gray-900'
  }`}>
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

const ScoutResumo = ({ scout }) => {
  const data = scout || {};

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-4">
        Scout no padrao da planilha
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <ScoutCard label="Pontos totais" value={data.pontosTotais || 0} tone="red" />
        <ScoutCard label="V-P" value={data.vitoriaPontos || 0} tone="red" />
        <ScoutCard label="Saque total" value={data.saque?.total || 0} />
        <ScoutCard label="Saque pontos" value={data.saque?.aces || 0} />
        <ScoutCard label="Saque erro" value={data.saque?.erros || 0} />
        <ScoutCard label="Saque eff" value={formatPercent(data.saque?.eficiencia)} />
        <ScoutCard label="Recepcao total" value={data.recepcao?.total || 0} />
        <ScoutCard label="Recepcao erro" value={data.recepcao?.erros || 0} />
        <ScoutCard label="Recepcao positiva" value={formatPercent(data.recepcao?.positivaPct)} />
        <ScoutCard label="Recepcao perfeita" value={formatPercent(data.recepcao?.perfeitaPct)} />
        <ScoutCard label="Ataque total" value={data.ataque?.total || 0} />
        <ScoutCard label="Ataque erro" value={data.ataque?.erros || 0} />
        <ScoutCard label="Ataque bloqueado" value={data.ataque?.bloqueados || 0} />
        <ScoutCard label="Ataque pontos" value={data.ataque?.pontos || 0} tone="red" />
        <ScoutCard label="Ataque pts%" value={formatPercent(data.ataque?.pontosPct)} />
        <ScoutCard label="Ataque eff" value={formatPercent(data.ataque?.eficiencia)} />
        <ScoutCard label="Bloqueio pontos" value={data.bloqueio?.pontos || 0} />
        <ScoutCard label="Defesa total" value={data.defesa?.total || 0} />
        <ScoutCard label="Defesa +" value={data.defesa?.positivas || 0} />
        <ScoutCard label="Defesa -" value={data.defesa?.negativas || 0} />
        <ScoutCard label="Defesa eff" value={formatPercent(data.defesa?.eficiencia)} />
        <ScoutCard label="Erro geral" value={data.errosGerais || 0} />
      </div>
    </div>
  );
};

// Fundamentos vem sem acento do Model; na tela voltam acentuados.
const ROTULO_FUNDAMENTO = { Recepcao: 'Recepção' };

/**
 * Scout do adversario.
 *
 * A escala de qualidade e sempre lida da perspectiva de quem executou a acao,
 * entao "erro" aqui e erro DO ADVERSARIO - ou seja, ponto que a nossa equipe
 * ganhou sem precisar de nada. E essa a coluna que o analista procura, por isso
 * ela vem primeiro e em verde.
 */
const ResumoAdversario = ({ resumo, awayLabel }) => {
  if (!resumo || resumo.totais.total === 0) {
    return (
      <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">
          Adversario — {awayLabel}
        </p>
        <p className="text-sm font-medium text-orange-800/70">
          Nenhuma acao do adversario registrada nesta partida. No scout ao vivo, use
          {' '}<strong>Alt + numero</strong> da camisa para escoutar o outro lado da rede.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-4">
        Adversario — {awayLabel}
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Erros do adversario</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">{resumo.totais.erros}</p>
        </div>
        <div className="rounded-xl border border-orange-100 bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Pontos do adversario</p>
          <p className="mt-1 text-2xl font-black text-orange-500">{resumo.totais.pontos}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Acoes escoutadas</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{resumo.totais.total}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-orange-100 bg-white">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-orange-100/70 text-orange-700">
            <tr>
              <th className="px-3 py-2 font-black uppercase tracking-widest">Fundamento</th>
              <th className="px-3 py-2 text-center font-black uppercase tracking-widest">Total</th>
              <th className="px-3 py-2 text-center font-black uppercase tracking-widest">Pontos dele</th>
              <th className="px-3 py-2 text-center font-black uppercase tracking-widest">Erros dele</th>
              <th className="px-3 py-2 text-center font-black uppercase tracking-widest">Neutras</th>
            </tr>
          </thead>
          <tbody>
            {FUNDAMENTOS.map((fundamento) => {
              const linha = resumo.porNome[fundamento];
              return (
                <tr key={fundamento} className="border-b border-orange-50 last:border-0">
                  <td className="px-3 py-2 font-black text-gray-900">
                    {ROTULO_FUNDAMENTO[fundamento] || fundamento}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-gray-600">{linha?.total || 0}</td>
                  <td className="px-3 py-2 text-center font-black text-orange-500">{linha?.pontos || 0}</td>
                  <td className="px-3 py-2 text-center font-black text-emerald-600">{linha?.erros || 0}</td>
                  <td className="px-3 py-2 text-center font-bold text-gray-500">{linha?.neutras || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resumo.porCamisa.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">
            Por camisa (pontos / erros)
          </p>
          <div className="flex flex-wrap gap-2">
            {resumo.porCamisa.map((item) => (
              <span
                key={item.numCamisa ?? 'sem-camisa'}
                className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700"
              >
                {item.numCamisa == null ? 'Nao identificado' : `#${item.numCamisa}`}
                <span className="ml-2 text-orange-500">{item.pontos}</span>
                <span className="mx-1 text-gray-300">/</span>
                <span className="text-emerald-600">{item.erros}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getScoreInputValue = (value) => {
  if (value === '' || value === null || value === undefined || Number(value) === 0) {
    return '';
  }

  return value;
};

const getScoreNumber = (value) => Number(value) || 0;


const EstatisticaView = ({
  open,
  onClose,
  homeLabel,
  awayLabel,
  matchInfo,
  score,
  partidaId,
  onConfirm,
  onStatisticsChange,
  resumoOnly = false,
  readOnly = false,
  useDraftSetsAsResult = false,
}) => {
  const initialState = EstatisticaControl.criarEstadoInicial(score);
  const [activeTab, setActiveTab] = useState(initialState.activeTab);
  const [draftSets, setDraftSets] = useState(initialState.draftSets);
  const [editOptions, setEditOptions] = useState(initialState.editOptions);
  const [editingAction, setEditingAction] = useState(null);
  const [draftAction, setDraftAction] = useState(null);
  const [statistics, setStatistics] = useState(initialState.statistics);
  const [statisticsError, setStatisticsError] = useState(initialState.statisticsError);
  const [substituicoesPorSet, setSubstituicoesPorSet] = useState({});
  const [resumoAdversario, setResumoAdversario] = useState(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSearchMode, setPlayerSearchMode] = useState('nome');
  const [pdfSaving, setPdfSaving] = useState(false);
  const rollbackSnapshotRef = useRef(null);
  const confirmedRef = useRef(false);
  const initializedOpenRef = useRef(false);

  const resultadoPartida = useDraftSetsAsResult && draftSets.length > 0
    ? EstatisticaControl.calcularResultadoSets(draftSets)
    : EstatisticaControl.obterResultadoPartida(statistics, draftSets);
  const jogadoresFiltrados = statistics.jogadores.filter((jogador) => {
    const termo = playerSearch.trim().toLowerCase();
    if (!termo) {
      return true;
    }

    if (playerSearchMode === 'numero') {
      return String(jogador.numero || '').includes(termo);
    }

    return String(jogador.nome || '').toLowerCase().includes(termo);
  });

  const carregarSubstituicoesDosSets = (sets = []) => {
    if (!partidaId) {
      return {};
    }

    try {
      const control = SubstituicaoControl.getInstance();
      return (sets || []).reduce((acc, setScore) => {
        const numSet = Number(setScore.numSet);
        if (numSet) {
          acc[numSet] = control.buscarSubstituicoesDoSet(partidaId, numSet);
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Erro ao carregar substituicoes:', error);
      return {};
    }
  };

  useEffect(() => {
    if (!open) {
      initializedOpenRef.current = false;
      setSubstituicoesPorSet({});
      return;
    }

    if (open) {
      if (initializedOpenRef.current) {
        return;
      }

      initializedOpenRef.current = true;
      confirmedRef.current = false;
      rollbackSnapshotRef.current = !resumoOnly && !readOnly
        ? EstatisticaControl.criarSnapshotPartida(partidaId)
        : null;

      const resetState = EstatisticaControl.resetarAoAbrir(score);
      const resumoState = EstatisticaControl.carregarResumo(partidaId);
      const actionOptions = EstatisticaControl.carregarOpcoesEdicaoAcao(partidaId);

      setActiveTab(readOnly ? 'geral' : resumoOnly ? 'sets' : resetState.activeTab);
      setDraftSets(resumoState.draftSets);
      setSubstituicoesPorSet(carregarSubstituicoesDosSets(resumoState.draftSets));
      setEditOptions(actionOptions);
      setEditingAction(null);
      setDraftAction(null);
      setStatistics(resumoState.statistics);
      setStatisticsError(resumoState.statisticsError);
      setPlayerSearch('');
      setPlayerSearchMode('nome');

      try {
        setResumoAdversario(AcaoAdversarioControl.getInstance().resumo(partidaId, null));
      } catch (error) {
        // O resumo do adversario e complementar: falhar aqui nao pode derrubar
        // o restante das estatisticas da partida.
        console.error('Erro ao carregar o scout do adversario:', error);
        setResumoAdversario(null);
      }
    }
  }, [open, partidaId, resumoOnly, readOnly]);

  const handleCloseWithRollback = () => {
    if (!confirmedRef.current && rollbackSnapshotRef.current) {
      const rollbackState = EstatisticaControl.restaurarSnapshotPartida(partidaId, rollbackSnapshotRef.current);

      if (rollbackState?.statisticsError) {
        setStatisticsError(rollbackState.statisticsError);
        return;
      }

      setStatistics(rollbackState.statistics);
      setDraftSets(rollbackState.draftSets);
      setStatisticsError('');
      onStatisticsChange?.();
    }

    rollbackSnapshotRef.current = null;
    confirmedRef.current = false;
    initializedOpenRef.current = false;
    onClose?.();
  };

  const handleDraftSetChange = (numSet, side, value) => {
    setDraftSets((current) => EstatisticaControl.alterarPlacarSet(current, numSet, side, value));
  };

  const handleSaveSets = () => {
    try {
      const nextState = EstatisticaControl.salvarSets(partidaId, draftSets);
      setStatistics(nextState.statistics);
      setDraftSets(nextState.draftSets);
      setSubstituicoesPorSet(carregarSubstituicoesDosSets(nextState.draftSets));
      setStatisticsError(nextState.statisticsError);
      onStatisticsChange?.();
      return nextState;
    } catch (error) {
      console.error('Erro ao salvar sets:', error);
      setStatisticsError('Nao foi possivel salvar a pontuacao dos sets.');
      return { statistics, draftSets, statisticsError: 'Nao foi possivel salvar a pontuacao dos sets.' };
    }
  };

  const handleAddSet = () => {
    setDraftSets((current) => {
      const nextSetNumber = current.reduce((max, setScore) => {
        return Math.max(max, Number(setScore.numSet) || 0);
      }, 0) + 1;

      return [
        ...current,
        {
          numSet: nextSetNumber,
          home: 0,
          away: 0,
        },
      ];
    });
    setActiveTab('sets');
    setStatisticsError('');
  };

  const handleDeleteSet = async (setScore) => {
    const setNumber = Number(setScore?.numSet);
    const ultimoSet = draftSets.reduce((max, currentSet) => {
      return Math.max(max, Number(currentSet.numSet) || 0);
    }, 0);

    if (!setNumber || setNumber !== ultimoSet) {
      setStatisticsError('Somente o ultimo set pode ser excluido.');
      return;
    }

    const confirmed = await Alertas.confirmacao(
      `Deseja excluir o Set ${setNumber}? Apenas o ultimo set pode ser removido.`
    );

    if (!confirmed) {
      return;
    }

    const savedState = handleSaveSets();
    if (savedState.statisticsError) {
      return;
    }

    const nextState = EstatisticaControl.excluirSet(partidaId, setNumber);

    if (nextState.statisticsError) {
      setStatisticsError(nextState.statisticsError);
      return;
    }

    setStatistics(nextState.statistics);
    setDraftSets(nextState.draftSets);
    setSubstituicoesPorSet(carregarSubstituicoesDosSets(nextState.draftSets));
    setStatisticsError('');
    onStatisticsChange?.();
  };

  const handleConfirm = () => {
    let validacaoResultado;

    try {
      validacaoResultado = EstatisticaControl.validarPontuacaoPartida(draftSets);
    } catch (error) {
      setStatisticsError(error?.message || 'Pontuacao da partida invalida.');
      setActiveTab('sets');
      return;
    }

    const savedState = handleSaveSets();
    if (savedState.statisticsError) {
      return;
    }

    if (typeof onConfirm === 'function') {
      const finalScore = validacaoResultado.resultado;

      confirmedRef.current = true;
      rollbackSnapshotRef.current = null;
      initializedOpenRef.current = false;
      onConfirm(finalScore);
    }
  };

  const handleOpenActionEdit = (acao) => {
    setEditingAction(acao);
    setDraftAction(EstatisticaControl.criarRascunhoAcao(acao));
    setStatisticsError('');
  };

  const handleDraftActionChange = (field, value) => {
    setDraftAction((current) => EstatisticaControl.alterarRascunhoAcao(current, field, value));
  };

  const handleSaveActionEdit = () => {
    const nextState = EstatisticaControl.salvarEdicaoAcao(partidaId, draftAction);

    if (nextState.statisticsError) {
      setStatisticsError(nextState.statisticsError);
      return;
    }

    setStatistics(nextState.statistics);
    setDraftSets(nextState.draftSets);
    setEditingAction(null);
    setDraftAction(null);
    setStatisticsError('');
    onStatisticsChange?.();
  };

  const handleDeleteAction = async (acao) => {
    const confirmed = await Alertas.confirmacao(
      `Deseja excluir esta acao do Set ${acao.numSet}?`
    );

    if (!confirmed) {
      return;
    }

    const nextState = EstatisticaControl.excluirAcao(partidaId, acao.id);

    if (nextState.statisticsError) {
      setStatisticsError(nextState.statisticsError);
      return;
    }

    setStatistics(nextState.statistics);
    setDraftSets(nextState.draftSets);
    setStatisticsError('');
    onStatisticsChange?.();
  };

  const montarHtmlRelatorioPartida = () => {
    const scout = statistics.totals.scout || {};
    const linhasJogadores = statistics.jogadores.map((jogador) => `
      <tr>
        <td><strong>#${escapeHtml(jogador.numero || '--')} - ${escapeHtml(jogador.nome)}</strong></td>
        <td class="center">${jogador.totalAcoes || 0}</td>
        <td class="center emph">${jogador.pontos || 0}</td>
        <td class="center">${jogador.pontosCedidos || 0}</td>
        <td class="center emph">${jogador.scout?.pontosTotais || 0}</td>
        <td class="center emph">${jogador.scout?.vitoriaPontos || 0}</td>
        ${ESCALA.map((simbolo) => `<td class="center">${jogador.qualidade?.[simbolo] || 0}</td>`).join('')}
        <td class="center">${jogador.scout?.saque?.total || 0}</td>
        <td class="center">${jogador.scout?.saque?.aces || 0}</td>
        <td class="center">${jogador.scout?.saque?.ab || 0}</td>
        <td class="center">${jogador.scout?.saque?.cx || 0}</td>
        <td class="center">${jogador.scout?.saque?.erros || 0}</td>
        <td class="center">${formatPercent(jogador.scout?.saque?.eficiencia)}</td>
        <td class="center">${jogador.scout?.recepcao?.total || 0}</td>
        <td class="center">${jogador.scout?.recepcao?.perfeita || 0}</td>
        <td class="center">${jogador.scout?.recepcao?.positiva || 0}</td>
        <td class="center">${jogador.scout?.recepcao?.c || 0}</td>
        <td class="center">${jogador.scout?.recepcao?.x || 0}</td>
        <td class="center">${jogador.scout?.recepcao?.erros || 0}</td>
        <td class="center">${formatPercent(jogador.scout?.recepcao?.positivaPct)}</td>
        <td class="center">${formatPercent(jogador.scout?.recepcao?.perfeitaPct)}</td>
        <td class="center">${jogador.scout?.ataque?.total || 0}</td>
        <td class="center">${jogador.scout?.ataque?.pontos || 0}</td>
        <td class="center">${jogador.scout?.ataque?.positivos || 0}</td>
        <td class="center">${jogador.scout?.ataque?.negativos || 0}</td>
        <td class="center">${jogador.scout?.ataque?.bloqueados || 0}</td>
        <td class="center">${jogador.scout?.ataque?.erros || 0}</td>
        <td class="center">${formatPercent(jogador.scout?.ataque?.pontosPct)}</td>
        <td class="center">${formatPercent(jogador.scout?.ataque?.eficiencia)}</td>
        <td class="center">${jogador.scout?.bloqueio?.pontos || 0}</td>
        <td class="center">${jogador.scout?.defesa?.total || 0}</td>
        <td class="center">${jogador.scout?.defesa?.positivas || 0}</td>
        <td class="center">${jogador.scout?.defesa?.negativas || 0}</td>
        <td class="center">${formatPercent(jogador.scout?.defesa?.eficiencia)}</td>
        <td class="center">${jogador.scout?.errosGerais || 0}</td>
      </tr>
    `);

    // Scout do adversario. "Erros dele" e a coluna util: sao os pontos que a
    // equipe ganhou sem precisar construir a jogada.
    const linhasAdversario = FUNDAMENTOS.map((fundamento) => {
      const linha = resumoAdversario?.porNome?.[fundamento];
      return `
        <tr>
          <td><strong>${escapeHtml(ROTULO_FUNDAMENTO[fundamento] || fundamento)}</strong></td>
          <td class="center">${linha?.total || 0}</td>
          <td class="center">${linha?.pontos || 0}</td>
          <td class="center emph">${linha?.erros || 0}</td>
          <td class="center">${linha?.neutras || 0}</td>
        </tr>
      `;
    });

    const linhasAdversarioPorCamisa = (resumoAdversario?.porCamisa || []).map((item) => `
      <tr>
        <td><strong>${item.numCamisa == null ? 'Nao identificado' : `#${escapeHtml(item.numCamisa)}`}</strong></td>
        <td class="center">${item.total}</td>
        <td class="center">${item.pontos}</td>
        <td class="center emph">${item.erros}</td>
        <td class="center">${item.neutras}</td>
      </tr>
    `);

    const linhasSets = draftSets.map((setScore) => {
      const homeScore = getScoreNumber(setScore.home);
      const awayScore = getScoreNumber(setScore.away);
      const vencedor = homeScore > awayScore
        ? homeLabel
        : awayScore > homeScore
          ? awayLabel
          : 'Empate';

      return `
        <tr>
          <td class="center">Set ${setScore.numSet}</td>
          <td class="center">${homeScore} x ${awayScore}</td>
          <td>${escapeHtml(vencedor)}</td>
        </tr>
      `;
    });

    return montarDocumento({
      titulo: 'Relatorio da Partida',
      eyebrow: 'VolleyStats',
      subtitulo: [
        `${matchInfo?.name || 'Partida'} | ${matchInfo?.date || ''} | ${matchInfo?.gymnasium || ''}`,
        `${homeLabel} x ${awayLabel}`,
      ],
      corpo: `
        ${blocoMetricas([
          { rotulo: 'Resultado', valor: `${resultadoPartida.home} x ${resultadoPartida.away}`, destaque: true },
          { rotulo: 'Pontos scout', valor: scout.pontosTotais || 0 },
          { rotulo: 'V-P', valor: scout.vitoriaPontos || 0 },
          { rotulo: 'Saque total', valor: scout.saque?.total || 0 },
          { rotulo: 'Saque pontos', valor: scout.saque?.aces || 0 },
          { rotulo: 'Recepcao positiva', valor: formatPercent(scout.recepcao?.positivaPct) },
          { rotulo: 'Ataque pontos', valor: scout.ataque?.pontos || 0 },
          { rotulo: 'Ataque eff', valor: formatPercent(scout.ataque?.eficiencia) },
          { rotulo: 'Defesa +', valor: scout.defesa?.positivas || 0 },
          { rotulo: 'Erros do adversario', valor: resumoAdversario?.totais?.erros || 0 },
        ])}
        ${blocoTabela({
          titulo: 'Scout detalhado por jogador',
          compacta: true,
          colunas: [
            'Jogador',
            ...['Acoes', 'Pontos', 'Cedidos', 'PTS', 'V-P'].map((rotulo) => ({ rotulo, center: true })),
            // A escala de qualidade, na ordem das teclas 1..6, pelo nome do nivel:
            // o simbolo sozinho nao diz nada a quem le o relatorio.
            ...ESCALA.map((simbolo) => ({ rotulo: nomeQualidade(simbolo), center: true })),
            ...[
              'Saq Tot', 'Saq Pts', 'Saq A+B', 'Saq C+X', 'Saq Err', 'Saq Eff',
              'Rec Tot', 'Rec A', 'Rec B', 'Rec C', 'Rec X', 'Rec Err', 'Rec Pos%', 'Rec Prf%',
              'Atq Tot', 'Atq Pts', 'Atq +', 'Atq -', 'Atq Bloq', 'Atq Err', 'Atq Pts%', 'Atq Eff',
              'BK Pts',
              'Def Tot', 'Def +', 'Def -', 'Def Eff',
              'Erro Geral',
            ].map((rotulo) => ({ rotulo, center: true })),
          ],
          linhas: linhasJogadores,
          vazio: 'Nenhum scout registrado.',
        })}
        ${blocoTabela({
          titulo: `Scout do adversario (${escapeHtml(awayLabel)}) por fundamento`,
          estreita: true,
          colunas: [
            'Fundamento',
            { rotulo: 'Total', center: true },
            { rotulo: 'Pontos dele', center: true },
            { rotulo: 'Erros dele', center: true },
            { rotulo: 'Neutras', center: true },
          ],
          linhas: resumoAdversario && resumoAdversario.totais.total > 0 ? linhasAdversario : [],
          vazio: 'Nenhuma acao do adversario escoutada.',
        })}
        ${linhasAdversarioPorCamisa.length > 0 ? blocoTabela({
          titulo: 'Scout do adversario por camisa',
          estreita: true,
          colunas: [
            'Camisa',
            { rotulo: 'Total', center: true },
            { rotulo: 'Pontos dele', center: true },
            { rotulo: 'Erros dele', center: true },
            { rotulo: 'Neutras', center: true },
          ],
          linhas: linhasAdversarioPorCamisa,
          vazio: 'Nenhuma acao do adversario escoutada.',
        }) : ''}
        ${blocoTabela({
          titulo: 'Sets',
          estreita: true,
          colunas: [
            { rotulo: 'Set', center: true },
            { rotulo: 'Placar', center: true },
            'Vencedor',
          ],
          linhas: linhasSets,
          vazio: 'Nenhum set registrado.',
        })}
      `,
    });
  };

  const handleSavePdf = async () => {
    if (!window.reportAPI?.salvarPdf) {
      Alertas.erro('Exportacao em PDF indisponivel.');
      return;
    }

    setPdfSaving(true);
    try {
      const result = await salvarRelatorioPdf({
        nomeArquivo: nomeArquivoRelatorio('relatorio', 'partida', matchInfo?.name),
        html: montarHtmlRelatorioPartida(),
      });

      if (result?.success) {
        Alertas.sucesso('Relatorio salvo em PDF.');
      }
    } catch (error) {
      Alertas.erro(error?.message || 'Nao foi possivel salvar o PDF.');
    } finally {
      setPdfSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[88vh] rounded-2xl bg-white shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
              {readOnly ? 'Relatorio da partida' : resumoOnly ? 'Resumo da partida' : 'Encerramento da partida'}
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {readOnly ? 'Scout e estatisticas' : resumoOnly ? 'Resultado e Sets' : 'Finalizar Partida'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseWithRollback}
            className="rounded-full bg-gray-100 px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Fechar"
          >
            X
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {statisticsError && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {statisticsError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-100 pb-4">
          {(resumoOnly && !readOnly ? TAB_ITEMS.filter((item) => item.id !== 'jogadores') : TAB_ITEMS).map((item) => (
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
            <div className={`grid gap-4 ${resumoOnly ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
              <StatCard label="Sets da partida" value={`${resultadoPartida.home} x ${resultadoPartida.away}`} />
              <StatCard label="Sets registrados" value={statistics.totals.sets} />
              <StatCard label="Pontos registrados" value={statistics.totals.pontos} />
              {(!resumoOnly || readOnly) && <StatCard label="Acoes registradas" value={statistics.totals.acoes} />}
            </div>

            <ScoutResumo scout={statistics.totals.scout} />

            <ResumoAdversario resumo={resumoAdversario} awayLabel={awayLabel} />

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
                      const homeScore = getScoreNumber(setScore.home);
                      const awayScore = getScoreNumber(setScore.away);
                      const winner = homeScore > awayScore
                        ? homeLabel
                        : awayScore > homeScore
                          ? awayLabel
                          : 'Empate';

                      return (
                        <div key={setScore.numSet} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-gray-100">
                          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Set {setScore.numSet}</span>
                          <span className="text-sm font-black text-gray-900">
                            {homeScore} x {awayScore} - {winner}
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

        {(!resumoOnly || readOnly) && activeTab === 'jogadores' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder={playerSearchMode === 'numero' ? 'Buscar numero' : 'Buscar nome'}
                className="h-10 w-full sm:w-56 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-900 outline-none focus:border-gray-900 focus:bg-white"
              />
              <div className="flex rounded-full bg-gray-100 p-1">
                {[
                  { id: 'nome', label: 'Nome' },
                  { id: 'numero', label: 'Numero' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPlayerSearchMode(option.id)}
                    className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                      playerSearchMode === option.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full min-w-[2220px] text-left">
                <thead className="bg-black text-white">
                  <tr>
                    <th rowSpan="2" className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Jogador</th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest">Acoes</th>
                    <th
                      rowSpan="2"
                      className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20"
                      title="Pontos do rally atribuidos ao atleta (autor da ultima acao do ponto)"
                    >
                      Pontos
                    </th>
                    <th
                      rowSpan="2"
                      className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest"
                      title="Rallies perdidos cuja ultima acao foi do atleta"
                    >
                      Cedidos
                    </th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">PTS</th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest">V-P</th>
                    <th colSpan="6" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Geral</th>
                    <th colSpan="6" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Saque</th>
                    <th colSpan="8" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Recepcao</th>
                    <th colSpan="8" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Ataque</th>
                    <th colSpan="1" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Bloqueio</th>
                    <th colSpan="4" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Defesa</th>
                    <th rowSpan="2" className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest border-l border-white/20">Erro geral</th>
                  </tr>
                  <tr className="bg-neutral-900">
                    {ESCALA.map((simbolo) => (
                      <th
                        key={simbolo}
                        className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest"
                        title={`Tecla ${QUALIDADE_PARA_TECLA[simbolo]} no scout (${simbolo})`}
                      >
                        {nomeQualidade(simbolo)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Tot</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">A+B</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">C+X</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Err</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Eff</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Tot</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">A</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">B</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">C</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">X</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Err</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Pos%</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Prf%</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Tot</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">+</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">-</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Bloq</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Err</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Pts%</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Eff</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Pts</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Tot</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">+</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">-</th>
                    <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">Eff</th>
                  </tr>
                </thead>
                <tbody>
                  {jogadoresFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="40" className="px-4 py-10 text-center text-sm font-bold text-gray-500">
                        Nenhum jogador encontrado.
                      </td>
                    </tr>
                  ) : jogadoresFiltrados.map((jogador) => (
                    <tr key={`resumo-${jogador.id}`} className="border-b border-gray-100 text-sm font-bold text-gray-700 hover:bg-red-50/50">
                      <td className="px-4 py-3 font-black text-gray-900">#{jogador.numero || '--'} - {jogador.nome}</td>
                      <td className="px-3 py-3 text-center">{jogador.totalAcoes}</td>
                      <td className="px-3 py-3 text-center font-black text-emerald-600 border-l border-gray-100">{jogador.pontos || 0}</td>
                      <td className="px-3 py-3 text-center font-black text-orange-500">{jogador.pontosCedidos || 0}</td>
                      <td className="px-3 py-3 text-center font-black text-red-600 border-l border-gray-100">{jogador.scout?.pontosTotais || 0}</td>
                      <td className="px-3 py-3 text-center font-black text-red-600">{jogador.scout?.vitoriaPontos || 0}</td>
                      {ESCALA.map((simbolo) => (
                        <td key={simbolo} className="px-3 py-3 text-center">{jogador.qualidade?.[simbolo] || 0}</td>
                      ))}
                      <td className="px-3 py-3 text-center">{jogador.scout?.saque?.total || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.saque?.aces || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.saque?.ab || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.saque?.cx || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.saque?.erros || 0}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.saque?.eficiencia)}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.total || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.perfeita || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.positiva || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.c || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.x || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.recepcao?.erros || 0}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.recepcao?.positivaPct)}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.recepcao?.perfeitaPct)}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.total || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.pontos || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.positivos || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.negativos || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.bloqueados || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.ataque?.erros || 0}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.ataque?.pontosPct)}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.ataque?.eficiencia)}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.bloqueio?.pontos || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.defesa?.total || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.defesa?.positivas || 0}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.defesa?.negativas || 0}</td>
                      <td className="px-3 py-3 text-center">{formatPercent(jogador.scout?.defesa?.eficiencia)}</td>
                      <td className="px-3 py-3 text-center">{jogador.scout?.errosGerais || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!readOnly && (
            <div className="space-y-4">
            {statistics.jogadores.length === 0 ? (
              <EmptyState
                title="Nenhuma acao registrada"
                message="Os scouts digitados durante a partida aparecem aqui por jogador."
              />
            ) : jogadoresFiltrados.length === 0 ? (
              <EmptyState
                title="Nenhum jogador encontrado"
                message="Ajuste a busca por nome ou numero."
              />
            ) : (
              jogadoresFiltrados.map((jogador) => (
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
                        {nomeQualidade(qualidade)}: {total}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                    <table className="w-full min-w-[900px] text-left">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">PTS</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Saq Tot</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Saq Err</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Rec Pos%</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Rec Prf%</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Atq Pts</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Atq Err</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Atq Eff</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">BK Pts</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Def +</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Def -</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-sm font-bold text-gray-700">
                          <td className="px-4 py-3 font-black text-red-600">{jogador.scout?.pontosTotais || 0}</td>
                          <td className="px-4 py-3">{jogador.scout?.saque?.total || 0}</td>
                          <td className="px-4 py-3">{jogador.scout?.saque?.erros || 0}</td>
                          <td className="px-4 py-3">{formatPercent(jogador.scout?.recepcao?.positivaPct)}</td>
                          <td className="px-4 py-3">{formatPercent(jogador.scout?.recepcao?.perfeitaPct)}</td>
                          <td className="px-4 py-3">{jogador.scout?.ataque?.pontos || 0}</td>
                          <td className="px-4 py-3">{jogador.scout?.ataque?.erros || 0}</td>
                          <td className="px-4 py-3">{formatPercent(jogador.scout?.ataque?.eficiencia)}</td>
                          <td className="px-4 py-3">{jogador.scout?.bloqueio?.pontos || 0}</td>
                          <td className="px-4 py-3">{jogador.scout?.defesa?.positivas || 0}</td>
                          <td className="px-4 py-3">{jogador.scout?.defesa?.negativas || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {!readOnly && (
                  <div className="mt-5 rounded-2xl bg-white border border-gray-100 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Acoes registradas</p>
                    <div className="space-y-2">
                      {(jogador.acoesDetalhadas || []).map((acao) => (
                        <div key={acao.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                          <div>
                            <p className="text-sm font-black text-gray-900">
                              Set {acao.numSet} - {acao.pontoTime1} x {acao.pontoTime2}
                            </p>
                            <p className="text-xs font-bold text-gray-500">
                              {acao.tipoAcaoNome} - {rotularQualidade(acao.tipoAcaoNome, acao.qualidade)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenActionEdit(acao)}
                              className="rounded-full bg-gray-900 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-gray-800 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAction(acao)}
                              className="rounded-full bg-red-500 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-600 transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>
              ))
            )}
            </div>
            )}
          </div>
        )}

        {activeTab === 'sets' && (
          <div className="space-y-4 max-h-[52vh] overflow-auto pr-1">
            {!readOnly && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddSet}
                className="rounded-full bg-gray-900 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white hover:bg-gray-800 transition-colors"
              >
                Adicionar set
              </button>
            </div>
            )}
            {draftSets.length === 0 ? (
              <EmptyState
                title="Nenhum set registrado"
                message={resumoOnly ? 'Adicione um set para registrar o placar da partida.' : 'Quando um scout e gravado, o set atual passa a aparecer neste resumo.'}
              />
            ) : (
              <>
                {draftSets.map((setScore) => {
                  const setStats = statistics.sets.find((item) => Number(item.numSet) === Number(setScore.numSet));
                  const homeScore = getScoreNumber(setScore.home);
                  const awayScore = getScoreNumber(setScore.away);
                  const substituicoesSet = substituicoesPorSet[Number(setScore.numSet)] || [];
                  const winner = homeScore > awayScore
                    ? homeLabel
                    : awayScore > homeScore
                      ? awayLabel
                      : 'Empate';
                  const ultimoSet = draftSets.reduce((max, currentSet) => {
                    return Math.max(max, Number(currentSet.numSet) || 0);
                  }, 0);
                  const isUltimoSet = Number(setScore.numSet) === ultimoSet;

                  return (
                    <div key={setScore.numSet} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Set {setScore.numSet}</p>
                          <h3 className="text-xl font-black text-gray-900">Vencedor: {winner}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {!readOnly && isUltimoSet && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSet(setScore)}
                              className="rounded-full bg-red-500 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-600 transition-colors"
                            >
                              Excluir set
                            </button>
                          )}
                          <StatCard label="Pontos" value={setStats?.pontos || 0} />
                          {(!resumoOnly || readOnly) && <StatCard label="Acoes" value={setStats?.acoes || 0} />}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{homeLabel}</p>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getScoreInputValue(setScore.home)}
                            disabled={readOnly}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) => handleDraftSetChange(setScore.numSet, 'home', event.target.value)}
                            className="w-full text-center text-4xl font-black text-gray-900 placeholder:text-gray-300 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                        <div className="text-3xl font-black text-gray-300 pt-6">x</div>
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{awayLabel}</p>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={getScoreInputValue(setScore.away)}
                            disabled={readOnly}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) => handleDraftSetChange(setScore.numSet, 'away', event.target.value)}
                            className="w-full text-center text-4xl font-black text-gray-900 placeholder:text-gray-300 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Substituicoes do Set {setScore.numSet}
                          </p>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black text-gray-600">
                            {substituicoesSet.length}
                          </span>
                        </div>

                        {substituicoesSet.length === 0 ? (
                          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
                            Nenhuma substituicao registrada neste set.
                          </p>
                        ) : (
                          <div className="grid gap-2 md:grid-cols-2">
                            {substituicoesSet.map((substituicao, index) => (
                              <div key={substituicao.id || `${setScore.numSet}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Troca {index + 1}
                                  </span>
                                  <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-gray-900">
                                    {substituicao.pontoTime1 ?? 0} x {substituicao.pontoTime2 ?? 0}
                                  </span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="rounded-lg bg-red-50 px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Saiu</p>
                                    <p className="truncate text-xs font-black text-gray-900">
                                      #{String(substituicao.jogadorSaiNumero ?? '--').padStart(2, '0')} {substituicao.jogadorSaiNome || 'Jogador'}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Entrou</p>
                                    <p className="truncate text-xs font-black text-gray-900">
                                      #{String(substituicao.jogadorEntraNumero ?? '--').padStart(2, '0')} {substituicao.jogadorEntraNome || 'Jogador'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              </>
            )}
          </div>
        )}

        </div>

        <div className="shrink-0 flex justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4">
          {readOnly && (
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={pdfSaving}
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-red-700 transition-colors disabled:cursor-wait disabled:opacity-60"
            >
              {pdfSaving ? 'Salvando...' : 'Salvar como PDF'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCloseWithRollback}
            className="rounded-full bg-gray-100 px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {readOnly ? 'Fechar' : 'Cancelar'}
          </button>
          {!readOnly && (
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-green-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-green-600 transition-colors"
          >
            {resumoOnly ? 'Salvar resultado' : 'Confirmar resultado'}
          </button>
          )}
        </div>

        {editingAction && draftAction && (
          <div className="fixed inset-0 z-[10001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Editar scout</p>
                  <h3 className="text-2xl font-black text-gray-900">Acao #{editingAction.id}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAction(null);
                    setDraftAction(null);
                  }}
                  className="rounded-full bg-gray-100 px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  X
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Jogador
                  </label>
                  <select
                    value={draftAction.jogadorId}
                    onChange={(event) => handleDraftActionChange('jogadorId', event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  >
                    {editOptions.jogadores.map((jogador) => (
                      <option key={jogador.id} value={jogador.id}>
                        #{jogador.numero || '--'} - {jogador.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Tipo de acao
                  </label>
                  <select
                    value={draftAction.tipoAcaoId}
                    onChange={(event) => handleDraftActionChange('tipoAcaoId', event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  >
                    {editOptions.tiposAcao.map((tipo) => (
                      <option key={tipo.idTipoAcao} value={tipo.idTipoAcao}>
                        {tipo.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                    Qualidade
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {editOptions.qualidades.map((qualidade) => (
                      <button
                        key={qualidade}
                        type="button"
                        onClick={() => handleDraftActionChange('qualidade', qualidade)}
                        title={descrever(TIPO_ACAO_PARA_FUNDAMENTO[Number(draftAction.tipoAcaoId)], qualidade)}
                        className={`rounded-2xl px-2 py-3 text-xs font-black transition-colors ${
                          draftAction.qualidade === qualidade
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {nomeQualidade(qualidade)}
                      </button>
                    ))}
                  </div>

                  {/* O simbolo sozinho nao diz nada: o significado vem do fundamento. */}
                  <p className="mt-2 text-xs font-bold text-gray-500">
                    {descrever(TIPO_ACAO_PARA_FUNDAMENTO[Number(draftAction.tipoAcaoId)], draftAction.qualidade)}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAction(null);
                    setDraftAction(null);
                  }}
                  className="rounded-full bg-gray-100 px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveActionEdit}
                  className="rounded-full bg-green-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-green-600 transition-colors"
                >
                  Salvar alteracao
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstatisticaView;
