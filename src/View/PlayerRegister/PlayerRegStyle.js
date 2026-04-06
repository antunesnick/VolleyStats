import styled, { css } from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6); /* Um pouco mais escuro para dar contraste */
  backdrop-filter: blur(4px);
  padding: 20px;
`;

export const Modal = styled.div`
  background-color: #ffffff;
  border-radius: 16px; /* Arredondamento padrão Tailwind (2xl) */
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  position: relative;
`;

export const CloseIcon = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  background: none;
  border: none;
  color: #9ca3af; /* gray-400 */
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #dc2626; /* Fica vermelho ao passar o mouse */
  }
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #111827; /* gray-900 */
  margin-bottom: 24px;
  margin-top: 0;
  border-bottom: 2px solid #dc2626; /* Linha vermelha para combinar com a identidade */
  padding-bottom: 12px;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr; /* Fica em 1 coluna no celular */
  }
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #374151; /* gray-700 */
`;

/* Estilo base compartilhado entre Input e Select */
const baseInputStyles = css`
  width: 100%;
  border: 1px solid #d1d5db; /* gray-300 */
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  background-color: #f9fafb; /* gray-50 - Fundo levemente cinza */
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #dc2626; /* Borda vermelha ao clicar */
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15); /* Brilho vermelho suave */
    background-color: #ffffff;
  }
`;

export const Input = styled.input`
  ${baseInputStyles}
`;

export const Select = styled.select`
  ${baseInputStyles}
  cursor: pointer;
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb; /* gray-200 */
`;

export const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  /* Se receber a prop 'variant="cancel"', fica cinza claro */
  ${(props) =>
    props.$variant === "cancel"
      ? css`
          background-color: #f3f4f6; /* gray-100 */
          border: 1px solid transparent;
          color: #4b5563; /* gray-600 */

          &:hover {
            background-color: #e5e7eb; /* gray-200 */
            color: #111827;
          }
        `
      : css`
          background-color: #dc2626; /* red-600 */
          border: 1px solid #dc2626;
          color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

          &:hover {
            background-color: #b91c1c; /* red-700 */
            border-color: #b91c1c;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
        `}
`;