import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './View/App'; // 👇 Importamos o App, não o MenuNav
import './View/index.css'; 
import PlayerView from './View/PlayerView/PlayerView';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> 
  </React.StrictMode>
);