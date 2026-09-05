import React, { useState, useEffect } from "react";
import { FileText, Settings, Trash2, Pencil, ChevronRight, Plus, Search, Trophy } from "lucide-react";
import * as Style from "./PleayerStyles"; 
import PlayerControl from "../../Control/PlayerControl"; 
import PositionControl from "../../Control/PositionControl"; 
import { PlayerRegView } from "../PlayerRegister/PlayerRegView";
import PlayerReportModal from "./PlayerReportModal";
import PlayerRanking from "./PlayerRanking";
import { Alertas, mensagemDeErro } from "../../utils/Alertas";

const PlayerAvatar = ({ player }) => {
  const [imageError, setImageError] = useState(false);
  const partesNome = String(player?.nome || "Jogador").trim().split(/\s+/).filter(Boolean);
  const iniciais = `${partesNome[0]?.slice(0, 1) || "J"}${partesNome.length > 1 ? partesNome[partesNome.length - 1].slice(0, 1) : ""}`.toUpperCase();

  if (player?.foto && !imageError) {
    return (
      <Style.PlayerImage
        src={player.foto}
        alt={player.nome}
        onError={() => setImageError(true)}
      />
    );
  }

  return <Style.PlayerInitial>{iniciais}</Style.PlayerInitial>;
};

export function PlayerView({ onOpenMatchReport, matchReportLoading = false }) {
  const [players, setPlayers] = useState([]); 
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [positions, setPositions] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportPlayer, setReportPlayer] = useState(null);
  const [rankingOpen, setRankingOpen] = useState(false);

  useEffect(() => {
    const positionControl = PositionControl.getInstance();
    positionControl
      .findAllPositions()
      .then((data) => setPositions(data))
      .catch((error) => {
        console.error("Erro ao carregar posicoes:", error);
        Alertas.erro(mensagemDeErro(error, "Nao foi possivel carregar as posicoes."));
      });
  }, []);

  useEffect(() => {
    fetchPlayers(searchTerm, selectedPosition);
  }, [searchTerm, selectedPosition]);

  function fetchPlayers(nome = "", posicaoId = "") {
    const playerControl = PlayerControl.getInstance();
    playerControl.findPlayerFiltered({ nome, posicaoId }).then((data) => {
      const formattedPlayers = (data || []).map((p) => ({
        id: p.id,
        nome: p.nome, 
        numCamisa: p.numCamisa, 
        foto: p.foto || "",
        cpf: p.cpf,
        rg: p.rg,
        altura: p.altura, 
        posicaoId: p.posicao_id,
        posicaoNome: p.posicao, 
        categoriaId: p.categoria_id,
        categoria_id: p.categoria_id,
        categoriaNome: p.categoria,
        dataNasc: p.dataNasc, 
      }));
      setPlayers(formattedPlayers);
    })
    .catch((error) => {
      console.error("Erro ao carregar jogadores:", error);
      Alertas.erro(mensagemDeErro(error, "Nao foi possivel carregar os jogadores."));
    });
  }

  /**
   * Descreve, em uma frase, o historico de scout que a exclusao apaga junto.
   *
   * Sem isso o analista confirmava no escuro: o atleta some e leva com ele as
   * acoes registradas nas partidas em que ja jogou.
   */
  const descreverVinculos = (vinculos) => {
    const partes = [];

    if (vinculos.acoes > 0) {
      partes.push(
        `${vinculos.acoes} acao(oes) de scout` +
        (vinculos.partidas > 0 ? ` em ${vinculos.partidas} partida(s)` : "")
      );
    }
    if (vinculos.escalacoes > 0) partes.push(`${vinculos.escalacoes} escalacao(oes)`);
    if (vinculos.substituicoes > 0) partes.push(`${vinculos.substituicoes} substituicao(oes)`);
    if (vinculos.times > 0) partes.push(`${vinculos.times} vinculo(s) com time`);

    return partes.join(", ");
  };

  const deletePlayer = async (id) => {
    const playerControl = PlayerControl.getInstance();

    let vinculos = { total: 0 };
    try {
      vinculos = await playerControl.contarVinculos(id);
    } catch (error) {
      // Sem a contagem a exclusao ainda funciona; o aviso e que fica generico.
      console.error("Erro ao contar vinculos do jogador:", error);
    }

    const resumo = vinculos.total > 0 ? descreverVinculos(vinculos) : "";
    const confirmado = await Alertas.confirmacao(
      resumo
        ? `Este jogador tem ${resumo}. Excluir o jogador apaga tudo isso tambem. Esta acao e irreversivel.`
        : "Esta acao e irreversivel. Deseja realmente excluir este jogador?"
    );

    if (!confirmado) {
      return;
    }

    try {
      await playerControl.deletePlayer(id);
      fetchPlayers(searchTerm, selectedPosition);
      Alertas.sucesso("Jogador excluido com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir jogador:", error);
      Alertas.erro(mensagemDeErro(error, "Nao foi possivel excluir o jogador."));
    }
  };

  const handleAdd = () => {
    setSelectedPlayer(null); 
    setIsModalOpen(true);   
  };

  const handleEdit = (player) => {
    setSelectedPlayer(player); 
    setIsModalOpen(true);      
  };

  /**
   * Devolve true quando o jogador foi gravado. O modal so fecha nesse caso: em
   * erro de validacao (CPF invalido, por exemplo) o analista precisa ver a
   * mensagem com o formulario ainda preenchido para corrigir o campo.
   */
  const handleSavePlayer = async (formData) => {
    const playerControl = PlayerControl.getInstance();

    try {
      if (formData.id) {
        await playerControl.updatePlayer(formData);
        Alertas.sucesso("Jogador atualizado com sucesso.");
      } else {
        await playerControl.createPlayer(formData);
        Alertas.sucesso("Jogador cadastrado com sucesso.");
      }

      fetchPlayers(searchTerm, selectedPosition);
      setIsModalOpen(false);
      return true;
    } catch (error) {
      console.error("Erro ao salvar jogador:", error);
      Alertas.erro(mensagemDeErro(error, "Nao foi possivel salvar o jogador."));
      return false;
    }
  };

  const handleCloseReport = () => {
    setReportOpen(false);
    setReportLoading(false);
    setReportData(null);
    setReportPlayer(null);
  };

  const handleOpenReport = async (player) => {
    if (!player?.id) {
      return;
    }

    setReportOpen(true);
    setReportLoading(true);
    setReportData(null);
    setReportPlayer(player);

    try {
      const report = await PlayerControl.getInstance().buscarRelatorioJogador(player.id);
      if (!report) {
        Alertas.aviso("Relatorio nao encontrado para este jogador.");
      }
      setReportData(report);
    } catch (error) {
      console.error("Erro ao carregar relatorio do jogador:", error);
      Alertas.erro("Nao foi possivel carregar o relatorio do jogador.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <Style.Container>
      <Style.TopBar>
        <Style.ManageButton
          type="button"
          onClick={() => setRankingOpen(true)}
        >
          <Trophy size={16} />
          Ranking
        </Style.ManageButton>
        {typeof onOpenMatchReport === "function" && (
          <Style.ManageButton
            type="button"
            onClick={onOpenMatchReport}
            disabled={matchReportLoading}
          >
            <FileText size={16} />
            {matchReportLoading ? "Emitindo..." : "Relatorio Partidas"}
          </Style.ManageButton>
        )}
        <Style.ManageButton
          $isEditing={isEditing}
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings size={16} />
          {isEditing ? "Concluir Edição" : "Gerenciar Elenco"}
        </Style.ManageButton>
      </Style.TopBar>

      <Style.Section>
        <Style.SectionHeader>
          <Style.TitleGroup>
            <Style.Title>Elenco</Style.Title>
            <Style.TitleDivider />
            <Style.AthleteCount>{players.length} Atletas</Style.AthleteCount>
          </Style.TitleGroup>
        </Style.SectionHeader>

        {/* 👇 BARRA DE FILTROS ADICIONADA AQUI 👇 */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '10px 15px', flex: 1, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Buscar jogador por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '15px', color: '#334155' }}
            />
          </div>
          
          <select 
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', outline: 'none', cursor: 'pointer', fontSize: '15px', color: '#334155', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', minWidth: '200px' }}
          >
            <option value="">Todas as Posições</option>
            {positions.map(pos => (
              <option key={pos.id} value={pos.id}>{pos.nome}</option>
            ))}
          </select>
        </div>
        {/* ☝️ FIM DA BARRA DE FILTROS ☝️ */}

        <Style.Grid>
          {players.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Nenhum jogador encontrado com esses filtros.
            </div>
          ) : (
            players.map((p) => (
              <Style.PlayerCard key={p.id} onClick={() => handleOpenReport(p)}>
                <Style.ImageWrapper>
                  <PlayerAvatar player={p} />

                  <Style.Overlay>
                    <Style.OverlayText>
                      <span>Stats</span>
                      <ChevronRight size={14} />
                    </Style.OverlayText>
                  </Style.Overlay>

                  {isEditing && (
                    <Style.ActionButtons onClick={(e) => e.stopPropagation()}>
                      <Style.IconButton
                        $variant="danger"
                        onClick={() => deletePlayer(p.id)}
                      >
                        <Trash2 size={16} />
                      </Style.IconButton>
                      <Style.IconButton onClick={() => handleEdit(p)}>
                        <Pencil size={16} />
                      </Style.IconButton>
                    </Style.ActionButtons>
                  )}
                </Style.ImageWrapper>

                <Style.PlayerInfo>
                  <Style.PlayerNumber>#{p.numCamisa}</Style.PlayerNumber>
                  <Style.PlayerName>{p.nome}</Style.PlayerName>
                  {/* 👇 Posição do jogador aparecendo no Card 👇 */}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{p.posicaoNome}</span>
                </Style.PlayerInfo>
              </Style.PlayerCard>
            ))
          )}

          {isEditing && (
            <Style.AddPlayerBtn onClick={handleAdd}>
              <Plus size={32} />
              <span>Add Player</span>
            </Style.AddPlayerBtn>
          )}
        </Style.Grid>
      </Style.Section>

      {isModalOpen && (
        <PlayerRegView 
          open={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSavePlayer} 
          player={selectedPlayer}
          categories={[]} 
        />
      )}

      <PlayerReportModal
        open={reportOpen}
        onClose={handleCloseReport}
        loading={reportLoading}
        report={reportData}
        player={reportPlayer}
      />

      <PlayerRanking
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
      />

    </Style.Container>
  );
}

export default PlayerView;
