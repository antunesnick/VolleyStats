import React, { useEffect, useState } from 'react';
const Swal = require('sweetalert2');

const GerenciarCategorias = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Novo: Controla se é edição
  const [categorias, setCategorias] = useState([]); // Carrega categorias do banco

  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    idadeMin: '',
    idadeMax: ''
  });

  useEffect(() => {
    const carregarCategorias = async () => {
      const dadosDoBanco = await window.ElectronAPI.listarCategorias();
      setCategorias(dadosDoBanco);
    };
    carregarCategorias();
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNovaCategoria({
      ...novaCategoria,
      [name]: value
    });
  };
  // Função para abrir o modal em modo de edição
  const handleAbrirEditar = (categoria) => {
    setEditandoId(categoria.id);
    setNovaCategoria({
      nome: categoria.nome,
      idadeMin: categoria.idadeMin,
      idadeMax: categoria.idadeMax
    });
    setIsModalOpen(true);
  };

  // Função para abrir o modal em modo de criação
  const handleAbrirNovo = () => {
    setEditandoId(null);
    setNovaCategoria({ nome: '', idadeMin: '', idadeMax: '' });
    setIsModalOpen(true);
  };

  const handleExcluirCategoria = (id) => {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Essa ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#920A13',
      cancelButtonColor: '#6c757d'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await window.ElectronAPI.excluirCategoria(id);
          setCategorias(categorias.filter(cat => cat.id !== id));
          Swal.fire({
            title: 'Sucesso!',
            text: 'Categoria excluída com sucesso.',
            icon: 'success',
            confirmButtonColor: '#920A13'
          });
        } catch (e) {
          Swal.fire({
            title: 'Erro!',
            text: 'Erro ao excluir categoria.',
            icon: 'error',
            confirmButtonColor: '#920A13'
          });
        }
      }
    });
  };


  const handleSalvarCategoria = async (e) => {
    e.preventDefault();

    const dados = {
      nome: novaCategoria.nome,
      idadeMin: parseInt(novaCategoria.idadeMin),
      idadeMax: parseInt(novaCategoria.idadeMax)
    }

    try {
      if (editandoId) {
        // Lógica de Edição
        await window.ElectronAPI.editarCategoria(editandoId, dados);
        setCategorias(categorias.map(cat => cat.id === editandoId ? { ...cat, ...dados, id: editandoId } : cat));
        Swal.fire({
          title: 'Sucesso!',
          text: 'Categoria id: ' + editandoId + ' editada com sucesso.',
          icon: 'success',
          confirmButtonColor: '#920A13', // Use a cor vermelha do seu projeto JPC
        });
      } else {
        // Lógica de Criação
        const resultado = await window.ElectronAPI.salvarCategoria(dados)
        if (resultado)
        {
          setCategorias(
            [...categorias, { ...novaCategoria, id: resultado }]
          );
          Swal.fire({
            title: 'Sucesso!',
            text: 'Categoria id: ' + resultado + ' cadastrada com sucesso.',
            icon: 'success',
            confirmButtonColor: '#920A13', // Use a cor vermelha do seu projeto JPC
          });
        }
          
      }

      setIsModalOpen(false);
      setEditandoId(null);
    } catch (e) {
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao cadastrar categoria, Idade mínima deve ser maior ou igual a 12 e idade máxima deve ser maior ou igual a 13.',
        icon: 'error',
        confirmButtonColor: '#920A13', // Use a cor vermelha do seu projeto JPC
      });
      // Recarrega a página para garantir que os dados estejam atualizados
    }
  };

  return (
    <div className="min-w-max bg-gray-50 text-gray-900 p-8 font-sans">
      <div className="flex gap-6 justify-between items-center mb-8 border-b-2 border-red-600 pb-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Categorias</h1>
          <p className="text-gray-500 mt-1">Gerencie as faixas etárias e divisões do clube</p>
        </div>
        <button
          onClick={handleAbrirNovo}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          NOVA CATEGORIA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categorias.map((cat) => (
          <div key={cat.id} className=" bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">Divisão</span>
              <span className="text-xs text-gray-300">ID: #{cat.id}</span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-black mb-4 uppercase">{cat.nome}</h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Idade Mín.</p>
                  <p className="text-lg font-black text-black">{cat.idadeMin} anos</p>
                </div>
                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Idade Máx.</p>
                  <p className="text-lg font-black text-black">{cat.idadeMax} anos</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAbrirEditar(cat)}
                  className="flex-1 border border-black hover:bg-black hover:text-white text-black font-semibold py-2 rounded transition-all text-sm uppercase"
                >
                  Editar Dados
                </button>
                <button
                  onClick={() => handleExcluirCategoria(cat.id)}
                  className="flex-1 border border-red-500 hover:bg-red-500 hover:text-white text-red-500 font-semibold py-2 rounded transition-all text-sm uppercase"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {editandoId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSalvarCategoria} className="p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Nome da Categoria</label>
                  <input
                    type="text"
                    name="nome"
                    value={novaCategoria.nome}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Idade Mínima</label>
                    <input
                      type="number"
                      name="idadeMin"
                      value={novaCategoria.idadeMin}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Idade Máxima</label>
                    <input
                      type="number"
                      name="idadeMax"
                      value={novaCategoria.idadeMax}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors"
                >
                  {editandoId ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarCategorias;