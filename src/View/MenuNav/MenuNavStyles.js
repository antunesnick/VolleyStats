import styled from 'styled-components';

export const NavContainer = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 30px;
  background-color: #1e293b; /* Uma cor escura e moderna */
  width: 260px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  box-shadow: 4px 0 10px rgba(0,0,0,0.3);
  z-index: 1000;
  overflow-y: auto; /* Para telas menores */
`;

export const NavHeader = styled.h2`
  color: #f8fafc;
  margin-bottom: 30px;
  text-align: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

export const NavButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: transparent;
  color: #cbd5e1; /* Um cinza claro */
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  text-align: left;
  transition: all 0.3s ease;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  width: 100%;

  &:hover {
    background-color: #334155;
    color: #f8fafc;
    border-color: #475569;
  }

  /* Exemplo de estilo para o botão ativo */
  &.active {
    background-color: #0ea5e9; /* Um azul vibrante */
    color: white;
    font-weight: bold;
  }
`;

/* Se quiser adicionar ícones, este componente estiliza o ícone dentro do botão */
export const IconWrapper = styled.span`
  font-size: 1.2rem;
  display: flex;
  align-items: center;
`;