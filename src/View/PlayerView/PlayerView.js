import React, { useState, useEffect } from "react";
import { Settings, Trash2, Pencil, ChevronRight, Plus, Search } from "lucide-react";
import * as Style from "./PleayerStyles"; 
import PlayerControl from "../../Control/PlayerControl"; 
import PositionControl from "../../Control/PositionControl"; 
import { PlayerRegView } from "../PlayerRegister/PlayerRegView";

export function PlayerView() {
  const [players, setPlayers] = useState([]); 
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [positions, setPositions] = useState([]);

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
        foto: p.foto || "https://via.placeholder.com/150",
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
              <Style.PlayerCard key={p.id}>
                <Style.ImageWrapper>
                  <Style.PlayerImage src={p.foto} alt={p.nome} />

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

    </Style.Container>
  );
}

export default PlayerView;