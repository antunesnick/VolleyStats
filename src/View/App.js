import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom'; // O único Router fica aqui!

// Importando o Menu
import MenuNav from './View/MenuNav/MenuNav'; 

// Importando suas Views
import Home from './View/Home/Home';
// Importe as outras telas conforme for criando...

function App() {
  return (
    <HashRouter>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        
        {/* O MenuNav fica dentro do Router, então ele pode usar Links! */}
        <MenuNav />

        {/* A área principal que muda de acordo com a Rota */}
        <main style={{ marginLeft: '260px', padding: '30px', width: '100%', boxSizing: 'border-box' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Adicione as outras rotas aqui depois */}
          </Routes>
        </main>

      </div>
    </HashRouter>
  );
}

export default App;