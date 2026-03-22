import React, { useState, useEffect } from "react";
import { Settings, Trash2, Pencil, ChevronRight, Plus } from "lucide-react";
import * as Style from "./PleayerStyles"; 
import PlayerControl from "../../Cotrol/PlayerControl"; 
import { PlayerRegView } from "../PlayerRegister/PlayerRegView";

export function PlayerView() {
  const [players, setPlayers] = useState([]); 
  const [isEditing, setIsEditing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  function fetchPlayers() {
    const playerControl = new PlayerControl();
    playerControl.findAllPlayers().then((data) => {
      const formattedPlayers = data.map((p) => ({
        id: p.id,
        name: p.nome,
        number: p.numCamisa,
        photo: p.foto || "https://via.placeholder.com/150",
        cpf: p.cpf,
        rg: p.rg,
        height: p.altura,
        position: p.posicao,
        dateOfBirth: p.dataNasc,
      }));
      setPlayers(formattedPlayers);
    });
  }

  const deletePlayer = (id) => {
    const playerControl = new PlayerControl();
    playerControl.deletePlayer(id).then(() => {
      fetchPlayers(); 
    });
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
    const playerControl = new PlayerControl();

    if (formData.id) {
      playerControl.updatePlayer(formData).then(() => {
        fetchPlayers(); 
      });
    } else {
      playerControl.createPlayer(formData).then(() => {
        fetchPlayers(); 
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
            <Style.Title>Roster</Style.Title>
            <Style.TitleDivider />
            <Style.AthleteCount>{players.length} Atletas</Style.AthleteCount>
          </Style.TitleGroup>
        </Style.SectionHeader>

        <Style.Grid>
          {players.map((p) => (
            <Style.PlayerCard key={p.id}>
              <Style.ImageWrapper>
                <Style.PlayerImage src={p.photo} alt={p.name} />

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
                <Style.PlayerNumber>#{p.number}</Style.PlayerNumber>
                <Style.PlayerName>{p.name}</Style.PlayerName>
              </Style.PlayerInfo>
            </Style.PlayerCard>
          ))}

          {isEditing && (
            <Style.AddPlayerBtn onClick={handleAdd}>
              <Plus size={32} />
              <span>Add Player</span>
            </Style.AddPlayerBtn>
          )}
        </Style.Grid>
      </Style.Section>

      {}
      <PlayerRegView 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSavePlayer} 
        player={selectedPlayer}
        categories={[]} 
      />

    </Style.Container>
  );
}