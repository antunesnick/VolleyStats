import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom'; 

// Importamos direto a Home2. Removemos a Home antiga e o MenuNav.
import Home2 from './Home/Home2';
import Ginasio from './Ginasios/Ginasio';
import Times from './Times/Times';
import Partida from './Partida/GerenciarPartidas';
import PlayerView from './PlayerView/PlayerView';
import GerenciarCategorias from './Categoria/GerenciarCategorias';

function App() {
  return (
    <HashRouter>
      {/* A Home2 agora ocupa 100% da tela, já que ela mesma possui
        seu próprio <header> e <main> configurados com Tailwind.
      */}
      <Routes>
        {/* Rota principal agora aponta direto para a Home2 */}
        <Route path="/" element={<Home2 />} />
        
        {/* Mantendo as outras rotas disponíveis no sistema */}
        <Route path="/ginasios" element={<Ginasio />} />
        <Route path="/times" element={<Times />} />
        <Route path="/partidas" element={<Partida />} />
        <Route path="/jogadores" element={<PlayerView />} />  
        <Route path="/categorias" element={<GerenciarCategorias />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
