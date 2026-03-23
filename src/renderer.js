import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './View/Home/Home'; 
import { PlayerView } from './View/PlayerView/PlayerView'; 
import './View/index.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PlayerView /> 
  </React.StrictMode>
);