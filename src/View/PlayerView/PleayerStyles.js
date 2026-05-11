import styled, { css } from "styled-components";

export const Container = styled.div`
  min-height: 100vh;
  background-color: #f9fafb; /* bg-gray-50 do Tailwind */
  color: #111827; /* text-gray-900 */
  font-family: 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
  padding: 32px;
  padding-bottom: 80px;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
`;

export const ManageButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px; /* Arredondamento padrão do Tailwind (rounded-lg) */
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

  ${(props) =>
    props.$isEditing
      ? css`
          background-color: #dc2626; /* red-600 */
          color: white;
          border: 2px solid #dc2626;
          
          &:hover {
            background-color: #b91c1c; /* hover:bg-red-700 */
            border-color: #b91c1c;
          }
        `
      : css`
          background-color: white;
          color: #dc2626;
          border: 2px solid #dc2626;

          &:hover {
            background-color: #dc2626;
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
  border-bottom: 2px solid #dc2626; /* border-b-2 border-red-600 */
  padding-bottom: 16px;
  margin-bottom: 20px;
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: baseline;
  gap: 16px;
`;

export const Title = styled.h2`
  font-size: 36px; /* text-4xl */
  font-weight: 900; /* font-black */
  color: #000000;
  text-transform: uppercase;
  letter-spacing: -0.025em; /* tracking-tight */
  margin: 0;
`;

export const TitleDivider = styled.div`
  display: none; /* Removido para manter a estética limpa do border-bottom vermelho */
`;

export const AthleteCount = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #6b7280; /* text-gray-500 */
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
`;

export const PlayerInfo = styled.div`
  margin-top: 16px;
  text-align: center;
  padding: 0 8px;
`;

export const PlayerNumber = styled.p`
  font-size: 12px;
  font-weight: 900;
  color: #dc2626; /* Vermelho padrão da sua nova interface */
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px 0;
`;

export const PlayerName = styled.h4`
  font-size: 18px;
  font-weight: 900;
  color: #000000;
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
  border: 1px solid #e5e7eb; /* border-gray-200 */
  border-radius: 12px; /* rounded-xl */
  padding: 6px;
  transition: all 0.3s ease;
  overflow: hidden;
  box-sizing: border-box;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
`;

export const PlayerImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  filter: grayscale(100%);
  transition: all 0.5s ease;
`;

export const PlayerInitial = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  background-color: #dc2626;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  font-weight: 900;
  text-transform: uppercase;
`;

export const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  border-radius: 12px;
`;

export const OverlayText = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export const ActionButtons = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: scale(0);
  transform-origin: top right;
  transition: transform 0.2s ease;
`;

export const IconButton = styled.button`
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  ${(props) =>
    props.$variant === "danger"
      ? css`
          background-color: #dc2626; /* red-600 */
          color: white;
          border-color: #dc2626;
          &:hover {
            background-color: #920A13; /* Tom mais escuro */
          }
        `
      : css`
          background-color: white;
          color: #000000;
          &:hover {
            background-color: #000000;
            color: white;
            border-color: #000000;
          }
        `}
`;

export const PlayerCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  /* Efeitos de Hover adaptados para a nova estética */
  &:hover ${ImageWrapper} {
    border-color: #000000; /* Fica preto no hover, lembrando a barra preta da categoria */
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* shadow-lg */
    transform: translateY(-4px);
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
    color: #dc2626; /* Fica vermelho no hover */
  }
`;

export const AddPlayerBtn = styled.button`
  width: 100%;
  aspect-ratio: 4 / 5;
  background-color: #ffffff;
  border: 2px dashed #d1d5db; /* gray-300 */
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af; /* gray-400 */
  cursor: pointer;
  transition: all 0.2s ease;

  span {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 12px;
  }

  &:hover {
    border-color: #dc2626;
    color: #dc2626;
    background-color: #fef2f2; /* red-50 */
  }
`;
