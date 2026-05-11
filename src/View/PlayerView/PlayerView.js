import React, { useState, useEffect } from "react";
import { Settings, Trash2, Pencil, ChevronRight, Plus, Search } from "lucide-react";
import * as Style from "./PleayerStyles"; 
import PlayerControl from "../../Control/PlayerControl"; 
import PositionControl from "../../Control/PositionControl"; 
import { PlayerRegView } from "../PlayerRegister/PlayerRegView";
import PlayerReportModal from "./PlayerReportModal";
import { Alertas } from "../../utils/Alertas";

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

export function PlayerView() {
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

  useEffect(() => {
    const positionControl = PositionControl.getInstance();
    positionControl.findAllPositions().then((data) => setPositions(data));
  }, []);

  useEffect(() => {
    fetchPlayers(searchTerm, selectedPosition);
  }, [searchTerm, selectedPosition]);

  function fetchPlayers(nome = "", posicaoId = "") {
    const playerControl = PlayerControl.getInstance();
    playerControl.findPlayerFiltered({ nome, posicaoId }).then((data) => {
      const formattedPlayers = data.map((p) => ({
        id: p.id,
        nome: p.nome, 
        numCamisa: p.numCamisa, 
        foto: p.foto || "",
        cpf: p.cpf,
        rg: p.rg,
        altura: p.altura, 
        posicaoId: p.posicao_id,
        posicaoNome: p.posicao, 
        dataNasc: p.dataNasc, 
      }));
      setPlayers(formattedPlayers);
    });
  }

  const deletePlayer = (id) => {
    if (window.confirm("Tem certeza que deseja excluir este jogador?")) {
      const playerControl = PlayerControl.getInstance();
      playerControl.deletePlayer(id).then(() => {
        fetchPlayers(searchTerm, selectedPosition); 
      });
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

  const handleSavePlayer = (formData) => {
    const playerControl = PlayerControl.getInstance();

    if (formData.id) {
      playerControl.updatePlayer(formData).then(() => {
        fetchPlayers(searchTerm, selectedPosition); 
      });
    } else {
      playerControl.createPlayer(formData).then(() => {
        fetchPlayers(searchTerm, selectedPosition); 
      });
    }
    setIsModalOpen(false); 
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

    </Style.Container>
  );
}

export default PlayerView;
