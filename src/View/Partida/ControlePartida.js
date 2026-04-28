 import React, { use, useEffect, useMemo, useState, useRef } from 'react';
  import PontoControl from '../../Control/PontoControl' 
  import PlayerControl from '../../Control/PlayerControl';
  import { ArrowLeft, ChevronDown, LayoutGrid, Play, Square, Download, RefreshCw, MapPin } from 'lucide-react';
  import { useHotkeys } from 'react-hotkeys-hook';
  import EstatisticaView from './EstatisticaView';

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
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 shadow-sm flex flex-col items-center justify-center transition-all ${
          isVisitor 
            ? 'border-orange-200 bg-orange-50 cursor-default pointer-events-none opacity-60' 
            : 'border-gray-200 bg-white hover:border-red-500 hover:shadow-md cursor-pointer'
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
      <div className="relative w-full max-w-[500px] mx-auto scale-95 sm:scale-100 transition-transform">
        <svg viewBox="0 0 400 460" className="w-full h-[460px] drop-shadow-xl">
          {/* Fundo da quadra com estilo mais clean */}
          <rect x="20" y="20" width="360" height="420" fill="#ffffff" stroke="#e2e8f0" strokeWidth="3" rx="4" />
          <rect x="20" y="20" width="360" height="420" fill="#f8fafc" stroke="none" rx="4" />

          {/* Rede */}
          <line x1="15" y1="230" x2="385" y2="230" stroke="#1e293b" strokeWidth="4" />
          <text x="200" y="225" textAnchor="middle" className="text-[10px] font-black tracking-[0.2em] fill-gray-400">REDE</text>

          {/* Linhas de ataque */}
          <line x1="20" y1="140" x2="380" y2="140" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
          <line x1="20" y1="320" x2="380" y2="320" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 4" />
        </svg>

        <div className="absolute inset-0">
          <div className="absolute left-0 right-0 top-[10%] flex justify-around items-center px-8">
            {visitorBackPlayers.map((_, index) => <PlayerSpot key={`visitor-back-${index}`} isVisitor={true} />)}
          </div>
          <div className="absolute left-0 right-0 top-[28%] flex justify-around items-center px-8">
            {visitorFrontPlayers.map((_, index) => <PlayerSpot key={`visitor-front-${index}`} isVisitor={true} />)}
          </div>
          <div className="absolute left-0 right-0 top-[54%] flex justify-around items-center px-8">
            {frontPlayers.map((player, index) => (
              <PlayerSpot key={`home-front-${index}`} player={player} position={index + 1} onClick={onPlayerClick} />
            ))}
          </div>
          <div className="absolute left-0 right-0 top-[76%] flex justify-around items-center px-8">
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
    const [formation, setFormation] = useState('Padrão 6-6');
    const [isFormationOpen, setIsFormationOpen] = useState(false);
    const [liveStatus, setLiveStatus] = useState(
      String(partida?.status || '').toUpperCase() === 'FINALIZADA' ? 'Finalizada' : 'Aguardando'
    );
    const [activityText, setActivityText] = useState('');
    const [feed, setFeed] = useState([]);
    const [players, setPlayers] = useState([]);
    const [escalados, setEscalados] = useState({ home: [], away: [] });
    const [currentSet, setCurrentSet] = useState(1);
    const [pontosDoSet, setPontosDoSet] = useState([]);
    const [showSubstituicao, setShowSubstituicao] = useState(false);
    const [showFinalizarPartida, setShowFinalizarPartida] = useState(false);
    const [editandoEncerramento, setEditandoEncerramento] = useState(false);
    const [placarFinalDraft, setPlacarFinalDraft] = useState({ home: 0, away: 0 });
  const [selectedFieldPlayer, setSelectedFieldPlayer] = useState(null);
    const [selectedFieldTeam, setSelectedFieldTeam] = useState(null);
    const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
    const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
    const [showEstatistica, setShowEstatistica] = useState(false);

    const homeLabel = useMemo(() => partida?.time1Nome || partida?.time1 || 'Mandante', [partida]);
    const awayLabel = useMemo(() => partida?.time2Nome || partida?.time2 || 'Visitante', [partida]);

    useHotkeys('shift+up', (e) => {
      e.preventDefault(setScore({ home: score.home+1, away: score.away }));
      ;
    });

    useHotkeys('tab+up', (e) => {  
      e.preventDefault();
      setScore({ home: score.home, away: score.away+1 });
    });

    useHotkeys('shift+down', (e) => {  
      e.preventDefault();
      setScore({ home: Math.max(0, score.home-1), away: score.away });
    });

    useHotkeys('tab+down', (e) => {
      e.preventDefault();
      setScore({ home: score.home, away: Math.max(0, score.away-1) });
    });

    const [buffer, setBuffer] = useState({ numero: '', acao: '', qualidade: '' });

    useHotkeys('ctrl+1, ctrl+2, ctrl+3, ctrl+4, ctrl+5, ctrl+6, ctrl+7, ctrl+8, ctrl+9, ctrl+0', (event) => {
      event.preventDefault(); 
      const num = event.key;
      setBuffer((prev) => {
            if (prev.numero.length >= 3 || prev.acao) return prev;
        return { ...prev, numero: prev.numero + num };
      });
    }, { enableOnFormTags: false }, [buffer])

    // 2. Soltou o Control e digitou a Ação (S=Saque, A=Ataque, B=Bloqueio, R=Recepção, D=Defesa)
   useHotkeys('s, a, b, c, r, d', (event) => {
    // Se não digitou a camisa ainda, a gente ignora qualquer letra
    if (!buffer.numero) return;

    const tecla = event.key.toUpperCase(); // Garante que 'a' vire 'A'

    // ESTÁGIO 1: Esperando a Ação
    if (!buffer.acao) {
      if (['S', 'A', 'B', 'R', 'D'].includes(tecla)) {
        setBuffer((prev) => ({ ...prev, acao: tecla }));
      }
      return;
    }
    if (['A', 'B', 'C'].includes(tecla)) {
      const codigoScout = `${buffer.numero}${buffer.acao}${tecla}`;
      setBuffer((prev) => ({ ...prev, qualidade: tecla }));
      console.log("Scout registrado com sucesso:", codigoScout);
      // -> MANDAR O BUFFER PARA O BANCO AQUI <-
       try {
        alert(`Registrando Ponto: Jogador ${buffer.numero}, Ação ${buffer.acao}, Qualidade ${tecla}`);
    const control = PontoControl.getInstance();
    const jogador = players.find(p => String(p.numero) === String(buffer.numero));  
    const tipoAcaoMap = { S: 1, A: 2, B: 3, R: 4, D: 5 }; // IDs conforme sua tabela TipoAcao
    const tipoAcao = { idTipoAcao: tipoAcaoMap[buffer.acao] };

    if (jogador && partida?.id) {
      console.log('=== GRAVANDO PONTO ===');
    console.log('partida.id:', partida.id);
    console.log('currentSet:', currentSet);
    console.log('score:', score.home, score.away);
    console.log('jogador:', jogador);
    console.log('tipoAcao:', tipoAcao);
    console.log('qualidade (tecla):', tecla);
      control.gravarPonto(
  { ...partida, id: parseInt(partida.id) }, // ← id como inteiro
  parseInt(currentSet),
  score.home,
  score.away,
  jogador,
  tipoAcao,
  tecla
);
        carregarPontosDoSet(currentSet); // Atualiza a barra lateral
      }
      else {
   alert('Jogador não encontrado para o número: ' + buffer.numero);
}
    } catch (error) {
      alert('Erro ao registrar ponto: ' + error.message);
    }
      // Limpa o buffer para o próximo rally
      setBuffer({ numero: '', acao: '', qualidade: '' });
    }
  }, { enableOnFormTags: false }, [buffer]);

    useHotkeys('esc', () => {
      setBuffer({ numero: '', acao: '', qualidade: '' });
    });

    const estaDigitando = buffer.numero.length > 0;

    const currentSetRef = useRef(currentSet);
    useEffect(() => { currentSetRef.current = currentSet; }, [currentSet]);

    // 2. Corrigir carregarPontosDoSet para usar a ref
    const carregarPontosDoSet = (numSet) => {
  try {
    const control = PontoControl.getInstance();
    const pontos = control.buscarPontosPorSet(
      parseInt(partida.id),   // ← forçar inteiro
      parseInt(numSet)         // ← forçar inteiro
    );
    console.log('Pontos carregados:', pontos);
    setPontosDoSet(pontos);
  } catch (error) {
    console.error('Erro ao carregar pontos:', error);
  }
};

useEffect(() => {
  if (partida?.id) carregarPontosDoSet(currentSet);
}, [currentSet, partida?.id]);

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
        gymnasium: "Arena Central"
      };
    }, [partida]);

    useEffect(() => {
      const loadPlayers = async () => {
        try {
          const control = PlayerControl.getInstance();
          const data = await control.findAllPlayers();
          const formatted = data.map((player) => ({
            id: player.id,
            nome: player.nome || 'Jogador',
            numero: player.numCamisa || player.id,
            posicao: player.posicao_id ? `Posição ${player.posicao_id}` : 'Sem posição',
          }));
          setPlayers(formatted);
        } catch (error) {
          console.error('Erro ao carregar jogadores:', error);
        }
      };
      loadPlayers();
    }, []);

    useEffect(() => {
      if (players.length && escalados.home.length === 0 && escalados.away.length === 0) {
        setEscalados({ home: players.slice(0, 6), away: players.slice(6, 12) });
      }
    }, [players, escalados.home.length, escalados.away.length]);

  useEffect(() => {
    const loadScore = async () => {
      if(partida?.pontosTime1 !== null && partida?.pontosTime2 !== null) {
        setScore({ home: partida.pontosTime1, away: partida.pontosTime2 });
      }
    }
    loadScore();
  },[]);

    const benchPlayers = useMemo(() => {
      const escaladosIds = new Set(escalados.home.map((player) => player?.id));
      return players.filter((player) => !escaladosIds.has(player.id));
    }, [players, escalados.home]);

    const handleSendAction = (e) => {
      e.preventDefault();
      if (!activityText.trim()) return;
      setFeed((current) => [{ id: Date.now(), text: activityText.trim() }, ...current]);
      setActivityText('');
    };

    const changeScore = (side, delta) => {
      setScore((current) => ({ ...current, [side]: Math.max(0, current[side] + delta) }));
    };

    const handleSubstituir = () => {
      if (!selectedFieldTeam || !selectedFieldPlayer || !selectedBenchPlayer) return;
      setEscalados((current) => ({
        ...current,
        [selectedFieldTeam]: current[selectedFieldTeam].map((player) =>
          player.id === selectedFieldPlayer.id ? selectedBenchPlayer : player
        ),
      }));
      setSelectedFieldPlayer(null);
      setSelectedFieldTeam(null);
      setSelectedBenchPlayer(null);
      setShowSubstituicao(false);
    };

    const handleIniciarPartida = () => {
      setLiveStatus('Em andamento');
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

      
      <div className="relative h-screen w-full bg-white overflow-hidden font-['Inter',sans-serif]">
       {estaDigitando && (
        <div className="fixed bottom-8 left-8 z-[10000] pointer-events-none transition-all">
          <div className="bg-slate-900 text-white px-6 py-5 rounded-3xl shadow-2xl border border-slate-700 flex flex-col items-start animate-in slide-in-from-bottom-6 fade-in duration-200">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Registrando Scout
            </p>
            
            <div className="text-5xl font-black font-mono tracking-tighter flex items-center gap-3">
              {/* Número */}
              <span className="text-red-500 min-w-[1ch]">
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
                ? "Solte Ctrl + Ação (S, A, B, R, D)" 
                : "Qualidade (A, B, C)"}
            </p>
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

            {/* ScoreBoard within Side Panel */}
            <div className="p-6 border-b border-gray-100 grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-2xl p-4 text-center cursor-pointer hover:bg-gray-800 transition" onClick={() => changeScore('home', 1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Mandante</span>
                <span className="text-4xl font-black text-white">{score.home}</span>
              </div>
              <div className="bg-orange-500 rounded-2xl p-4 text-center cursor-pointer hover:bg-orange-600 transition" onClick={() => changeScore('away', 1)}>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 block mb-1">Visitante</span>
                <span className="text-4xl font-black text-white">{score.away}</span>
              </div>
            </div>

            {/* Pontos do Set */}
<div className="flex-1 overflow-auto p-6 bg-gray-50/30">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
      Pontos — Set {currentSet}
    </h3>
    <div className="flex items-center gap-1">
      <button
        onClick={() => {
          const novoSet = Math.max(1, currentSet - 1);
          setCurrentSet(novoSet);
          carregarPontosDoSet(novoSet); // ← já carrega com o valor novo
        }}
      >‹</button>

      <button
        onClick={() => {
          const novoSet = currentSet + 1;
          setCurrentSet(novoSet);
          carregarPontosDoSet(novoSet);
        }}
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
                    
                    {/* Lista de Ações ocorridas neste ponto */}
                    {ponto.acoes && ponto.acoes.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-gray-50 flex flex-col gap-1.5">
                        {ponto.acoes.map((acao, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50/50 p-1.5 rounded-lg">
                            <span className="font-medium truncate pr-2">
                              #{acao.jogadorNumero || '00'} - {acao.jogadorNome || 'Jogador'}
                            </span>
                            <div className="flex gap-2 items-center flex-shrink-0">
                              <span className="font-bold text-gray-800">{acao.tipoAcaoNome}</span>
                              <span className="font-bold bg-white border border-gray-200 px-2 py-0.5 rounded text-[10px] shadow-sm">
                                {acao.qualidade}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>            )}
          </div>
                      {/* Command Bar Form */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <form onSubmit={handleSendAction} className="relative">
                <input
                  value={activityText}
                  onChange={(e) => setActivityText(e.target.value)}
                  placeholder="Ex: Ponto de bloqueio..."
                  className="w-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-900 rounded-full px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white rounded-full p-2 hover:bg-gray-800 transition-colors">
                  <Play size={14} className="ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

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
        />
      </div>
    );
  };

  export default ControlePartida;
