import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom'; 

import MenuNav from './MenuNav/MenuNav';
import Home from './Home/Home';
import Ginasio from './Ginasios/ginasio';
import Partida from './Partida/GerenciarPartidas';
import PlayerView from './PlayerView/PlayerView';
import GerenciarCategorias from './Categoria/GerenciarCategorias';

function App() {
  return (
    <HashRouter>
      {/* 1. Container Principal: Flexbox ocupando exatamente a tela, escondendo vazamentos horizontais */}
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        width: '100vw', 
        backgroundColor: '#f8fafc',
        overflowX: 'hidden' // Assassina a barra de rolagem horizontal
      }}>
        
        <MenuNav />

        {/* 2. Área Principal: O 'flex: 1' faz ocupe AUTOMATICAMENTE o resto da tela, sem precisar de width 100% */}
        <main style={{ 
          flex: 1, 
          
          /* ⚠️ ATENÇÃO AQUI: 
             Se o seu MenuNav no arquivo MenuNavStyles.js tiver "position: fixed", DESCOMENTE a linha abaixo.
             Se ele NÃO for fixed, deixe do jeito que está! */
          // marginLeft: '260px', 
          
          padding: '40px', 
          display: 'flex', 
          justifyContent: 'center', // Empurra a caixa de conteúdo pro meio
          boxSizing: 'border-box' 
        }}>
          
          {/* 3. A Caixa Centralizadora: Em telas Full HD ela trava em 1200px para não ficar esticadaço */}
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/ginasios" element={<Ginasio />} />
              <Route path="/partidas" element={<Partida />} />
              <Route path="/jogadores" element={<PlayerView />} />  
              <Route path="/categorias" element={<GerenciarCategorias />} />
            </Routes>
          </div>

        </main>
      </div>
    </HashRouter>
  );
}

export default App;