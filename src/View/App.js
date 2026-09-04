import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Alertas, mensagemDeErro } from '../utils/Alertas';

// Importamos direto a Home2. Removemos a Home antiga e o MenuNav.
import Home2 from './Home/Home2';
import Ginasio from './Ginasios/Ginasio';
import Times from './Times/Times';
import Partida from './Partida/GerenciarPartidas';
import PlayerView from './PlayerView/PlayerView';
import GerenciarCategorias from './Categoria/GerenciarCategorias';

/**
 * Rede de seguranca para erro que ninguem tratou.
 *
 * Na maquina do analista o app roda empacotado, sem DevTools: uma promise
 * rejeitada sem catch nao aparecia em lugar nenhum, e a tela simplesmente nao
 * fazia nada. Aqui o erro vira um toast, para o usuario ao menos saber que a
 * operacao falhou e por que.
 */
function useAvisoDeErroNaoTratado() {
  useEffect(() => {
    const aoRejeitar = (evento) => {
      console.error('Erro nao tratado:', evento.reason);
      Alertas.erro(mensagemDeErro(evento.reason, 'Ocorreu um erro inesperado. Tente novamente.'));
    };

    const aoErro = (evento) => {
      console.error('Erro nao tratado:', evento.error || evento.message);
      Alertas.erro(mensagemDeErro(evento.error || evento.message, 'Ocorreu um erro inesperado.'));
    };

    window.addEventListener('unhandledrejection', aoRejeitar);
    window.addEventListener('error', aoErro);

    return () => {
      window.removeEventListener('unhandledrejection', aoRejeitar);
      window.removeEventListener('error', aoErro);
    };
  }, []);
}

function App() {
  useAvisoDeErroNaoTratado();

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
