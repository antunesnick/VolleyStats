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
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 20px;
`;

export const Modal = styled.div`
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px;
  position: relative;
`;

export const CloseIcon = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #333;
  }
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -1px;
  color: #111;
  margin-bottom: 24px;
  margin-top: 0;
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
  gap: 6px;
`;

export const Label = styled.label`
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #777;
`;

/* Estilo base compartilhado entre Input e Select */
const baseInputStyles = css`
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  background-color: #fff;
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #00ff2f;
    box-shadow: 0 0 0 3px rgba(0, 255, 47, 0.2);
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
  margin-top: 10px;
  padding-top: 20px;
  border-top: 1px solid #eee;
`;

export const Button = styled.button`
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  cursor: pointer;
  transition: all 0.2s;
  
  /* Se receber a prop 'variant="cancel"', fica com estilo de borda */
  ${(props) =>
    props.$variant === "cancel"
      ? css`
          background-color: transparent;
          border: 1px solid #ccc;
          color: #555;

          &:hover {
            background-color: #f9f9f9;
            color: #111;
          }
        `
      : css`
          background-color: #00ff2f;
          border: 1px solid #00ff2f;
          color: #fff;
          box-shadow: 0 2px 4px rgba(0, 255, 47, 0.2);

          &:hover {
            background-color: #00dd29;
            border-color: #00dd29;
          }
        `}
`;