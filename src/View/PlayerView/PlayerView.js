import React, { useState } from "react";
import { Settings, Trash2, Pencil, ChevronRight, Plus } from "lucide-react";
import * as Style from "./PleayerStyles"; // Importa os estilos que criamos acima

// Dados falsos (mock) apenas para podermos visualizar a tela funcionando
const MOCK_PLAYERS = [
  { id: 1, name: "Lucas Lima", number: "07", photo: "https://i.pravatar.cc/300?img=11" },
  { id: 2, name: "Pedro Santos", number: "12", photo: "https://i.pravatar.cc/300?img=12" },
  { id: 3, name: "João Silva", number: "04", photo: "https://i.pravatar.cc/300?img=15" },
];

export function PlayerView() {
  const [players, setPlayers] = useState(MOCK_PLAYERS);
  const [isEditing, setIsEditing] = useState(false);

  // Funções apenas visuais (placeholders) para a sua lógica de negócio
  const deletePlayer = (id) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleEdit = (player) => {
    console.log("Abrir modal de edição para o jogador:", player);
    // Aqui você chamaria setEditingPlayer(player) e abriria o PlayerDialog
  };

  const handleAdd = () => {
    console.log("Abrir modal para criar novo jogador");
    // Aqui você abriria o PlayerDialog vazio
  };

  return (
    <Style.Container>
      {/* Botão temporário no topo para você testar a visualização do modo de edição */}
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

                {/* Os botões de ação só aparecem se isEditing for true */}
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

          {/* O botão de adicionar jogador entra no final do grid se estiver editando */}
          {isEditing && (
            <Style.AddPlayerBtn onClick={handleAdd}>
              <Plus size={32} />
              <span>Add Player</span>
            </Style.AddPlayerBtn>
          )}
        </Style.Grid>
      </Style.Section>
    </Style.Container>
  );
}