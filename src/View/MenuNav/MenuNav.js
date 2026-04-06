import React from 'react';
import { NavLink } from 'react-router-dom'; // 👇 Importa SÓ o NavLink
import * as Style from './MenuNavStyles'; // Ajuste o caminho do seu estilo se necessário
import Partida from '../Partida/GerenciarPartidas'; 
import PlayerView from '../PlayerView/PlayerView';
import Ginasio from '../Ginasios/ginasio';
import GerenciarCategorias from '../Categoria/GerenciarCategorias';


function MenuNav() {
 const navItems = [
    { path: '/', label: 'Início' },
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