import React, { useState } from "react";

const initialFormData = {
  nome: "",
  cidade: "",
  estado: "",
  isActive: true,
};

const Ginasio = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ginasios, setGinasios] = useState([
    {
      nome: "Ginasio Municipal Presidente Prudente",
      cidade: "Presidente Prudente",
      estado: "SP",
      isActive: true,
    },
  ]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [novoGinasio, setNovoGinasio] = useState(initialFormData);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setNovoGinasio({
      ...novoGinasio,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleNovoGinasio = () => {
    setEditingIndex(null);
    setNovoGinasio(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditarGinasio = (index) => {
    const ginasio = ginasios[index];

    if (!ginasio) {
      return;
    }

    setEditingIndex(index);
    setNovoGinasio({
      nome: ginasio.nome,
      cidade: ginasio.cidade,
      estado: ginasio.estado,
      isActive: ginasio.isActive,
    });
    setIsModalOpen(true);
  };

  const handleExcluirGinasio = (index) => {
    setGinasios(ginasios.filter((_, currentIndex) => currentIndex !== index));

    if (editingIndex === index) {
      setEditingIndex(null);
      setNovoGinasio(initialFormData);
      setIsModalOpen(false);
    }
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setNovoGinasio(initialFormData);
  };

  const handleSalvarGinasio = (e) => {
    e.preventDefault();

    if (editingIndex !== null) {
      setGinasios(
        ginasios.map((ginasio, index) =>
          index === editingIndex ? { ...ginasio, ...novoGinasio } : ginasio
        )
      );
    } else {
      setGinasios([
        ...ginasios,
        {
          ...novoGinasio,
        },
      ]);
    }

    handleFecharModal();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="flex justify-between items-center mb-8 border-b-2 border-red-600 pb-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">
            Ginásios
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os ginásios cadastrados</p>
        </div>

        <button
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors"
          onClick={handleNovoGinasio}
        >
          NOVO GINASIO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ginasios.map((ginasio, index) => (
          <div
            key={`${ginasio.nome}-${ginasio.cidade}-${index}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Estrutura
              </span>
              <span
                className={`text-xs font-semibold ${
                  ginasio.isActive ? "text-green-400" : "text-red-400"
                }`}
              >
                {ginasio.isActive ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-black mb-1">{ginasio.nome}</h3>
              <p className="text-gray-600 font-medium mb-5">
                {ginasio.cidade} - {ginasio.estado}
              </p>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleEditarGinasio(index)}
                >
                  Alterar
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleExcluirGinasio(index)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ginasios.length === 0 && (
        <div className="mt-8 bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
          Nenhum ginásio cadastrado ainda.
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {editingIndex !== null ? "Alterar Ginásio" : "Novo Ginásio"}
              </h2>
              <button
                onClick={handleFecharModal}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSalvarGinasio} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Nome do Ginásio *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={novoGinasio.nome}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={novoGinasio.cidade}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Estado *
                  </label>
                  <input
                    type="text"
                    name="estado"
                    value={novoGinasio.estado}
                    onChange={handleInputChange}
                    maxLength={2}
                    required
                    className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3 uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-gray-100 p-4 rounded-lg">
                <div>
                  <h4 className="font-bold text-black text-sm uppercase">Status</h4>
                  <p className="text-xs text-gray-500">Marque se o ginásio está ativo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={novoGinasio.isActive}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  onClick={handleFecharModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors"
                >
                  {editingIndex !== null ? "Salvar Alteracao" : "Salvar Ginasio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ginasio;
