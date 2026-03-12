import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './View/Home/Home'; // Aqui ele importa o arquivo que você acabou de criar!
import './View/index.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>
);