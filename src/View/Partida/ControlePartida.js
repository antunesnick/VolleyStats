 import React, { useEffect, useMemo, useState, useRef } from 'react';
  import PontoControl from '../../Control/PontoControl'
  import { VENCEDOR } from '../../Model/Ponto';
import { avaliarPartida, avaliarSet, normalizarSetsParaVencer, podeIncrementar, totalDeSets } from '../../Model/RegrasSet';
import {
  FUNDAMENTOS,
  FUNDAMENTO_PARA_TIPO_ACAO,
  TECLA_PARA_FUNDAMENTO,
  TECLA_PARA_QUALIDADE,
  legendaDoFundamento,
  nomeQualidade,
  rotularQualidade,
} from '../../Model/Qualidade';

// Os fundamentos vem sem acento do Model; na tela eles voltam acentuados.
const ROTULO_FUNDAMENTO = { Recepcao: 'Recepção' };
  import PlayerControl from '../../Control/PlayerControl';
  import SubstituicaoControl from '../../Control/SubstituicaoControl';
  import TimesPartidaControl from '../../Control/TimesPartidaControl';
  import AcaoAdversarioControl from '../../Control/AcaoAdversarioControl';
   import { ArrowLeft, ChevronDown, LayoutGrid, Play, Square, Download, Trash2,RefreshCw, MapPin, AlertCircle, CheckCircle,HelpCircle,X} from 'lucide-react';
  import { useHotkeys } from 'react-hotkeys-hook';
  import EstatisticaView from './EstatisticaView';
  import HelpScoutModal from './HelpModal';
 
  const VolleyballCourt = ({ players, formation, onPlayerClick }) => {
    const formationMap = {
      'Padrão 6-6': { front: 3, back: 3 },
      '2-4-0': { front: 2, back: 4 },
      '4-2-0': { front: 4, back: 2 },
      '5-1-0': { front: 5, back: 1 },
    };

    const config = formationMap[formation] || formationMap['Padrão 6-6'];
    
    const fillSlots = (items, count) => {
      const filled = [...items];
      while (filled.length < count) {
        filled.push(null);
      }
      return filled.slice(0, count);
    };

    const frontPlayers = fillSlots(players.slice(0, config.front), config.front);
    const backPlayers = fillSlots(players.slice(config.front, config.front + config.back), config.back);

    const visitorFrontPlayers = Array(config.front).fill(null);
    const visitorBackPlayers = Array(config.back).fill(null);

    const PlayerSpot = ({ player, position, onClick, isVisitor = false }) => (
      <button
        type="button"
        onClick={() => !isVisitor && onClick && onClick(player)}
        className={`h-14 w-14 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200 ${
          isVisitor 
            ? 'border-orange-200 bg-orange-50/95 text-orange-600 shadow-[0_8px_22px_rgba(251,146,60,0.18)] cursor-default pointer-events-none' 
            : 'border-slate-200 bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-red-500 hover:shadow-[0_14px_28px_rgba(220,38,38,0.18)] cursor-pointer'
        }`}
      >
        <span className={`text-[11px] font-black ${isVisitor ? 'text-orange-600' : 'text-gray-900'}`}>
          {isVisitor ? 'V' : (player?.numero || position)}
        </span>
        <span className={`text-[9px] uppercase tracking-tighter ${isVisitor ? 'text-orange-400' : 'text-gray-500'}`}>
          {isVisitor ? 'VIS' : (player?.nome?.slice(0, 3) || '---')}
        </span>
      </button>
    );

    return (
      <div className="relative mx-auto w-full max-w-[430px] px-2">
        <div className="relative aspect-[9/10] w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45" />
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-slate-900 shadow-sm" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[165%] rounded-full border border-slate-200 bg-white px-4 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 shadow-sm">
            REDE
          </div>

          <div className="absolute inset-x-6 top-[11%] flex items-center justify-around gap-3">
            {visitorBackPlayers.map((_, index) => <PlayerSpot key={`visitor-back-${index}`} isVisitor={true} />)}
          </div>
          <div className="absolute inset-x-6 top-[30%] flex items-center justify-around gap-3">
            {visitorFrontPlayers.map((_, index) => <PlayerSpot key={`visitor-front-${index}`} isVisitor={true} />)}
          </div>
          <div className="absolute inset-x-6 top-[58%] flex items-center justify-around gap-3">
            {frontPlayers.map((player, index) => (
              <PlayerSpot key={`home-front-${index}`} player={player} position={index + 1} onClick={onPlayerClick} />
            ))}
          </div>
          <div className="absolute inset-x-6 top-[79%] flex items-center justify-around gap-3">
            {backPlayers.map((player, index) => (
              <PlayerSpot key={`home-back-${index}`} player={player} position={config.front + index + 1} onClick={onPlayerClick} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ControlePartida = ({ partida, aoVoltar }) => {
 const [score, setScore] = useState({ home: 0, away: 0 }); 
  const [setsGanhos, setSetsGanhos] = useState({              
    home: partida?.pontosTime1 ?? 0,
    away: partida?.pontosTime2 ?? 0,
  });
    // 2 = melhor de 3, 3 = melhor de 5. Define o alvo de cada set, quando o
    // placar trava e quando a partida pode ser encerrada.
    const setsParaVencer = useMemo(
      () => normalizarSetsParaVencer(partida?.setsParaVencer),
      [partida?.setsParaVencer]
    );
    const maxSets = totalDeSets(setsParaVencer);
    const [formation, setFormation] = useState('Padrão 6-6');
    const [isFormationOpen, setIsFormationOpen] = useState(false);
    const [liveStatus, setLiveStatus] = useState(
      String(partida?.status || '').toUpperCase() === 'FINALIZADA'
        ? 'Finalizada'
        : String(partida?.status || '').toUpperCase() === 'EM_ANDAMENTO'
          ? 'Em andamento'
          : 'Aguardando'
    );
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [activityText, setActivityText] = useState('');
    const [feed, setFeed] = useState([]);
    const [players, setPlayers] = useState([]);
    const [escalados, setEscalados] = useState({ home: [], away: [] });
    const [benchPlayers, setBenchPlayers] = useState([]);
    const [isEscalacaoLoaded, setIsEscalacaoLoaded] = useState(false);
    const [showEscalacao, setShowEscalacao] = useState(false);
    const [escalaMsg, setEscalaMsg] = useState(null);
    const timesPartidaControl = TimesPartidaControl.getInstance();
    const timesPartidaRef = useRef({
      home: timesPartidaControl.criarTimesPartida(partida?.time1, partida?.id),
      away: timesPartidaControl.criarTimesPartida(partida?.time2, partida?.id)
    });
    const [currentSet, setCurrentSet] = useState(1);
    // Espelha "Set".encerrado no banco. Set fechado nao aceita mais ponto nem
    // acao: o placar dele ja virou resultado da partida.
    const [setEncerrado, setSetEncerrado] = useState(false);
    // Placar de cada set ja registrado, para o painel e a navegacao.
    const [setsDaPartida, setSetsDaPartida] = useState([]);
    const [pontosDoSet, setPontosDoSet] = useState([]);
    const [substituicoesDoSet, setSubstituicoesDoSet] = useState([]);
    // Scout do adversario: acoes do set aberto e o resumo acumulado da partida.
    const [acoesAdversarioDoSet, setAcoesAdversarioDoSet] = useState([]);
    const [resumoAdversario, setResumoAdversario] = useState(null);
    const [escopoAdversario, setEscopoAdversario] = useState('set');
    const [showSubstituicao, setShowSubstituicao] = useState(false);
    const [showFinalizarPartida, setShowFinalizarPartida] = useState(false);
  const [selectedFieldPlayer, setSelectedFieldPlayer] = useState(null);
    const [selectedFieldTeam, setSelectedFieldTeam] = useState(null);
    const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
    const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
    const [substituicaoMessage, setSubstituicaoMessage] = useState({ type: '', text: '', visible: false });
    const [showEstatistica, setShowEstatistica] = useState(false);

    const homeLabel = useMemo(() => partida?.time1Nome || partida?.time1 || 'Mandante', [partida]);
    const awayLabel = useMemo(() => partida?.time2Nome || partida?.time2 || 'Visitante', [partida]);

    const scoreRef = useRef(score);
    useEffect(() => { scoreRef.current = score; }, [score]);

    // Os handlers de teclado do scout sao memoizados por [buffer], entao podem
    // enxergar um estado de uma renderizacao anterior. O ref garante que a trava
    // do set encerrado valha o estado atual.
    const setEncerradoRef = useRef(setEncerrado);
    useEffect(() => { setEncerradoRef.current = setEncerrado; }, [setEncerrado]);

    /** Estado do set corrente, derivado do placar. Alimenta o aviso de set point. */
    const avaliacaoSet = useMemo(
      () => avaliarSet(score.home, score.away, currentSet, setsParaVencer),
      [score.home, score.away, currentSet, setsParaVencer]
    );

    /** Estado da partida, derivado dos sets ja encerrados. */
    const avaliacaoPartida = useMemo(
      () => avaliarPartida(setsGanhos.home, setsGanhos.away, setsParaVencer),
      [setsGanhos.home, setsGanhos.away, setsParaVencer]
    );

    /**
     * Aviso flutuante do scout.
     *
     * O balao de mensagem que ja existia so aparece dentro do modal de
     * substituicao, entao qualquer recado dado durante o scout passava
     * despercebido. Este some sozinho e nao rouba o foco do teclado.
     */
    const [avisoScout, setAvisoScout] = useState({ tipo: '', texto: '', visivel: false });
    const avisoTimeoutRef = useRef(null);

    const mostrarAviso = (tipo, texto) => {
      setAvisoScout({ tipo, texto, visivel: true });
      clearTimeout(avisoTimeoutRef.current);
      avisoTimeoutRef.current = setTimeout(
        () => setAvisoScout((atual) => ({ ...atual, visivel: false })),
        3500
      );
    };

    useEffect(() => () => clearTimeout(avisoTimeoutRef.current), []);

    /**
     * Pilha de desfazer do scout.
     *
     * Cobre as duas coisas que o analista digita no meio do rally: a acao e o
     * ponto no placar. Substituicao e encerramento de set ficam de fora - os
     * dois ja tem caminho proprio de correcao (a tela de escalacao e o botao de
     * reabrir set).
     *
     * A pilha vive enquanto a tela esta aberta: e um desfazer de digitacao, nao
     * um historico da partida.
     */
    const LIMITE_UNDO = 50;
    const [undoStack, setUndoStack] = useState([]);
    const undoStackRef = useRef(undoStack);
    useEffect(() => { undoStackRef.current = undoStack; }, [undoStack]);

    const empilharUndo = (entrada) => {
      setUndoStack((atual) => [...atual, entrada].slice(-LIMITE_UNDO));
    };

    /**
     * Unico caminho para mexer no placar (atalhos e cliques).
     *
     * Ao somar um ponto, o rally que acabou de ser decidido e o que estava no
     * placar ANTES do incremento - e ele que recebe a marcacao de vencedor.
     * Ao subtrair, o rally que volta a ficar em aberto e o do placar resultante.
     */
    const aplicarPonto = (side, delta, { registrarUndo = true } = {}) => {
      const atual = scoreRef.current;
      const proximo = { ...atual, [side]: Math.max(0, atual[side] + delta) };

      if (proximo[side] === atual[side]) return false;

      const partidaId = parseInt(partida?.id);
      const numSet = parseInt(currentSetRef.current);

      // Set fechado: o placar dele ja conta como set ganho. Mexer aqui sem
      // reabrir deixaria o resultado da partida diferente do placar dos sets.
      if (setEncerradoRef.current) {
        mostrarAviso('erro', `Set ${numSet} está encerrado. Reabra o set para corrigir o placar.`);
        return false;
      }

      // Set decidido: o placar so aceita correcao para baixo. Somar mais um
      // ponto criaria um 26x20, que nao existe em quadra.
      if (delta > 0 && !podeIncrementar(atual.home, atual.away, numSet, setsParaVencer)) {
        mostrarAviso('erro', `Set ${numSet} decidido em ${atual.home} x ${atual.away}. Corrija o placar ou encerre o set.`);
        return false;
      }

      if (partidaId) {
        try {
          const control = PontoControl.getInstance();

          if (delta > 0) {
            control.definirVencedorRally(
              partidaId,
              numSet,
              atual.home,
              atual.away,
              side === 'home' ? VENCEDOR.MANDANTE : VENCEDOR.VISITANTE
            );
          } else {
            control.definirVencedorRally(partidaId, numSet, proximo.home, proximo.away, null);
          }

          control.atualizarPlacarSet(partidaId, numSet, proximo.home, proximo.away);
        } catch (error) {
          console.error('Erro ao registrar ponto no placar:', error);
          mostrarAviso('erro', `Erro ao salvar o placar: ${error.message}`);
          return false;
        }
      }

      scoreRef.current = proximo;
      setScore(proximo);

      if (registrarUndo) {
        empilharUndo({
          tipo: 'placar',
          numSet,
          side,
          delta,
          descricao: `${delta > 0 ? '+1' : '-1'} ${side === 'home' ? homeLabel : awayLabel} (${proximo.home}x${proximo.away})`,
        });
      }

      // Recarrega para o painel lateral refletir o vencedor do rally.
      if (partidaId) {
        carregarDadosDoSet(numSet);
      }

      return true;
    };

    useHotkeys('shift+up', (e) => { e.preventDefault(); aplicarPonto('home', 1); });
    useHotkeys('alt+up', (e) => { e.preventDefault(); aplicarPonto('away', 1); });
    useHotkeys('shift+down', (e) => { e.preventDefault(); aplicarPonto('home', -1); });
    useHotkeys('alt+down', (e) => { e.preventDefault(); aplicarPonto('away', -1); });

    /**
     * Desfaz o ultimo lance digitado (Ctrl+Z).
     *
     * Uma acao volta pelo `removerAcao`, que ja regrava o dono do ponto; um
     * ponto de placar volta pelo proprio `aplicarPonto` invertido, para a
     * marcacao do vencedor do rally ser desfeita junto com o numero.
     */
    const desfazerUltimoLance = () => {
      const pilha = undoStackRef.current;
      const ultimo = pilha[pilha.length - 1];

      if (!ultimo) {
        mostrarAviso('erro', 'Nada para desfazer.');
        return;
      }

      if (setEncerradoRef.current) {
        mostrarAviso('erro', `Set ${currentSetRef.current} está encerrado. Reabra o set para desfazer.`);
        return;
      }

      // O lance pertence ao set em que foi digitado; desfazer de outro set
      // mexeria num placar que nao esta na tela.
      if (Number(ultimo.numSet) !== Number(currentSetRef.current)) {
        mostrarAviso('erro', `O último lance foi no set ${ultimo.numSet}. Volte para ele para desfazer.`);
        return;
      }

      try {
        if (ultimo.tipo === 'acao') {
          PontoControl.getInstance().removerAcao(ultimo.acaoId);
          carregarDadosDoSet(currentSetRef.current);
        } else if (ultimo.tipo === 'acaoAdversario') {
          AcaoAdversarioControl.getInstance().remover(ultimo.acaoAdversarioId);
          carregarDadosDoSet(currentSetRef.current);
        } else if (!aplicarPonto(ultimo.side, -ultimo.delta, { registrarUndo: false })) {
          // aplicarPonto ja explicou o motivo; a pilha fica como estava.
          return;
        }

        setUndoStack((atual) => atual.slice(0, -1));
        mostrarAviso('sucesso', `Desfeito: ${ultimo.descricao}`);
      } catch (error) {
        console.error('Erro ao desfazer:', error);
        mostrarAviso('erro', `Não foi possível desfazer: ${error.message}`);
      }
    };

    useHotkeys('ctrl+z', (event) => { event.preventDefault(); desfazerUltimoLance(); }, { enableOnFormTags: false });

    /**
     * Buffer do scout.
     *
     * `alvo` diz de qual lado da rede e a acao que esta sendo digitada:
     * 'nossa' (Ctrl + numero) ou 'adversario' (Alt + numero). O modificador do
     * PRIMEIRO digito decide o alvo do lance inteiro.
     */
    const BUFFER_VAZIO = { numero: '', acao: '', qualidade: '', alvo: 'nossa' };
    const [buffer, setBuffer] = useState(BUFFER_VAZIO);

    /**
     * O digito da tecla, independente do layout.
     *
     * `event.key` com um modificador segurado nem sempre e o digito (em alguns
     * layouts o Alt muda o caractere gerado). `event.code` e fisico: Digit1 e a
     * tecla 1 em qualquer teclado.
     */
    const digitoDaTecla = (event) => {
      const fisico = String(event.code || '').match(/^(?:Digit|Numpad)(\d)$/);
      if (fisico) return fisico[1];
      return /^\d$/.test(event.key) ? event.key : null;
    };

    /**
     * Um digito da camisa, com o alvo definido pelo modificador.
     *
     * Alt = adversario e a mesma convencao que o placar ja usa (Shift+Seta e a
     * nossa equipe, Alt+Seta e o adversario), entao nao ha um segundo mapa de
     * teclas para o analista decorar no meio do rally. Alt+digito tambem nao
     * colide com nada: os atalhos de placar sao Alt+Seta, e a qualidade
     * (estagio 3) e digito sem modificador nenhum.
     */
    const digitarCamisa = (digito, alvo) => {
      if (!digito) return;
      setBuffer((prev) => {
        if (prev.acao) return prev;
        // O alvo e do lance, nao do digito: quem manda e o primeiro apertado.
        const alvoDoLance = prev.numero ? prev.alvo : alvo;
        if (prev.numero.length >= 3) return { ...prev, alvo: alvoDoLance };
        return { ...prev, numero: prev.numero + digito, alvo: alvoDoLance };
      });
    };

    useHotkeys('ctrl+1, ctrl+2, ctrl+3, ctrl+4, ctrl+5, ctrl+6, ctrl+7, ctrl+8, ctrl+9, ctrl+0', (event) => {
      event.preventDefault(); 
      digitarCamisa(digitoDaTecla(event), 'nossa');
    }, { enableOnFormTags: false }, [buffer])

    // Mesmo fluxo, do outro lado da rede. A camisa 0 vale como "adversario nao
    // identificado": o analista nem sempre consegue ler o numero a tempo.
    useHotkeys('alt+1, alt+2, alt+3, alt+4, alt+5, alt+6, alt+7, alt+8, alt+9, alt+0', (event) => {
      event.preventDefault();
      digitarCamisa(digitoDaTecla(event), 'adversario');
    }, { enableOnFormTags: false }, [buffer])

    // 2. Soltou o Control e digitou o fundamento (S=Saque, A=Ataque, B=Bloqueio, R=Recepção, D=Defesa)
    useHotkeys('s, a, b, r, d', (event) => {
      // Sem a camisa no buffer não há o que escoutar; a letra é ignorada.
      if (!buffer.numero || buffer.acao) return;

      const tecla = event.key.toUpperCase();
      if (!TECLA_PARA_FUNDAMENTO[tecla]) return;

      setBuffer((prev) => (prev.acao ? prev : { ...prev, acao: tecla }));
    }, { enableOnFormTags: false }, [buffer]);

    // 3. Qualidade: teclas 1..6, sempre do pior para o melhor. O símbolo é o
    // mesmo em todos os fundamentos, mas o significado muda de um para o outro
    // — por isso a legenda na tela é a do fundamento em andamento.
    useHotkeys('1, 2, 3, 4, 5, 6', (event) => {
      if (!buffer.numero || !buffer.acao) return;

      const qualidade = TECLA_PARA_QUALIDADE[event.key];
      if (!qualidade) return;

      if (setEncerradoRef.current) {
        mostrarAviso('erro', `Set ${currentSetRef.current} está encerrado. Reabra o set para registrar ações.`);
        setBuffer(BUFFER_VAZIO);
        return;
      }

      const fundamento = TECLA_PARA_FUNDAMENTO[buffer.acao];
      const idTipoAcao = FUNDAMENTO_PARA_TIPO_ACAO[fundamento];

      if (!partida?.id) {
        setBuffer(BUFFER_VAZIO);
        return;
      }

      // Set e placar vem dos refs: os handlers do scout sao memoizados por
      // [buffer], entao o valor da renderizacao pode estar atrasado.
      const numSet = parseInt(currentSetRef.current);
      const placar = scoreRef.current;

      // Lance do adversario: nao ha atleta cadastrado do outro lado da rede, o
      // registro e pela camisa lida na quadra e vai para a tabela propria.
      if (buffer.alvo === 'adversario') {
        try {
          const numCamisa = Number(buffer.numero);
          const acaoAdversarioId = AcaoAdversarioControl.getInstance().gravar({
            partidaId: parseInt(partida.id),
            numSet,
            pontoTime1: placar.home,
            pontoTime2: placar.away,
            // 0 e a convencao para "nao identificado".
            numCamisa: numCamisa > 0 ? numCamisa : null,
            idTipoAcao,
            qualidade,
          });

          empilharUndo({
            tipo: 'acaoAdversario',
            acaoAdversarioId,
            numSet,
            descricao: `ADV #${buffer.numero} ${buffer.acao}${qualidade}`,
          });

          carregarDadosDoSet(numSet);
        } catch (error) {
          mostrarAviso('erro', `Erro ao registrar ação do adversário: ${error.message}`);
        }

        setBuffer(BUFFER_VAZIO);
        return;
      }

      const normalizarCamisa = (value) => String(value || '').replace(/^0+/, '') || '0';
      const jogador = players.find((p) => normalizarCamisa(p.numero) === normalizarCamisa(buffer.numero));

      if (!jogador) {
        mostrarAviso('erro', `Nenhum atleta da equipe com a camisa ${buffer.numero}. Para o adversário use Alt + número.`);
        setBuffer(BUFFER_VAZIO);
        return;
      }

      try {
        const ponto = PontoControl.getInstance().gravarPonto(
          { ...partida, id: parseInt(partida.id) },
          numSet,
          placar.home,
          placar.away,
          jogador,
          { idTipoAcao },
          qualidade
        );

        const acaoId = ponto?.ultimaAcaoGravada?.();
        if (acaoId) {
          empilharUndo({
            tipo: 'acao',
            acaoId,
            numSet,
            descricao: `#${jogador.numero} ${buffer.acao}${qualidade}`,
          });
        }

        carregarDadosDoSet(numSet); // Atualiza a barra lateral
      } catch (error) {
        mostrarAviso('erro', `Erro ao registrar ação: ${error.message}`);
      }

      // Limpa o buffer para o próximo rally
      setBuffer(BUFFER_VAZIO);
    }, { enableOnFormTags: false }, [buffer, players]);

    useHotkeys('esc', () => {
      if (showHelpModal) {
        setShowHelpModal(false);
        return;
      }
      setBuffer(BUFFER_VAZIO);
    });

    const estaDigitando = buffer.numero.length > 0;
    const escoutandoAdversario = buffer.alvo === 'adversario';

    const currentSetRef = useRef(currentSet);
    useEffect(() => { currentSetRef.current = currentSet; }, [currentSet]);

    useEffect(() => {
      const body = document.body;
      const html = document.documentElement;
      const previousStyles = {
        bodyOverflow: body.style.overflow,
        htmlOverflow: html.style.overflow,
        bodyHeight: body.style.height,
        htmlHeight: html.style.height,
      };

      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      body.style.height = '100vh';
      html.style.height = '100vh';

      return () => {
        body.style.overflow = previousStyles.bodyOverflow;
        html.style.overflow = previousStyles.htmlOverflow;
        body.style.height = previousStyles.bodyHeight;
        html.style.height = previousStyles.htmlHeight;
      };
    }, []);

  /**
   * Recarrega tudo que depende do set: placar, rallies, substituicoes, se o set
   * esta fechado e quantos sets cada lado ja ganhou.
   *
   * Os sets ganhos sao relidos aqui de proposito. Sao derivados dos sets com
   * encerrado = 1, nunca de um contador na tela - assim reabrir ou reencerrar um
   * set nao tem como desencontrar o resultado da partida.
   */
  const carregarDadosDoSet = (numSet) => {
    try {
      const partidaId = parseInt(partida.id);
      const set = parseInt(numSet);
      const control = PontoControl.getInstance();

      const placar = control.buscarPlacarSet(partidaId, set);
      setScore({ home: placar.home, away: placar.away });
      setSetEncerrado(control.setEstaEncerrado(partidaId, set));
      setSetsGanhos(control.buscarSetsGanhos(partidaId));
      setSetsDaPartida(control.buscarSetsDaPartida(partidaId));

      setPontosDoSet(control.buscarPontosPorSet(partidaId, set));
      setSubstituicoesDoSet(
        SubstituicaoControl.getInstance().buscarSubstituicoesDoSet(partidaId, set)
      );

      const adversarioControl = AcaoAdversarioControl.getInstance();
      setAcoesAdversarioDoSet(adversarioControl.buscarPorSet(partidaId, set));
      setResumoAdversario({
        set: adversarioControl.resumo(partidaId, set),
        partida: adversarioControl.resumo(partidaId, null),
      });
    } catch (error) {
      console.error('Erro ao carregar dados do set:', error.message);
      alert(`Erro ao carregar set ${numSet}: ${error.message}`);
    }
  };

    

    useEffect(() => {
      if (partida?.id) carregarDadosDoSet(currentSet);
    }, [currentSet, partida?.id]);

    /**
     * Ao abrir a partida, cai no set que esta sendo jogado - nao no set 1.
     *
     * Reabrir uma partida no set 1 fazia o analista escoutar por cima de um set
     * ja encerrado sem perceber.
     */
    useEffect(() => {
      if (!partida?.id) return;

      const sets = PontoControl.getInstance().buscarSetsDaPartida(parseInt(partida.id));
      if (sets.length === 0) return;

      const emAberto = sets.find((set) => !set.encerrado);
      const proximo = sets[sets.length - 1].numSet + 1;

      setCurrentSet(Math.min(emAberto ? emAberto.numSet : proximo, maxSets));
      // Só no carregamento da partida: depois disso quem manda no set e o analista.
    }, [partida?.id, maxSets]);

    /** Navegacao entre sets, limitada ao formato da partida. */
    const irParaSet = (numSet) => {
      const alvo = Math.min(Math.max(1, Number(numSet) || 1), maxSets);
      if (alvo !== currentSet) setCurrentSet(alvo);
    };

    /**
     * Fecha o set corrente e abre o proximo.
     *
     * E o unico caminho que soma um set ganho: `avancarSet` marca encerrado = 1
     * e regrava Partidas.pontosTime1/2 a partir dos sets fechados. Sem passar
     * por aqui o set fica em aberto para sempre - o placar do set nao vira
     * resultado e a partida nao tem como ser finalizada.
     */
    const encerrarSetAtual = () => {
      const partidaId = parseInt(partida?.id);
      if (!partidaId) return;

      if (score.home === score.away) {
        alert(`O Set ${currentSet} está empatado em ${score.home}. Um set não pode terminar empatado.`);
        return;
      }

      // Encerrar antes da hora e permitido (set interrompido, W.O., partida
      // amistosa), mas nunca em silencio.
      if (!avaliacaoSet.encerrado) {
        const alvo = avaliacaoSet.alvo;
        const confirmar = window.confirm(
          `O Set ${currentSet} está ${score.home} x ${score.away} e ainda não atingiu ${alvo} pontos com 2 de vantagem.\n\nEncerrar assim mesmo?`
        );
        if (!confirmar) return;
      }

      try {
        const control = PontoControl.getInstance();
        const { proximoSet, setsGanhos: ganhos } = control.avancarSet(
          partidaId,
          parseInt(currentSet),
          score.home,
          score.away
        );

        setLiveStatus('Em andamento');

        const vencedorSet = score.home > score.away ? homeLabel : awayLabel;
        setFeed((current) => [
          { id: Date.now(), text: `🏁 Set ${currentSet} encerrado: ${score.home} x ${score.away} (${vencedorSet})` },
          ...current,
        ]);

        if (avaliarPartida(ganhos.home, ganhos.away, setsParaVencer).encerrada) {
          // Fica no set encerrado: se algo estiver errado, da para reabrir daqui.
          carregarDadosDoSet(currentSet);
          setShowFinalizarPartida(true);
          return;
        }

        // Cria a linha do proximo set ja zerada: assim ele aparece no
        // encerramento e nos relatorios mesmo antes da primeira acao.
        control.atualizarPlacarSet(partidaId, proximoSet, 0, 0);
        setCurrentSet(proximoSet);
      } catch (error) {
        console.error('Erro ao encerrar o set:', error);
        alert('Erro ao encerrar o set: ' + error.message);
      }
    };

    /** Desfaz o encerramento: e o unico "undo" do fluxo de sets. */
    const reabrirSetAtual = () => {
      const partidaId = parseInt(partida?.id);
      if (!partidaId) return;

      try {
        PontoControl.getInstance().reabrirSet(partidaId, parseInt(currentSet));
        setShowFinalizarPartida(false);
        carregarDadosDoSet(currentSet);
      } catch (error) {
        console.error('Erro ao reabrir o set:', error);
        alert('Erro ao reabrir o set: ' + error.message);
      }
    };

    const finalizarPartida = async () => {
      const partidaId = parseInt(partida?.id);
      if (!partidaId) return;

      try {
        // Partidas.pontosTime1/2 guarda SETS ganhos, nao pontos.
        await window.api.partidas.finalizar(partidaId, setsGanhos.home, setsGanhos.away);
        setLiveStatus('Finalizada');
        setShowFinalizarPartida(false);
        aoVoltar?.();
      } catch (error) {
        console.error('Erro ao finalizar a partida:', error);
        alert('Erro ao finalizar a partida: ' + (error?.message || error));
      }
    };

    const matchInfo = useMemo(() => {
      let matchDate = 'Data não definida';
      if (partida?.dataPartida) {
        const date = new Date(partida.dataPartida);
        if (!Number.isNaN(date.getTime())) {
          matchDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } else {
          matchDate = partida.dataPartida;
        }
      }
      return {
        name: partida?.nome || 'Controle de Partida',
        date: matchDate,
        gymnasium: partida?.ginasioNome || "Arena Central"
      };
    }, [partida]);

    const persistCurrentEscalacao = async (timePartida = timesPartidaRef.current.home) => {
      const partidaId = Number(partida?.id);
      const timesId = Number(partida?.time1);

      if (!partidaId || !timesId) {
        throw new Error('Não foi possível identificar a partida e o time para salvar a escalação.');
      }

      const jogadores = [
        ...timePartida.linha.map((player) => ({
          jogadorId: Number(player.id),
          linha: 1,
        })),
        ...timePartida.banco.map((player) => ({
          jogadorId: Number(player.id),
          linha: 0,
        })),
      ];

      await TimesPartidaControl.getInstance().salvarEscalacao({
        timesId,
        partidaId,
        jogadores,
      });
    };

    useEffect(() => {
      const loadPlayers = async () => {
        try {
          if (!partida?.id) {
            return;
          }

          const control = PlayerControl.getInstance();
          const data = await control.findAllPlayers();
          const formatted = data.map((player) => ({
            id: player.id,
            nome: player.nome || 'Jogador',
            numero: String(player.numCamisa || player.id).padStart(2, '0'),
            posicao: player.posicao_id ? `Posição ${player.posicao_id}` : 'Sem posição',
          }));
          setPlayers(formatted);

          const timesPartidaControl = TimesPartidaControl.getInstance();
          const savedEscalacao = await timesPartidaControl.findEscalacaoByPartidaId(
            Number(partida.id),
            Number(partida.time1)
          );

          if (savedEscalacao.length > 0) {
            const playerById = new Map(formatted.map((player) => [Number(player.id), player]));
            const hydratePlayer = (player) => ({
              ...(playerById.get(Number(player.id)) || player),
              linha: Number(player.linha),
            });
            const initialLine = savedEscalacao
              .filter((player) => Number(player.linha) === 1)
              .map(hydratePlayer);
            const initialBench = savedEscalacao
              .filter((player) => Number(player.linha) === 0)
              .map(hydratePlayer);
            const homeTime = timesPartidaControl.criarTimesPartida(partida?.time1, partida?.id);

            initialLine.forEach((player) => homeTime.adicionarJogadorLinha(player));
            initialBench.forEach((player) => homeTime.adicionarJogadorBanco(player));

            timesPartidaRef.current.home = homeTime;
            setEscalados({ home: initialLine, away: [] });
            setBenchPlayers(initialBench);
            setIsEscalacaoLoaded(true);
          } else {
            setEscalados({ home: [], away: [] });
            setBenchPlayers([]);
            setIsEscalacaoLoaded(false);
          }
        } catch (error) {
          // Sem aviso aqui a escalacao aparecia vazia sem explicacao nenhuma.
          console.error('Erro ao carregar jogadores:', error);
          mostrarAviso('erro', `Nao foi possivel carregar a escalacao: ${error.message}`);
        }
      };
      loadPlayers();
    }, [partida?.id, partida?.time1, partida?.time2]);

    useEffect(() => {
      if (partida?.id) {
        timesPartidaRef.current.home = timesPartidaControl.criarTimesPartida(partida?.time1, partida?.id);
        timesPartidaRef.current.away = timesPartidaControl.criarTimesPartida(partida?.time2, partida?.id);
      }
    }, [partida?.id, partida?.time1, partida?.time2]);

    useEffect(() => {
      if (!players.length || escalados.home.length > 0 || benchPlayers.length > 0 || isEscalacaoLoaded) return;

      const initialLine = players.slice(0, 6);
      const initialBench = players.slice(6, 14);
      const homeTime = timesPartidaControl.criarTimesPartida(partida?.time1, partida?.id);

      initialLine.forEach((player) => homeTime.adicionarJogadorLinha(player));
      initialBench.forEach((player) => homeTime.adicionarJogadorBanco(player));

      timesPartidaRef.current.home = homeTime;
      setEscalados({ home: initialLine, away: [] });
      setBenchPlayers(initialBench);

      persistCurrentEscalacao(homeTime).catch((error) => {
        console.error('Erro ao salvar escalação inicial:', error);
        setEscalaMsg(error.message || 'Erro ao salvar escalação inicial.');
      });
    }, [players, escalados.home.length, benchPlayers.length, partida?.id, partida?.time1, partida?.time2, isEscalacaoLoaded]);

    const availableEscalacaoPlayers = useMemo(() => {
      const selectedIds = new Set([
        ...escalados.home.map((player) => player?.id),
        ...benchPlayers.map((player) => player?.id),
      ]);
      return players.filter((player) => !selectedIds.has(player?.id));
    }, [players, escalados.home, benchPlayers]);

const handleExcluirAcao = (acao) => {
  if (!window.confirm(`Excluir ação de ${acao.jogadorNome}? (${acao.tipoAcaoNome} - ${rotularQualidade(acao.tipoAcaoNome, acao.qualidade)})`)) return;
  try {
    PontoControl.getInstance().removerAcao(acao.id);
    carregarDadosDoSet(currentSet);
  } catch (error) {
    alert('Erro ao excluir ação: ' + error.message);
  }
};

const handleExcluirAcaoAdversario = (acao) => {
  const camisa = acao.numCamisa == null ? 'não identificado' : `#${acao.numCamisa}`;
  if (!window.confirm(`Excluir ação do adversário ${camisa}? (${acao.tipoAcaoNome} - ${rotularQualidade(acao.tipoAcaoNome, acao.qualidade)})`)) return;
  try {
    AcaoAdversarioControl.getInstance().remover(acao.id);
    carregarDadosDoSet(currentSet);
  } catch (error) {
    mostrarAviso('erro', `Erro ao excluir ação do adversário: ${error.message}`);
  }
};

/**
 * Acoes do adversario indexadas pelo rally, para aparecerem dentro do mesmo
 * cartao do rally no painel - a leitura do lance so faz sentido com os dois
 * lados juntos.
 */
const acoesAdversarioPorRally = useMemo(() => {
  const mapa = new Map();
  acoesAdversarioDoSet.forEach((acao) => {
    const chave = `${acao.pontoTime1}-${acao.pontoTime2}`;
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave).push(acao);
  });
  return mapa;
}, [acoesAdversarioDoSet]);

/** Resumo exibido: o set aberto ou a partida inteira. */
const resumoAdversarioAtivo = resumoAdversario?.[escopoAdversario] || null;

    const addPlayerToEscalacao = async (player, section) => {
      const timePartida = timesPartidaRef.current.home;
      if (!timePartida) return;

      const alreadySelected = [...timePartida.linha, ...timePartida.banco].some((item) => item?.id === player?.id);
      if (alreadySelected) return;

      const previousLine = [...timePartida.linha];
      const previousBench = [...timePartida.banco];
      const added = section === 'linha'
        ? timePartida.adicionarJogadorLinha(player)
        : timePartida.adicionarJogadorBanco(player);

      if (!added) {
        setEscalaMsg('Máximo de 14 jogadores na escalação. Lembre-se: 6 em linha e 8 no banco.');
        return;
      }

      try {
        await persistCurrentEscalacao(timePartida);
        setEscalados((current) => ({ ...current, home: [...timePartida.linha] }));
        setBenchPlayers([...timePartida.banco]);
        setEscalaMsg(null);
      } catch (error) {
        timePartida.linha = previousLine;
        timePartida.banco = previousBench;
        setEscalados((current) => ({ ...current, home: previousLine }));
        setBenchPlayers(previousBench);
        setEscalaMsg(error.message || 'Erro ao salvar escalação.');
      }
    };

    const removePlayerFromEscalacao = async (player, section) => {
      const timePartida = timesPartidaRef.current.home;
      if (!timePartida) return;

      const previousLine = [...timePartida.linha];
      const previousBench = [...timePartida.banco];

      if (section === 'linha') {
        timePartida.removerJogadorLinha(player);
      } else {
        timePartida.removerJogadorBanco(player);
      }

      try {
        await persistCurrentEscalacao(timePartida);
        setEscalados((current) => ({ ...current, home: [...timePartida.linha] }));
        setBenchPlayers([...timePartida.banco]);
        setEscalaMsg(null);
      } catch (error) {
        timePartida.linha = previousLine;
        timePartida.banco = previousBench;
        setEscalados((current) => ({ ...current, home: previousLine }));
        setBenchPlayers(previousBench);
        setEscalaMsg(error.message || 'Erro ao salvar escalação.');
      }
    };

    const handleSendAction = (e) => {
      e.preventDefault();
      if (!activityText.trim()) return;
      setFeed((current) => [{ id: Date.now(), text: activityText.trim() }, ...current]);
      setActivityText('');
    };

    // Cliques nos placares usam exatamente o mesmo caminho dos atalhos,
    // para que a marcacao do vencedor do rally nunca seja pulada.
    const changeScore = (side, delta) => aplicarPonto(side, delta);

    const handleSubstituir = async () => {
      if (!selectedFieldTeam || !selectedFieldPlayer || !selectedBenchPlayer) {
        setSubstituicaoMessage({
          type: 'error',
          text: 'Selecione um jogador em campo e um jogador do banco.',
          visible: true
        });
        return;
      }

      try {
        const substituicaoControl = SubstituicaoControl.getInstance();
        const validacao = await substituicaoControl.validarSubstituicao({
          pontoTime1: score.home,
          pontoTime2: score.away,
          partidaId: partida?.id,
          numSet: currentSet,
          jogadorEntra: selectedBenchPlayer.id,
          jogadorSai: selectedFieldPlayer.id
        });

        if (!validacao.permissaoSubstituir) {
          setSubstituicaoMessage({
            type: 'error',
            text: validacao.validacoes?.mensagens?.[0] || 'Não é possível realizar a substituição.',
            visible: true
          });
          return;
        }

        const resultado = await substituicaoControl.registrarSubstituicao({
          pontoTime1: score.home,
          pontoTime2: score.away,
          partidaId: partida?.id,
          numSet: currentSet,
          jogadorEntra: selectedBenchPlayer.id,
          jogadorSai: selectedFieldPlayer.id
        });

        if (!resultado.success) {
          setSubstituicaoMessage({
            type: 'error',
            text: resultado.message || 'Erro ao registrar substituição.',
            visible: true
          });
          return;
        }

        const timePartida = timesPartidaRef.current.home;
        const previousLine = [...timePartida.linha];
        const previousBench = [...timePartida.banco];
        const changed = timePartida.realizarSubstituicao(selectedFieldPlayer, selectedBenchPlayer);

        if (!changed) {
          setSubstituicaoMessage({
            type: 'error',
            text: 'Não foi possível atualizar a escalação da partida.',
            visible: true
          });
          return;
        }

        try {
          await persistCurrentEscalacao(timePartida);
        } catch (error) {
          timePartida.linha = previousLine;
          timePartida.banco = previousBench;
          setSubstituicaoMessage({
            type: 'error',
            text: error.message || 'Erro ao salvar escalação.',
            visible: true
          });
          return;
        }

        setEscalados((current) => ({
          ...current,
          home: [...timePartida.linha]
        }));
        setBenchPlayers([...timePartida.banco]);

        setSubstituicaoMessage({
          type: 'success',
          text: `${selectedFieldPlayer.nome} substituído por ${selectedBenchPlayer.nome}`,
          visible: true
        });

        carregarDadosDoSet(currentSet);

        setFeed((current) => [
          {
            id: Date.now(),
            text: `🔄 Substituição: ${selectedFieldPlayer.nome} por ${selectedBenchPlayer.nome}`
          },
          ...current
        ]);

        setSelectedFieldPlayer(null);
        setSelectedFieldTeam(null);
        setSelectedBenchPlayer(null);

        setTimeout(() => {
          setShowSubstituicao(false);
          setSubstituicaoMessage({ type: '', text: '', visible: false });
        }, 1400);
      } catch (error) {
        console.error('Erro ao substituir:', error);
        setSubstituicaoMessage({
          type: 'error',
          text: 'Erro ao processar substituição.',
          visible: true
        });
      }
    };

    const handleIniciarPartida = async () => {
      try {
        await window.api.partidas.iniciar(partida.id);
        setLiveStatus('Em andamento');
      } catch (error) {
        console.error('Erro ao iniciar partida:', error);
        alert('Não foi possível iniciar a partida.');
      }
    };

    const handleAbrirFinalizacao = () => {
      setShowEstatistica(true);
    };

    const handleConfirmarEstatistica = async (finalScore) => {
      try {
        const placarFinal = finalScore || score;
        await window.api.partidas.finalizar(partida.id, placarFinal.home, placarFinal.away);
        setScore(placarFinal);
        setLiveStatus('Finalizada');
        setShowEstatistica(false);
      } catch (error) {
        console.error('Erro ao finalizar partida:', error);
        alert('Não foi possível finalizar a partida.');
      }
    };

    return (

      
      <div className="fixed inset-0 z-[5000] h-screen w-screen bg-white overflow-hidden font-['Inter',sans-serif]">
        {/* Aviso do scout: some sozinho e nao tira o foco do teclado */}
        {avisoScout.visivel && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10010] pointer-events-none">
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl border ${
              avisoScout.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {avisoScout.tipo === 'sucesso'
                ? <CheckCircle size={18} className="text-emerald-600" />
                : <AlertCircle size={18} className="text-red-600" />}
              <span className="text-sm font-bold">{avisoScout.texto}</span>
            </div>
          </div>
        )}

       {estaDigitando && (
        <div className="fixed bottom-8 left-8 z-[10000] pointer-events-none transition-all">
          <div className={`bg-slate-900 text-white px-6 py-5 rounded-3xl shadow-2xl border flex flex-col items-start animate-in slide-in-from-bottom-6 fade-in duration-200 ${
            escoutandoAdversario ? 'border-orange-500' : 'border-slate-700'
          }`}>
            {/* De qual lado da rede e o lance. Sem isso o analista so descobre
                depois de gravar - e a correcao custa mais que a digitacao. */}
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold mb-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${escoutandoAdversario ? 'bg-orange-500' : 'bg-red-500'}`}></span>
              <span className={escoutandoAdversario ? 'text-orange-400' : 'text-slate-400'}>
                {escoutandoAdversario ? `Scout do adversário — ${awayLabel}` : `Scout — ${homeLabel}`}
              </span>
            </p>
            
            <div className="text-5xl font-black font-mono tracking-tighter flex items-center gap-3">
              {/* Número */}
              <span className={`min-w-[1ch] ${escoutandoAdversario ? 'text-orange-500' : 'text-red-500'}`}>
                {buffer.numero}
              </span>
              
              {/* Ação */}
              <span className={buffer.acao ? 'text-amber-500' : 'text-slate-600 opacity-30'}>
                {buffer.acao || '_'}
              </span>

              {/* Qualidade */}
              <span className={buffer.qualidade ? 'text-emerald-400' : 'text-slate-600 opacity-30'}>
                {buffer.qualidade || '_'}
              </span>
            </div>

            <p className="mt-3 text-[11px] font-medium text-slate-500">
              {!buffer.acao
                ? `Solte ${escoutandoAdversario ? 'Alt' : 'Ctrl'} + Ação (S, A, B, R, D)`
                : `Qualidade de ${TECLA_PARA_FUNDAMENTO[buffer.acao]} (teclas 1 a 6)`}
            </p>

            {escoutandoAdversario && buffer.numero === '0' && (
              <p className="mt-1 text-[11px] font-bold text-orange-400">
                Camisa 0 = adversário não identificado.
              </p>
            )}

            {/* A escala é a mesma nos cinco fundamentos, o significado não.
                A legenda evita que o analista decore cinco mapas no meio do rally. */}
            {buffer.acao && (
              <ul className="mt-3 w-full space-y-1 border-t border-slate-700 pt-3">
                {legendaDoFundamento(TECLA_PARA_FUNDAMENTO[buffer.acao]).map((item) => (
                  <li key={item.simbolo} className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
                    <span className="w-4 text-center font-black text-slate-500">{item.tecla}</span>
                    <span
                      className={`w-4 text-center font-black ${
                        item.resultado === 'PONTO'
                          ? 'text-emerald-400'
                          : item.resultado === 'ERRO'
                            ? 'text-red-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {item.simbolo}
                    </span>
                    <span>{item.texto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
        {/* Back Button (Top Left) */}
        <button 
          onClick={aoVoltar}
          className="absolute bg-white hover:bg-gray-50 border border-gray-100 left-0 rounded-br-[15px] size-[70px] top-0 flex items-center justify-center z-[60] cursor-pointer transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="text-gray-900 size-6" />
        </button>

        {/* Main Layout */}
        <div className="relative flex h-full pr-0 lg:pr-[360px]">
          
          {/* Court Section */}
          <div className="flex-1 relative bg-[#FAFAFA] flex items-center justify-center overflow-hidden h-full">
            
            {/* Match Info Bar */}
            <div className="absolute top-5 left-24 z-[55] flex items-center gap-4 hidden sm:flex">
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                <div className="flex items-center gap-3">
                  <MapPin size={14} className="text-[#DC2626]" />
                  <div className="text-[11px] font-black uppercase tracking-widest text-gray-700">
                    {matchInfo.gymnasium}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${
                liveStatus === "Em andamento" ? "bg-red-500 text-white animate-pulse" : "bg-gray-200 text-gray-600"
              }`}>
                {liveStatus === "Em andamento" ? "AO VIVO" : liveStatus}
              </div>
              <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="bg-[#1e293b] px-4 py-2 rounded-full text-white shadow-sm hover:bg-slate-700 transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <HelpCircle size={18} />
              Help
            </button>
            </div>

            {/* Log de Substituicoes */}
            <div className="hidden xl:flex absolute left-4 top-36 bottom-36 z-[45] w-[230px] flex-col rounded-xl border border-gray-100 bg-white/95 shadow-xl backdrop-blur-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Substituicoes</p>
                    <h3 className="mt-1 text-base font-black text-gray-900">Set {currentSet}</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-600">
                    {substituicoesDoSet.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-3">
                {substituicoesDoSet.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-xs font-medium text-gray-400">
                    Nenhuma substituicao registrada neste set.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {substituicoesDoSet.map((substituicao, index) => (
                      <div key={substituicao.id || index} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Troca {index + 1}
                          </span>
                          <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-gray-900">
                            {substituicao.pontoTime1 ?? 0} x {substituicao.pontoTime2 ?? 0}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="rounded-md bg-red-50 px-2.5 py-1.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Saiu</p>
                            <p className="truncate text-xs font-black text-gray-900">
                              #{String(substituicao.jogadorSaiNumero ?? '--').padStart(2, '0')} {substituicao.jogadorSaiNome || 'Jogador'}
                            </p>
                          </div>

                          <div className="rounded-md bg-emerald-50 px-2.5 py-1.5">
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

            {/* The Court */}
            <div className="relative z-10 w-full mt-10">
              <VolleyballCourt 
                players={escalados.home} 
                formation={formation} 
                onPlayerClick={setSelectedPlayerDetails} 
              />
            </div>

            {/* Match Controls - Bottom Center */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[55] flex flex-wrap justify-center items-center gap-3 w-full px-4">
              <button
                onClick={() => setShowEscalacao(true)}
                className="bg-white/90 backdrop-blur-sm border border-gray-200 px-5 py-3 rounded-full shadow-sm hover:bg-white transition-all text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2"
              >
                <LayoutGrid size={14} className="text-gray-900" />
                Escalação
              </button>

              <button
                onClick={() => setShowSubstituicao(true)}
                className="bg-white/90 backdrop-blur-sm border border-gray-200 px-5 py-3 rounded-full shadow-sm hover:bg-white transition-all text-[11px] font-black uppercase tracking-widest text-gray-700 flex items-center gap-2"
              >
                <RefreshCw size={14} className="text-gray-900" />
                Substituição
              </button>

              {liveStatus === 'Aguardando' && (
                <button
                  onClick={handleIniciarPartida}
                  className="border-2 px-5 py-3 rounded-full shadow-sm transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2 bg-[#00FF2F] hover:bg-[#00DD29] border-white text-white"
                >
                  <Play size={14} />
                  Iniciar Partida
                </button>
              )}

              {liveStatus === 'Em andamento' && (
                <button
                  onClick={handleAbrirFinalizacao}
                  className="border-2 px-5 py-3 rounded-full shadow-sm transition-all text-[11px] font-black uppercase tracking-widest flex items-center gap-2 bg-red-500 hover:bg-red-600 border-white text-white"
                >
                  <Square size={14} />
                  Finalizar Partida
                </button>
              )}

              {liveStatus === 'Finalizada' && (
                <div className="border-2 px-5 py-3 rounded-full shadow-sm text-[11px] font-black uppercase tracking-widest bg-emerald-600 border-white text-white">
                  Partida Finalizada
                </div>
              )}

        
            </div>

            {/* Background Decorator */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 flex items-center justify-center select-none overflow-hidden">
              <h1 className="text-[15rem] md:text-[25rem] font-black -rotate-6 scale-150 tracking-tighter">VOLLEYSTATS</h1>
            </div>
          </div>

          {/* Side Panel Section */}
          <div className="hidden lg:flex absolute right-0 top-0 bottom-0 w-[360px] bg-white border-l border-gray-100 shadow-2xl z-50 flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{matchInfo.name}</h2>
              <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500 mt-1">{matchInfo.date}</p>
            </div>
            {/* Sets da partida: derivado dos sets encerrados, nunca digitado */}
<div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gray-50/50">
  <div className="flex items-center justify-between mb-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      Sets da Partida
    </p>
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      Melhor de {maxSets}
    </p>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div className="rounded-2xl bg-white border border-gray-100 px-3 py-2 shadow-sm text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{homeLabel}</p>
      <span className="text-3xl font-black text-gray-900">{setsGanhos.home}</span>
    </div>
    <div className="rounded-2xl bg-white border border-orange-100 px-3 py-2 shadow-sm text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400 truncate">{awayLabel}</p>
      <span className="text-3xl font-black text-orange-500">{setsGanhos.away}</span>
    </div>
  </div>

  {/* Um chip por set: clicar navega, o anel marca o set aberto na tela */}
  {setsDaPartida.length > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {setsDaPartida.map((set) => (
        <button
          key={set.numSet}
          type="button"
          onClick={() => irParaSet(set.numSet)}
          title={set.encerrado ? `Set ${set.numSet} encerrado` : `Set ${set.numSet} em aberto`}
          className={`rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${
            set.numSet === currentSet
              ? 'bg-gray-900 text-white'
              : set.encerrado
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {set.numSet}º {set.home}-{set.away}
          {set.encerrado ? ' ✓' : ''}
        </button>
      ))}
    </div>
  )}

  {avaliacaoPartida.encerrada && (
    <button
      type="button"
      onClick={() => setShowFinalizarPartida(true)}
      className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors"
    >
      Finalizar partida ({setsGanhos.home} x {setsGanhos.away})
    </button>
  )}
</div>

{/* Placar do set atual (clicável para mudança rápida) */}
<div className="p-6 border-b border-gray-100">
  <div className="grid grid-cols-2 gap-4">
    <div
      className={`bg-gray-900 rounded-2xl p-4 text-center transition ${setEncerrado ? 'opacity-60' : 'cursor-pointer hover:bg-gray-800'}`}
      onClick={() => changeScore('home', 1)}
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
        {homeLabel} — Set {currentSet}
      </span>
      <span className="text-4xl font-black text-white">{score.home}</span>
    </div>
    <div
      className={`bg-orange-500 rounded-2xl p-4 text-center transition ${setEncerrado ? 'opacity-60' : 'cursor-pointer hover:bg-orange-600'}`}
      onClick={() => changeScore('away', 1)}
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 block mb-1">
        {awayLabel} — Set {currentSet}
      </span>
      <span className="text-4xl font-black text-white">{score.away}</span>
    </div>
  </div>

  {/* Situacao do set: alvo, set point e o momento de fechar */}
  <p className="mt-3 text-center text-[11px] font-bold text-gray-500">
    {setEncerrado
      ? `Set ${currentSet} encerrado em ${score.home} x ${score.away}.`
      : avaliacaoSet.encerrado
        ? `Set decidido em ${score.home} x ${score.away}. Encerre para abrir o próximo.`
        : avaliacaoSet.emSetPoint
          ? `Set point — ${avaliacaoSet.faltamParaFechar} ponto para fechar (alvo ${avaliacaoSet.alvo}${avaliacaoSet.decisivo ? ', set decisivo' : ''}).`
          : `Faltam ${avaliacaoSet.faltamParaFechar} pontos para fechar (alvo ${avaliacaoSet.alvo}${avaliacaoSet.decisivo ? ', set decisivo' : ''}).`}
  </p>

  {setEncerrado ? (
    <button
      type="button"
      onClick={reabrirSetAtual}
      className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Reabrir set {currentSet}
    </button>
  ) : (
    <button
      type="button"
      onClick={encerrarSetAtual}
      className={`mt-3 w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-colors ${
        avaliacaoSet.encerrado
          ? 'bg-gray-900 text-white hover:bg-gray-800'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      Encerrar set {currentSet}
    </button>
  )}

  {/* O que o Ctrl+Z desfaz agora. Tambem serve de botao, para quem usa mouse. */}
  {undoStack.length > 0 && !setEncerrado && (
    <button
      type="button"
      onClick={desfazerUltimoLance}
      title="Desfazer o último lance (Ctrl+Z)"
      className="mt-2 w-full rounded-2xl border border-dashed border-gray-200 px-4 py-2 text-[11px] font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors truncate"
    >
      Ctrl+Z desfaz: {undoStack[undoStack.length - 1].descricao}
    </button>
  )}
</div>

            {/* Pontos do Set */}
<div className="flex-1 overflow-auto p-6 bg-gray-50/30">

  {/* Scout do adversario.
      A leitura que o analista procura aqui e "onde o adversario entrega
      ponto": erro de ataque, erro de saque, invasao de bloqueio. Por isso a
      coluna de destaque e a de erros DELE, que sao os pontos que ganhamos. */}
  {resumoAdversarioAtivo && (
    <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-600 truncate">
          Adversário — {awayLabel}
        </h3>
        <div className="flex rounded-full bg-white border border-orange-200 p-0.5 shrink-0">
          {[
            { id: 'set', rotulo: `Set ${currentSet}` },
            { id: 'partida', rotulo: 'Partida' },
          ].map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => setEscopoAdversario(opcao.id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                escopoAdversario === opcao.id
                  ? 'bg-orange-500 text-white'
                  : 'text-orange-500 hover:bg-orange-50'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {resumoAdversarioAtivo.totais.total === 0 ? (
        <p className="text-[11px] font-medium text-orange-700/70">
          Nenhuma ação do adversário registrada. Use <strong>Alt + número</strong> da camisa,
          depois o fundamento e a qualidade.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-white border border-emerald-100 px-2 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Erros dele</p>
              <p className="text-xl font-black text-emerald-600">{resumoAdversarioAtivo.totais.erros}</p>
            </div>
            <div className="rounded-xl bg-white border border-orange-100 px-2 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-orange-500">Pontos dele</p>
              <p className="text-xl font-black text-orange-500">{resumoAdversarioAtivo.totais.pontos}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 px-2 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Ações</p>
              <p className="text-xl font-black text-gray-700">{resumoAdversarioAtivo.totais.total}</p>
            </div>
          </div>

          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-wider text-orange-500/80">
                <th className="text-left pb-1">Fundamento</th>
                <th className="text-center pb-1">Tot</th>
                <th className="text-center pb-1">Pts</th>
                <th className="text-center pb-1">Err</th>
              </tr>
            </thead>
            <tbody>
              {FUNDAMENTOS.map((fundamento) => {
                const linha = resumoAdversarioAtivo.porNome[fundamento];
                return (
                  <tr key={fundamento} className="border-t border-orange-100/70">
                    <td className="py-1 font-bold text-gray-700">
                      {ROTULO_FUNDAMENTO[fundamento] || fundamento}
                    </td>
                    <td className="py-1 text-center font-bold text-gray-500">{linha?.total || 0}</td>
                    <td className="py-1 text-center font-black text-orange-500">{linha?.pontos || 0}</td>
                    <td className="py-1 text-center font-black text-emerald-600">{linha?.erros || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {resumoAdversarioAtivo.porCamisa.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-orange-500/80 mb-1.5">
                Por camisa
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resumoAdversarioAtivo.porCamisa.map((item) => (
                  <span
                    key={item.numCamisa ?? 'sem-camisa'}
                    title={`${item.total} ação(ões) · ${item.pontos} ponto(s) · ${item.erros} erro(s)`}
                    className="rounded-full bg-white border border-orange-200 px-2.5 py-1 text-[10px] font-bold text-gray-700"
                  >
                    {item.numCamisa == null ? 'S/N' : `#${item.numCamisa}`}
                    <span className="ml-1 text-orange-500">{item.pontos}</span>
                    <span className="mx-0.5 text-gray-300">/</span>
                    <span className="text-emerald-600">{item.erros}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )}

  <div className="flex items-center justify-between mb-4">
    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
      Pontos — Set {currentSet}
    </h3>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => irParaSet(currentSet - 1)}
        disabled={currentSet <= 1}
        title="Set anterior"
        className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >‹</button>
      <button
        type="button"
        onClick={() => irParaSet(currentSet + 1)}
        disabled={currentSet >= maxSets}
        title="Próximo set"
        className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
      >›</button>
    </div>
  </div>

            {pontosDoSet.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400">
                Nenhum ponto registrado neste set.
              </div>
            ) : (
              <div className="space-y-3">
                {pontosDoSet.map((ponto, index) => (
                  <div
                    key={`${ponto.pontoTime1}-${ponto.pontoTime2}-${index}`}
                    className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2"
                  >
                    {/* Cabeçalho do Ponto (Placar) */}
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Rally {index + 1}
                      </span>
                      <span className="text-sm font-black text-gray-900 font-mono">
                        {ponto.pontoTime1} × {ponto.pontoTime2}
                      </span>
                    </div>

                    {/* Dono do ponto: autor da última ação do rally */}
                    <div
                      className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border ${
                        ponto.vencedor === VENCEDOR.VISITANTE
                          ? 'bg-orange-50 border-orange-100'
                          : 'bg-emerald-50 border-emerald-100'
                      }`}
                    >
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest ${
                          ponto.vencedor === VENCEDOR.VISITANTE ? 'text-orange-500' : 'text-emerald-600'
                        }`}
                      >
                        {ponto.vencedor === VENCEDOR.VISITANTE ? 'Ponto cedido' : 'Ponto de'}
                      </span>
                      <span className="text-xs font-black text-gray-800 truncate">
                        {ponto.dono
                          ? `${String(ponto.dono.numero ?? '').padStart(2, '0')} · ${ponto.dono.nome}`
                          : 'Sem atleta'}
                      </span>
                    </div>

                    {/* Ações do adversário no mesmo rally */}
                    {(acoesAdversarioPorRally.get(`${ponto.pontoTime1}-${ponto.pontoTime2}`) || []).length > 0 && (
                      <div className="mt-1 pt-2 border-t border-orange-100 flex flex-col gap-1.5">
                        {acoesAdversarioPorRally.get(`${ponto.pontoTime1}-${ponto.pontoTime2}`).map((acao) => (
                          <div key={`adv-${acao.id}`} className="flex justify-between items-center text-xs text-orange-700 bg-orange-50/70 p-1.5 rounded-lg">
                            <span className="font-medium truncate pr-2">
                              ADV {acao.numCamisa == null ? 'S/N' : String(acao.numCamisa).padStart(2, '0')}
                            </span>
                            <div className="flex gap-2 items-center flex-shrink-0">
                              <span className="font-bold text-orange-900">{acao.tipoAcaoNome}</span>
                              <span
                                className="font-bold bg-white border border-orange-200 px-2 py-0.5 rounded text-10px shadow-sm whitespace-nowrap"
                                title={rotularQualidade(acao.tipoAcaoNome, acao.qualidade)}
                              >
                                {nomeQualidade(acao.qualidade)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleExcluirAcaoAdversario(acao)}
                                className="w-5 h-5 rounded-md bg-red-50 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                title="Excluir ação do adversário"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lista de Ações ocorridas neste ponto */}
                    {ponto.acoes && ponto.acoes.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-gray-50 flex flex-col gap-1.5">
                        {ponto.acoes.map((acao, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50/50 p-1.5 rounded-lg">
                  <span className="font-medium truncate pr-2">
                    {acao.jogadorNumero ?? '00'} - {acao.jogadorNome ?? 'Jogador'}
                  </span>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <span className="font-bold text-gray-800">{acao.tipoAcaoNome}</span>
                    <span
                      className="font-bold bg-white border border-gray-200 px-2 py-0.5 rounded text-10px shadow-sm whitespace-nowrap"
                      title={rotularQualidade(acao.tipoAcaoNome, acao.qualidade)}
                    >
                      {nomeQualidade(acao.qualidade)}
                    </span>
                    {/* ✅ Botão de excluir a ação */}
                    <button
                      type="button"
                      onClick={() => handleExcluirAcao(acao)}
                      className="w-5 h-5 rounded-md bg-red-50 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all active:scale-90"
                      title={`Excluir ação de ${acao.jogadorNome}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>            )}
          </div>
        </div>
        </div>

        {showEscalacao && (
          <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-auto flex items-center justify-center">
            <div className="w-full max-w-6xl rounded-[2rem] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Escalação</p>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Montar Escalação do Time</h2>
                  <p className="text-sm text-gray-500 mt-1">Máximo de 14 jogadores: 6 em quadra e 8 no banco.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEscalacao(false)}
                  className="rounded-full bg-gray-100 p-3 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {escalaMsg && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {escalaMsg}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Em Quadra</h3>
                    <span className="text-[11px] font-bold text-gray-600">{escalados.home.length}/6</span>
                  </div>
                  <div className="space-y-3">
                    {escalados.home.length ? escalados.home.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4">
                        <div>
                          <p className="font-black text-gray-900">{player.nome}</p>
                          <p className="text-[11px] uppercase tracking-wider text-gray-500">#{player.numero} • {player.posicao}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePlayerFromEscalacao(player, 'linha')}
                          className="rounded-full bg-red-500 text-white px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-red-600"
                        >Remover</button>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Nenhum jogador em quadra.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Banco de Reservas</h3>
                    <span className="text-[11px] font-bold text-gray-600">{benchPlayers.length}/8</span>
                  </div>
                  <div className="space-y-3">
                    {benchPlayers.length ? benchPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4">
                        <div>
                          <p className="font-black text-gray-900">{player.nome}</p>
                          <p className="text-[11px] uppercase tracking-wider text-gray-500">#{player.numero} • {player.posicao}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePlayerFromEscalacao(player, 'banco')}
                          className="rounded-full bg-red-500 text-white px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-red-600"
                        >Remover</button>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Nenhum jogador no banco.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Disponíveis</h3>
                    <span className="text-[11px] font-bold text-gray-600">{availableEscalacaoPlayers.length} jogadores</span>
                  </div>
                  <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                    {availableEscalacaoPlayers.length ? availableEscalacaoPlayers.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-gray-100 p-4">
                        <div>
                          <p className="font-black text-gray-900">{player.nome}</p>
                          <p className="text-[11px] uppercase tracking-wider text-gray-500">#{player.numero} • {player.posicao}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addPlayerToEscalacao(player, 'linha')}
                            className="rounded-full bg-black text-white px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-gray-900"
                          >Linha</button>
                          <button
                            type="button"
                            onClick={() => addPlayerToEscalacao(player, 'banco')}
                            className="rounded-full bg-red-600 text-white px-3 py-2 text-[11px] font-black uppercase tracking-widest hover:bg-red-700"
                          >Banco</button>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">Sem jogadores disponíveis.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEscalacao(false)}
                  className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-100"
                >Fechar</button>
              </div>
            </div>
          </div>
        )}

        {/* Player Details Modal */}
        {selectedPlayerDetails && (
          <div className="fixed inset-0 z-[10001] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Detalhes do Atleta</h3>
                <button onClick={() => setSelectedPlayerDetails(null)} className="text-gray-400 hover:text-gray-900 transition-colors">✕</button>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center shadow-sm">
                  <span className="text-4xl">👤</span>
                </div>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{selectedPlayerDetails.nome}</p>
                <p className="text-sm font-bold text-gray-500 mt-1">Camisa #{selectedPlayerDetails.numero}</p>
                
                <div className="mt-6 bg-gray-50 rounded-2xl p-4 text-left border border-gray-100">
                  <p className="text-sm font-medium text-gray-600 mb-2"><span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Posição</span> {selectedPlayerDetails.posicao}</p>
                  <p className="text-sm font-medium text-gray-600"><span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">ID do Sistema</span> {selectedPlayerDetails.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Substitution Dialog */}
        {showSubstituicao && (
          <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-auto flex items-center justify-center">
            <div className="w-full max-w-5xl rounded-[2rem] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Painel Tático</p>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Substituição de Atletas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubstituicao(false);
                    setSelectedFieldPlayer(null);
                    setSelectedBenchPlayer(null);
                    setSelectedFieldTeam(null);
                  }}
                  className="rounded-full bg-gray-100 p-3 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Em Campo */}
                <div className="space-y-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Em Campo - {homeLabel}</p>
                  <div className="grid gap-3">
                    {escalados.home.map((player) => (
                      <button
                        key={player?.id || `home-${Math.random()}`}
                        type="button"
                        onClick={() => { setSelectedFieldTeam('home'); setSelectedFieldPlayer(player); }}
                        className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all flex justify-between items-center ${
                          selectedFieldPlayer?.id === player?.id && selectedFieldTeam === 'home' 
                            ? 'border-gray-900 bg-gray-900 text-white shadow-md' 
                            : 'border-gray-100 bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <p className="font-black tracking-tight">{player?.nome || 'Livre'}</p>
                          <p className={`text-[11px] font-bold tracking-wider uppercase mt-1 ${selectedFieldPlayer?.id === player?.id ? 'text-gray-300' : 'text-gray-500'}`}>
                            {player?.posicao || 'Sem posição'}
                          </p>
                        </div>
                        <span className={`text-xl font-black opacity-30 ${selectedFieldPlayer?.id === player?.id ? 'text-white' : 'text-gray-900'}`}>
                          #{player?.numero || '00'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banco e Resumo */}
                <div className="space-y-8 flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Banco de Reservas</p>
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-md">{benchPlayers.length} atletas</span>
                    </div>
                    <div className="grid gap-3 max-h-[300px] overflow-auto pr-2">
                      {benchPlayers.length > 0 ? (
                        benchPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => setSelectedBenchPlayer(player)}
                            className={`w-full rounded-2xl border-2 px-5 py-4 text-left transition-all flex justify-between items-center ${
                              selectedBenchPlayer?.id === player.id 
                                ? 'border-[#00FF2F] bg-[#00FF2F]/10 text-gray-900' 
                                : 'border-gray-100 bg-white text-gray-900 hover:border-gray-300'
                            }`}
                          >
                            <div>
                              <p className="font-black tracking-tight">{player.nome}</p>
                              <p className={`text-[11px] font-bold tracking-wider uppercase mt-1 ${selectedBenchPlayer?.id === player.id ? 'text-green-700' : 'text-gray-500'}`}>
                                {player.posicao}
                              </p>
                            </div>
                            <span className="text-xl font-black text-gray-900 opacity-30">#{player.numero}</span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-medium text-gray-400">
                          Nenhum atleta disponível no banco.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resumo da Troca */}
                  <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100 mt-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex-1 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Saindo</p>
                        <p className="font-black text-gray-900">{selectedFieldPlayer ? selectedFieldPlayer.nome : '---'}</p>
                      </div>
                      <div className="px-4 text-gray-300">
                        <RefreshCw size={20} />
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Entrando</p>
                        <p className="font-black text-gray-900">{selectedBenchPlayer ? selectedBenchPlayer.nome : '---'}</p>
                      </div>
                    </div>

                    {substituicaoMessage.visible && (
                      <div className={`mb-4 rounded-2xl border px-4 py-3 flex items-center gap-3 ${
                        substituicaoMessage.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        {substituicaoMessage.type === 'success' ? (
                          <CheckCircle size={18} className="text-emerald-600" />
                        ) : (
                          <AlertCircle size={18} className="text-red-600" />
                        )}
                        <span className="text-sm font-medium">{substituicaoMessage.text}</span>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      disabled={!selectedFieldPlayer || !selectedBenchPlayer || !selectedFieldTeam}
                      onClick={handleSubstituir}
                      className="w-full rounded-full bg-gray-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar Troca
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <EstatisticaView
          open={showEstatistica}
          onClose={() => setShowEstatistica(false)}
          homeLabel={homeLabel}
          awayLabel={awayLabel}
          matchInfo={matchInfo}
          score={score}
          partidaId={partida?.id}
          onConfirm={handleConfirmarEstatistica}
          onStatisticsChange={() => carregarDadosDoSet(currentSet)}
        />
        <HelpScoutModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

        {/* Encerramento da partida: aparece quando um lado alcanca o alvo de sets */}
        {showFinalizarPartida && (
          <div className="fixed inset-0 z-[10030] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-white border border-gray-100 shadow-2xl p-8">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                Partida decidida
              </p>
              <h2 className="mt-1 text-2xl font-black text-gray-900 tracking-tight">
                {setsGanhos.home > setsGanhos.away ? homeLabel : awayLabel} venceu
              </h2>

              <div className="mt-5 rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center">
                <p className="text-4xl font-black text-gray-900">
                  {setsGanhos.home} <span className="text-gray-300">x</span> {setsGanhos.away}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Sets — melhor de {maxSets}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {setsDaPartida.map((set) => (
                  <span
                    key={`final-${set.numSet}`}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-black text-gray-600"
                  >
                    {set.numSet}º {set.home}-{set.away}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-xs font-medium leading-5 text-gray-500">
                Depois de finalizada a partida não aceita mais alterações. Se algum set ficou errado,
                cancele, reabra o set e corrija antes de finalizar.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinalizarPartida(false)}
                  className="rounded-full bg-gray-100 px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={finalizarPartida}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-500 transition-colors"
                >
                  Finalizar partida
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
    );
  };

  export default ControlePartida;
