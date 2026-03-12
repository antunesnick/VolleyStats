import React, { useState } from 'react';

const GerenciarPartidas = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partidas, setPartidas] = useState([
    { id: 1, nome: 'Final Estadual', adversario: 'Sada Cruzeiro', data: '2026-07-10', ginasio: 'Arena Sabiá', tipo: 'Oficial', status: 'Agendada' }
  ]);

  const [novaPartida, setNovaPartida] = useState({
    externa: false,
    nome: '',
    adversario: '',
    data: '',
    ginasio: '',
    tipo: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNovaPartida({
      ...novaPartida,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSalvarPartida = (e) => {
    e.preventDefault();
    setPartidas([...partidas, { ...novaPartida, id: partidas.length + 1, status: 'Agendada' }]);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      {/* Header da Seção */}
      <div className="flex justify-between items-center mb-8 border-b-2 border-red-600 pb-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Jogos</h1>
          <p className="text-gray-500 mt-1">Gerencie as partidas e registre estatísticas</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          NOVA PARTIDA
        </button>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partidas.map((partida) => (
          <div key={partida.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">{partida.tipo}</span>
              <span className="text-xs text-gray-300">{partida.data}</span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-black mb-1">{partida.nome || 'Partida Sem Nome'}</h3>
              <p className="text-gray-600 font-medium mb-4">vs {partida.adversario}</p>
              
              <div className="flex items-center text-gray-500 text-sm mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                {partida.ginasio}
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors text-sm">
                  Iniciar Controle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">Nova Partida</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            
            <form onSubmit={handleSalvarPartida} className="p-8">
              <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg mb-6">
                <div>
                  <h4 className="font-bold text-black text-sm uppercase">Partida Externa</h4>
                  <p className="text-xs text-gray-500">Registrar resultado de partida entre outros times</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="externa" checked={novaPartida.externa} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Nome da Partida</label>
                  <input type="text" name="nome" value={novaPartida.nome} onChange={handleInputChange} placeholder="Ex: Jogo das Semifinais" className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3" />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Adversário *</label>
                    <input type="text" name="adversario" value={novaPartida.adversario} onChange={handleInputChange} required placeholder="Nome do time adversário" className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Data *</label>
                    <input type="date" name="data" value={novaPartida.data} onChange={handleInputChange} required className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Ginásio</label>
                    <input type="text" name="ginasio" value={novaPartida.ginasio} onChange={handleInputChange} placeholder="Nome do ginásio" className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Tipo da Partida *</label>
                    <select name="tipo" value={novaPartida.tipo} onChange={handleInputChange} required className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3">
                      <option value="">Selecione o tipo</option>
                      <option value="Amistoso">Amistoso</option>
                      <option value="Campeonato Regional">Campeonato Regional</option>
                      <option value="Estadual">Estadual</option>
                      <option value="Nacional">Nacional</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors">
                  Salvar Partida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarPartidas;