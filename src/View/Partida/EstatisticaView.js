import React, { useEffect, useState } from 'react';

const TAB_ITEMS = [
  { id: 'geral', label: 'Geral' },
  { id: 'jogadores', label: 'Jogadores' },
  { id: 'sets', label: 'Sets' },
];

const EstatisticaModal = ({
  open,
  onClose,
  homeLabel,
  awayLabel,
  matchInfo,
  score,
  draftScore,
  onDraftScoreChange,
  onConfirm,
  onToggleEdit,
  editMode,
}) => {
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    if (open) {
      setActiveTab('geral');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/45 backdrop-blur-sm p-4 sm:p-6 overflow-auto flex items-center justify-center">
      <div className="w-full max-w-5xl rounded-[2rem] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Encerramento da partida</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Finalizar Partida</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-3 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 border-b border-gray-100 pb-4">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                activeTab === item.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Modo de edição</p>
                <p className="text-sm font-medium text-gray-600">
                  {editMode ? 'Você pode alterar o placar geral antes de confirmar.' : 'Clique em Alterar para editar o placar geral.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleEdit}
                className={`rounded-full px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-colors ${
                  editMode
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {editMode ? 'Concluir Alteração' : 'Alterar'}
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Dados da partida</p>
                <div className="space-y-3 text-sm font-medium text-gray-700">
                  <p><span className="font-black text-gray-900">Nome:</span> {matchInfo.name}</p>
                  <p><span className="font-black text-gray-900">Data:</span> {matchInfo.date}</p>
                  <p><span className="font-black text-gray-900">Ginásio:</span> {matchInfo.gymnasium}</p>
                  <p><span className="font-black text-gray-900">Mandante:</span> {homeLabel}</p>
                  <p><span className="font-black text-gray-900">Visitante:</span> {awayLabel}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Placar atual</p>
                {editMode ? (
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{homeLabel}</p>
                      <input
                        type="number"
                        min="0"
                        value={draftScore.home}
                        onChange={(e) => onDraftScoreChange('home', e.target.value)}
                        className="w-full text-center text-5xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                      />
                    </div>
                    <div className="text-3xl font-black text-gray-300 pt-6">x</div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{awayLabel}</p>
                      <input
                        type="number"
                        min="0"
                        value={draftScore.away}
                        onChange={(e) => onDraftScoreChange('away', e.target.value)}
                        className="w-full text-center text-5xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-5">
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{homeLabel}</p>
                      <div className="text-5xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">{score.home}</div>
                    </div>
                    <div className="text-3xl font-black text-gray-300 pt-6">x</div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{awayLabel}</p>
                      <div className="text-5xl font-black text-gray-900 bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm">{score.away}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Próximo passo</p>
              <p className="text-sm font-medium text-gray-700">
                Esta aba fica reservada para o encerramento geral. As estatísticas individuais, sets e demais detalhes podem entrar nas próximas abas.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'jogadores' && (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Jogadores</p>
            <h3 className="text-xl font-black text-gray-900 mb-2">Área reservada para pontuação individual</h3>
            <p className="text-sm font-medium text-gray-600">Você vai poder adicionar, editar e remover ações por jogador aqui.</p>
          </div>
        )}

        {activeTab === 'sets' && (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Sets</p>
            <h3 className="text-xl font-black text-gray-900 mb-2">Área reservada para dividir primeiro, segundo e terceiro set</h3>
            <p className="text-sm font-medium text-gray-600">Essa estrutura fica pronta para você ligar a lógica depois, sem misturar com o placar geral.</p>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-6 py-3 text-sm font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-green-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-green-600 transition-colors"
          >
            Confirmar e abrir minha parte
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstatisticaModal;