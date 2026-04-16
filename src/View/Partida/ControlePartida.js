import React, { useEffect, useMemo, useState } from 'react';
import PlayerControl from '../../Control/PlayerControl';

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

  // Bolinhas genéricas para visitantes (sem dados)
  const visitorFrontPlayers = Array(config.front).fill(null);
  const visitorBackPlayers = Array(config.back).fill(null);

  const PlayerSpot = ({ player, position, onClick, isVisitor = false }) => (
    <button
      type="button"
      onClick={() => !isVisitor && onClick && onClick(player)}
      className={`w-16 h-16 rounded-full border-2 shadow-lg flex flex-col items-center justify-center transition-colors ${
        isVisitor 
          ? 'border-orange-300 bg-orange-100 cursor-default pointer-events-none' 
          : 'border-slate-300 bg-white hover:border-red-500 cursor-pointer'
      }`}
    >
      <span className={`text-xs font-bold ${isVisitor ? 'text-orange-700' : 'text-slate-900'}`}>
        {isVisitor ? 'V' : (player?.numero || position)}
      </span>
      <span className={`text-[10px] uppercase ${isVisitor ? 'text-orange-600' : 'text-slate-500'}`}>
        {isVisitor ? 'Visitante' : (player?.nome?.slice(0, 3) || '---')}
      </span>
    </button>
  );

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Quadra de vôlei */}
      <svg viewBox="0 0 400 460" className="w-full h-[460px]">
        {/* Fundo da quadra */}
        <rect x="20" y="20" width="360" height="420" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />

        {/* Rede */}
        <line x1="20" y1="230" x2="380" y2="230" stroke="#64748b" strokeWidth="4" />
        <text x="200" y="225" textAnchor="middle" className="text-xs fill-slate-600">REDE</text>

        {/* Linhas de ataque */}
        <line x1="20" y1="140" x2="380" y2="140" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="20" y1="320" x2="380" y2="320" stroke="#cbd5e1" strokeWidth="1" />

        {/* Áreas */}
        <text x="200" y="90" textAnchor="middle" className="text-xs fill-slate-500">ATAQUE VISITANTE</text>
        <text x="200" y="410" textAnchor="middle" className="text-xs fill-slate-500">DEFESA MANDANTE</text>
      </svg>

      {/* Posições dos jogadores */}
      <div className="absolute inset-0">
        <div className="absolute left-0 right-0 top-[12%] flex justify-around items-center px-4">
          {visitorBackPlayers.map((_, index) => (
            <PlayerSpot key={`visitor-back-${index}`} isVisitor={true} />
          ))}
        </div>

        <div className="absolute left-0 right-0 top-[28%] flex justify-around items-center px-4">
          {visitorFrontPlayers.map((_, index) => (
            <PlayerSpot key={`visitor-front-${index}`} isVisitor={true} />
          ))}
        </div>

        <div className="absolute left-0 right-0 top-[54%] flex justify-around items-center px-4">
          {frontPlayers.map((player, index) => (
            <PlayerSpot key={`home-front-${index}`} player={player} position={index + 1} onClick={onPlayerClick} />
          ))}
        </div>

        <div className="absolute left-0 right-0 top-[72%] flex justify-around items-center px-4">
          {backPlayers.map((player, index) => (
            <PlayerSpot key={`home-back-${index}`} player={player} position={config.front + index + 1} onClick={onPlayerClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

const PlayerDetailsModal = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Detalhes do Jogador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <p className="font-bold text-slate-900">{player.nome}</p>
            <p className="text-sm text-slate-500">#{player.numero}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Posição:</span> {player.posicao}</p>
            <p><span className="font-semibold">ID:</span> {player.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlePartida = ({ partida, aoVoltar }) => {
  const [score, setScore] = useState({ home: 6, away: 3 });
  const [formation, setFormation] = useState('Padrão 6-6');
  const [liveStatus, setLiveStatus] = useState('Aguardando');
  const [activityText, setActivityText] = useState('Bloqueio na rede, saque potente, ponto do time!');
  const [feed, setFeed] = useState([]);
  const [players, setPlayers] = useState([]);
  const [escalados, setEscalados] = useState({ home: [], away: [] });
  const [showSubstituicao, setShowSubstituicao] = useState(false);
  const [selectedFieldPlayer, setSelectedFieldPlayer] = useState(null);
  const [selectedFieldTeam, setSelectedFieldTeam] = useState(null);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const homeLabel = useMemo(
    () => partida?.time1Nome || partida?.time1 || 'Mandante',
    [partida]
  );
  const awayLabel = useMemo(
    () => partida?.time2Nome || partida?.time2 || 'Visitante',
    [partida]
  );
  const matchDate = useMemo(() => {
    if (!partida?.dataPartida) return 'Data não definida';
    const date = new Date(partida.dataPartida);
    if (Number.isNaN(date.getTime())) return partida.dataPartida;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [partida?.dataPartida]);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const control = new PlayerControl();
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
      setEscalados({
        home: players.slice(0, 6),
        away: players.slice(6, 12),
      });
    }
  }, [players, escalados.home.length, escalados.away.length]);

  const benchPlayers = useMemo(() => {
    const escaladosIds = new Set(escalados.home.map((player) => player?.id));
    return players.filter((player) => !escaladosIds.has(player.id));
  }, [players, escalados.home]);

  const handleSendAction = (e) => {
    e.preventDefault();
    if (!activityText.trim()) return;

    setFeed((current) => [
      { id: Date.now(), text: activityText.trim() },
      ...current,
    ]);
    setActivityText('');
  };

  const changeScore = (side, delta) => {
    setScore((current) => ({
      ...current,
      [side]: Math.max(0, current[side] + delta),
    }));
  };

  const handleSelectFieldPlayer = (team, player) => {
    setSelectedFieldTeam(team);
    setSelectedFieldPlayer(player);
  };

  const handleSelectBenchPlayer = (player) => {
    setSelectedBenchPlayer(player);
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayerDetails(player);
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

  const partidaNome = partida?.nome || 'Controle de Partida';

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto bg-slate-50 text-slate-900 p-6 lg:p-10">
      <div className="max-w-[1440px] mx-auto min-h-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-10">
          <button
            type="button"
            onClick={aoVoltar}
            className="inline-flex items-center gap-2 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:border-slate-400"
          >
            <span className="text-lg">←</span>
            Voltar
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Arena Central
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> {liveStatus}
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-7">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Mandante</p>
                    <p className="text-5xl font-black tracking-tight mt-4 text-emerald-300">{score.home}</p>
                    <p className="mt-2 text-sm text-slate-300">{homeLabel}</p>
                  </div>
                  <div className="rounded-3xl bg-orange-500 p-5 text-white shadow-lg">
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-100">Visitante</p>
                    <p className="text-5xl font-black tracking-tight mt-4 text-white">{score.away}</p>
                    <p className="mt-2 text-sm text-white/90">{awayLabel}</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-xl sm:min-w-[220px]">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Partida</p>
                  <p className="text-4xl font-black mt-4">{partidaNome}</p>
                  <p className="mt-3 text-sm text-slate-300">{matchDate}</p>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-inner">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Formação</div>
                      <select
                        value={formation}
                        onChange={(e) => setFormation(e.target.value)}
                        className="w-full max-w-[260px] rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition focus:border-red-500 focus:outline-none"
                      >
                        <option>Padrão 6-6</option>
                        <option>2-4-0</option>
                        <option>4-2-0</option>
                        <option>5-1-0</option>
                      </select>
                    </div>
                    <div className="rounded-3xl bg-slate-950 px-5 py-3 text-white shadow-xl text-center">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Formação ativa</p>
                      <p className="mt-3 text-lg font-black">{formation}</p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 text-center">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Quadra - {homeLabel}</p>
                        <p className="text-xl font-black text-slate-900">{escalados.home.length} jogadores em campo</p>
                      </div>
                      <VolleyballCourt players={escalados.home} formation={formation} onPlayerClick={handlePlayerClick} />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSubstituicao(true)}
                      className="rounded-3xl bg-red-600 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:bg-red-700"
                    >
                      Substituir Jogadores
                    </button>
                    <p className="text-sm text-slate-500">Acesse a tela de substituições para trocar atletas em campo.</p>
                  </div>
                </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => changeScore('home', 1)}
                  className="rounded-3xl bg-slate-900 py-4 text-white shadow-lg transition hover:bg-slate-800"
                >
                  + ponto Mandante
                </button>
                <button
                  type="button"
                  onClick={() => changeScore('away', 1)}
                  className="rounded-3xl bg-orange-500 py-4 text-white shadow-lg transition hover:bg-orange-600"
                >
                  + ponto Visitante
                </button>
                <button
                  type="button"
                  onClick={() => setLiveStatus((current) => (current === 'Aguardando' ? 'Em andamento' : 'Aguardando'))}
                  className="rounded-3xl border border-slate-300 bg-white py-4 font-bold text-slate-900 shadow-sm transition hover:border-slate-400"
                >
                  {liveStatus === 'Aguardando' ? 'Iniciar Partida' : 'Pausar Partida'}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl sticky top-6 self-start">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Feed da partida</p>
                  <h2 className="mt-3 text-2xl font-black text-slate-900">Ações e jogadas</h2>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Exportação em desenvolvimento')}
                  className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Exportar
                </button>
              </div>

              <form onSubmit={handleSendAction} className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={activityText}
                    onChange={(e) => setActivityText(e.target.value)}
                    className="min-w-0 flex-1 rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    placeholder="Use os botões acima para marcar pontos, alterar formação e abrir as substituições."
                  />
                  <button
                    type="submit"
                    className="rounded-3xl bg-red-600 px-6 py-4 text-sm font-black text-white transition hover:bg-red-700"
                  >
                    Registrar
                  </button>
                </div>
              </form>

              <div className="mt-8 space-y-3">
                {feed.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Nenhuma atividade registrada ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {feed.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 shadow-sm">
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-7">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Campeonato</p>
                  <h1 className="mt-4 text-3xl font-black text-slate-950">2026</h1>
                </div>
                <div className="rounded-3xl bg-amber-100 px-4 py-3 text-amber-900 shadow-sm">
                  <span className="text-lg font-black">🏆</span>
                </div>
              </div>

              <div className="mt-7 rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-slate-900 p-6 text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Mandante</p>
                    <p className="mt-4 text-5xl font-black">{score.home}</p>
                  </div>
                  <div className="rounded-3xl bg-amber-500 p-6 text-center text-white">
                    <p className="text-xs uppercase tracking-[0.25em] text-amber-100">Visitante</p>
                    <p className="mt-4 text-5xl font-black">{score.away}</p>
                  </div>
                </div>
                <div className="mt-7 text-sm text-slate-300">
                  <p className="uppercase tracking-[0.25em] text-slate-500">Data</p>
                  <p className="mt-2">{matchDate}</p>
                </div>
              </div>

              <div className="mt-7 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 shadow-sm">
                <div className="flex items-center gap-3 text-slate-500 uppercase tracking-[0.25em] font-bold">
                  <span className="text-lg">⏱️</span>
                  Feed de jogo
                </div>
                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">
                  {feed.length}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl">
              <div className="flex items-center gap-3 text-slate-900">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-2xl">ℹ️</span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">Painel de controle</p>
                  <p className="mt-3 text-sm text-slate-600">Use os botões acima para marcar pontos, alterar formação e abrir as substituições.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {selectedPlayerDetails && (
        <PlayerDetailsModal player={selectedPlayerDetails} onClose={() => setSelectedPlayerDetails(null)} />
      )}

      {showSubstituicao && (
        <div className="fixed inset-0 z-[10000] bg-black/70 p-6 overflow-auto">
          <div className="mx-auto max-w-6xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Substituição</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">Substituir jogadores em campo</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSubstituicao(false);
                  setSelectedFieldPlayer(null);
                  setSelectedBenchPlayer(null);
                  setSelectedFieldTeam(null);
                }}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Jogadores em campo - {homeLabel}</p>
                  <div className="mt-4 space-y-3">
                    {escalados.home.map((player) => (
                      <button
                        key={player?.id || `home-${player?.numero}`}
                        type="button"
                        onClick={() => handleSelectFieldPlayer('home', player)}
                        className={`w-full rounded-3xl border px-4 py-3 text-left transition ${selectedFieldPlayer?.id === player?.id && selectedFieldTeam === 'home' ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <p className="font-bold text-slate-900">{player?.nome || 'Livre'}</p>
                        <p className="text-xs text-slate-500">#{player?.numero || '00'} • {player?.posicao || 'Sem posição'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Banco de reservas</p>
                      <p className="text-sm text-slate-700">Selecione o jogador que entrará em campo</p>
                    </div>
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">{benchPlayers.length} reservas</span>
                  </div>
                  <div className="grid gap-3 max-h-[420px] overflow-auto">
                    {benchPlayers.length > 0 ? (
                      benchPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => handleSelectBenchPlayer(player)}
                          className={`w-full rounded-3xl border px-4 py-3 text-left transition ${selectedBenchPlayer?.id === player.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                          <p className="font-bold text-slate-900">{player.nome}</p>
                          <p className="text-xs text-slate-500">#{player.numero} • {player.posicao}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        Não há jogadores de reserva disponíveis.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-3">Resumo da substituição</p>
                  <div className="space-y-3 text-sm text-slate-700">
                    <p><span className="font-bold">Saindo:</span> {selectedFieldPlayer ? selectedFieldPlayer.nome : 'Selecione um jogador em campo'}</p>
                    <p><span className="font-bold">Entrando:</span> {selectedBenchPlayer ? selectedBenchPlayer.nome : 'Selecione um reserva'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedFieldPlayer || !selectedBenchPlayer || !selectedFieldTeam}
                    onClick={handleSubstituir}
                    className="mt-5 w-full rounded-3xl bg-red-600 px-5 py-4 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Confirmar substituição
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlePartida;
