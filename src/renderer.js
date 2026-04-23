import React from 'react';
import ReactDOM from 'react-dom/client';
import './View/index.css'; 
import PlayerView from './View/PlayerView/PlayerView';
import App from './View/App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);