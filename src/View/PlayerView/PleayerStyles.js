import styled, { css } from "styled-components";

export const Container = styled.div`
  min-height: 100vh;
  background-color: #fafafa;
  font-family: 'Inter', sans-serif;
  padding: 40px;
  padding-bottom: 80px;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 40px;
`;

export const ManageButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 50px;
  font-weight: 900;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.3s ease;

  ${(props) =>
    props.$isEditing
      ? css`
          background-color: #00ff2f;
          color: white;
          border: 2px solid #00ff2f;
          box-shadow: 0 10px 15px -3px rgba(0, 255, 47, 0.2);
        `
      : css`
          background-color: white;
          color: #00ff2f;
          border: 2px solid #00ff2f;

          &:hover {
            background-color: #00ff2f;
            color: white;
          }
        `}
`;

export const Section = styled.section`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 24px;
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const Title = styled.h2`
  font-size: 36px;
  font-weight: 900;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: -1px;
  font-style: italic;
  margin: 0;
`;

export const TitleDivider = styled.div`
  height: 1px;
  width: 96px;
  background-color: #00ff2f;
  opacity: 0.3;
  margin-top: 8px;
`;

export const AthleteCount = styled.span`
  font-size: 12px;
  font-weight: 900;
  color: #d1d5db;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: 8px;
`;

export const Grid = styled.div`
  display: grid;
  /* Cria colunas responsivas que se adaptam ao tamanho da tela */
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
`;

export const PlayerInfo = styled.div`
  margin-top: 16px;
  text-align: center;
`;

export const PlayerNumber = styled.p`
  font-size: 10px;
  font-weight: 900;
  color: #00ff2f;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0 0 4px 0;
`;

export const PlayerName = styled.h4`
  font-size: 16px;
  font-weight: 900;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s;
`;

export const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  background-color: white;
  border: 2px solid rgba(0, 255, 47, 0.2);
  border-radius: 16px;
  padding: 8px;
  transition: all 0.3s ease;
  overflow: hidden;
  box-sizing: border-box;
`;

export const PlayerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  filter: grayscale(100%);
  transition: all 0.5s ease;
`;

export const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  border-radius: 16px;
`;

export const OverlayText = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.7;
`;

export const ActionButtons = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: scale(0);
  transform-origin: top right;
  transition: transform 0.2s ease;
`;

export const IconButton = styled.button`
  padding: 8px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  ${(props) =>
    props.$variant === "danger"
      ? css`
          background-color: #ef4444;
          color: white;
          &:hover {
            background-color: #dc2626;
          }
        `
      : css`
          background-color: white;
          color: #111827;
          &:hover {
            background-color: #f3f4f6;
          }
        `}
`;

/* O Card inteiro do jogador. Usamos isso para referenciar os hovers nos elementos filhos */
export const PlayerCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  &:hover ${ImageWrapper} {
    border-color: #00ff2f;
    box-shadow: 0 20px 40px -10px rgba(0, 255, 47, 0.2);
    transform: translateY(-8px);
  }

  &:hover ${PlayerImage} {
    filter: grayscale(0%);
  }

  &:hover ${Overlay} {
    opacity: 1;
  }

  &:hover ${ActionButtons} {
    transform: scale(1);
  }

  &:hover ${PlayerName} {
    color: #00ff2f;
  }
`;

export const AddPlayerBtn = styled.button`
  width: 100%;
  aspect-ratio: 4 / 5;
  background-color: white;
  border: 2px dashed #e5e7eb;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #d1d5db;
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-size: 10px;
  }

  &:hover {
    border-color: #00ff2f;
    color: #00ff2f;
    background-color: #f0fff4;
  }
`;