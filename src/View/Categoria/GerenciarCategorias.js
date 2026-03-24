import React, { useEffect, useState } from 'react';
const Swal = require('sweetalert2');

const GerenciarCategorias = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Novo: Controla se é edição
  const [categorias, setCategorias] = useState([]); // Carrega categorias do banco
  const [termoBusca, setTermoBusca] = useState(''); // Novo: Para armazenar o termo de busca
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('');
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('');

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

  const categoriasFiltradas = categorias.filter((cat) => {
    // 1. Filtro de Nome (ignora se estiver vazio)
    const matchesNome = cat.nome.toLowerCase().includes(termoBusca.toLowerCase());

    // 2. Filtro de Idade Mínima
    // Só filtra se o usuário digitou algo no campo de busca
    const valorMinBusca = filtroIdadeMin !== '' ? Number(filtroIdadeMin) : null;
    const matchesMin = valorMinBusca === null || Number(cat.idadeMin) >= valorMinBusca;

    // 3. Filtro de Idade Máxima
    const valorMaxBusca = filtroIdadeMax !== '' ? Number(filtroIdadeMax) : null;
    const matchesMax = valorMaxBusca === null || Number(cat.idadeMax) <= valorMaxBusca;

    return matchesNome && matchesMin && matchesMax;
  });
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
        if (resultado) {
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
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      {/* Container Centralizado */}
      <div className="max-w-7xl mx-auto w-full">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8 border-b-2 border-red-600 pb-6">
          <div>
            <h1 className="text-4xl font-black text-black tracking-tight uppercase">Categorias</h1>
            <p className="text-gray-500 text-sm">Gerencie as divisões por faixa etária</p>
          </div>
          <button
            onClick={handleAbrirNovo}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            NOVA CATEGORIA
          </button>
        </div>

        {/* Barra de Filtros Centralizada/Alinhada */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nome da Categoria</label>
            <input
              type="text"
              placeholder="Ex: Sub-15..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-red-500 outline-none transition-all"
            />
          </div>

          <div className="w-32">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Idade Mín</label>
            <input
              type="number"
              placeholder="0"
              value={filtroIdadeMin}
              onChange={(e) => setFiltroIdadeMin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <div className="w-32">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Idade Máx</label>
            <input
              type="number"
              placeholder="99"
              value={filtroIdadeMax}
              onChange={(e) => setFiltroIdadeMax(e.target.value)}
              className="w-full border border-gray-300 rounded-lg py-2 px-4 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <button
            onClick={() => { setTermoBusca(''); setFiltroIdadeMin(''); setFiltroIdadeMax(''); }}
            className="px-4 py-2 text-red-600 font-bold text-xs uppercase hover:bg-red-50 rounded-lg transition-colors"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Grid de Cards */}
        {categoriasFiltradas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoriasFiltradas.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all border-t-4 border-t-black">
                <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Competição</span>
                  <span className="text-[10px] font-mono text-gray-400">#ID:{cat.id}</span>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-black text-black mb-4 uppercase truncate">{cat.nome}</h3>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Mínima</p>
                      <p className="text-lg font-black text-black">{cat.idadeMin} <span className="text-xs font-normal">anos</span></p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Máxima</p>
                      <p className="text-lg font-black text-black">{cat.idadeMax} <span className="text-xs font-normal">anos</span></p>
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleAbrirEditar(cat)}
                      className="flex-1 p-1 bg-black text-white font-bold py-2 rounded shadow-sm hover:bg-gray-800 transition-all text-xs uppercase"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluirCategoria(cat.id)}
                      className="flex-1 p-1 border-2 border-red-600 text-red-600 font-bold py-2 rounded hover:bg-red-600 hover:text-white transition-all text-xs uppercase"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">Nenhuma categoria encontrada com esses filtros.</p>
          </div>
        )}
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