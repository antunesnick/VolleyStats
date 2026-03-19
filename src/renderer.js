import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlayerView } from './View/PlayerView/PlayerView'; 
import Home from './View/Home/Home'; 
import './View/index.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PlayerView open={true} onClose={null} onSave={null} player={null} />
  </React.StrictMode>
);