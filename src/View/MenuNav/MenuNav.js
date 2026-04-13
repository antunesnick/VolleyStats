import React from 'react';
import { NavLink } from 'react-router-dom';
import * as Style from './MenuNavStyles';


function MenuNav() {
 const navItems = [
    { path: '/torneios', label: 'Torneios' },
    { path: '/ginasios', label: 'Visualizar Ginásios' },
    { path: '/partidas', label: 'Gerenciar Partidas' },
    { path: '/jogadores', label: 'Visualizar Elenco' },
    { path: '/categorias', label: 'Gerenciar Categorias' }
  ];
  return (
    <Style.NavContainer>
      <Style.NavHeader>VolleyStats</Style.NavHeader>
      
      {navItems.map((item) => (
        <Style.NavButton 
          key={item.path} 
          as={NavLink} // Transforma o botão em um Link do Router
          to={item.path} // Aponta para a URL correta
        >
          {item.label}
        </Style.NavButton>
      ))}
      
    </Style.NavContainer>
  );
}

export default MenuNav;