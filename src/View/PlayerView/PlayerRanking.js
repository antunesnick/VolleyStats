import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Medal, Trophy, X } from "lucide-react";
import PlayerControl from "../../Control/PlayerControl";
import PositionControl from "../../Control/PositionControl";
import CategoriaControl from "../../Control/CategoriaControl";
import { Alertas } from "../../utils/Alertas";

const SORT_OPTIONS = [
  { id: "efetividade", label: "Efetividade" },
  { id: "acertos", label: "Acertos" },
  { id: "bloqueios", label: "Bloqueios" },
];

const PlayerAvatar = ({ player }) => {
  const [imageError, setImageError] = useState(false);
  const initials = String(player?.nome || "J")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (player?.foto && !imageError) {
    return (
      <img
        src={player.foto}
        alt={player.nome}
        onError={() => setImageError(true)}
        className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-100 object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-900 text-sm font-black text-white">
      {initials || "J"}
    </div>
  );
};

const Metric = ({ label, value, featured }) => (
  <div className={`rounded-lg border px-3 py-2 ${featured ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"}`}>
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className={`mt-0.5 text-xl font-black ${featured ? "text-red-700" : "text-gray-900"}`}>{value}</p>
  </div>
);

const PlayerRanking = ({ open, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [positions, setPositions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [positionId, setPositionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("efetividade");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    Promise.all([
      PositionControl.getInstance().findAllPositions(),
      CategoriaControl.getInstance().listarCategorias(),
    ])
      .then(([positionData, categoryData]) => {
        setPositions(positionData || []);
        setCategories(categoryData || []);
      })
      .catch((error) => {
        console.error("Erro ao carregar filtros do ranking:", error);
        Alertas.erro("Nao foi possivel carregar os filtros do ranking.");
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoading(true);
    PlayerControl.getInstance()
      .buscarRankingJogadores({
        posicaoId: positionId,
        categoriaId: categoryId,
        ordenacao: sortBy,
      })
      .then((data) => setRanking(data || []))
      .catch((error) => {
        console.error("Erro ao carregar ranking de jogadores:", error);
        Alertas.erro("Nao foi possivel carregar o ranking de jogadores.");
      })
      .finally(() => setLoading(false));
  }, [open, positionId, categoryId, sortBy]);

  const leader = ranking[0];
  const totalAcoes = useMemo(
    () => ranking.reduce((sum, player) => sum + (Number(player.totalAcoes) || 0), 0),
    [ranking]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-auto bg-black/45 p-2 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Ranking geral</p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-gray-950">Jogadores</h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
              aria-label="Fechar ranking"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={positionId}
              onChange={(event) => setPositionId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-red-500"
            >
              <option value="">Todas as posicoes</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.nome}
                </option>
              ))}
            </select>

            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-red-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nome}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSortBy(option.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black uppercase transition-colors ${
                    sortBy === option.id
                      ? "bg-gray-950 text-white"
                      : "text-gray-500 hover:bg-white hover:text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Lider" value={leader?.nome || "--"} featured />
            <Metric label="Jogadores" value={ranking.length} />
            <Metric label="Acoes registradas" value={totalAcoes} />
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
            <div className="grid grid-cols-[56px_1.7fr_0.8fr_0.8fr_0.8fr] gap-2 bg-gray-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-300">
              <span>#</span>
              <span>Jogador</span>
              <span className="text-center">Acertos</span>
              <span className="text-center">Bloqueios</span>
              <span className="text-center">Efetividade</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm font-bold text-gray-500">Carregando ranking...</div>
            ) : ranking.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-500">
                Nenhum jogador encontrado para esses filtros.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {ranking.map((player, index) => (
                  <div
                    key={player.id}
                    className="grid grid-cols-[56px_1.7fr_0.8fr_0.8fr_0.8fr] items-center gap-2 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {index === 0 ? <Trophy size={18} className="text-red-600" /> : <Medal size={18} className="text-gray-300" />}
                      <span className="text-sm font-black text-gray-900">{index + 1}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase text-gray-950">{player.nome}</p>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">#{player.numCamisa || "--"}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">{player.posicaoNome}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">{player.categoriaNome}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-lg font-black text-gray-900">{player.acertos}</div>
                    <div className="text-center text-lg font-black text-gray-900">{player.bloqueios}</div>
                    <div className="flex items-center justify-center gap-1 text-lg font-black text-red-700">
                      <BarChart3 size={16} />
                      {player.efetividade}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerRanking;
