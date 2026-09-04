import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { mensagemDeErro } from '../../utils/Alertas';
import {
  blocoDestaques,
  blocoMetricas,
  blocoTabela,
  escapeHtml,
  montarDocumento,
  nomeArquivoRelatorio,
  salvarRelatorioPdf,
} from '../../utils/relatorioPdf';

const ReportMetric = ({ label, value, featured = false }) => (
  <div className={`rounded-xl border p-4 ${featured ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
    <p className={`text-[10px] font-black uppercase tracking-widest ${featured ? 'text-red-600' : 'text-gray-400'}`}>{label}</p>
    <p className="mt-1 text-2xl font-black text-black">{value}</p>
  </div>
);

const GerenciarCategorias = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Novo: Controla se é edição
  const [categorias, setCategorias] = useState([]); // Carrega categorias do banco
  const [termoBusca, setTermoBusca] = useState(''); // Novo: Para armazenar o termo de busca
  const [filtroIdadeMin, setFiltroIdadeMin] = useState('');
  const [filtroIdadeMax, setFiltroIdadeMax] = useState('');
  const [relatorioCategorias, setRelatorioCategorias] = useState(null);
  const [isRelatorioOpen, setIsRelatorioOpen] = useState(false);
  const [isRelatorioLoading, setIsRelatorioLoading] = useState(false);
  const [isPdfSaving, setIsPdfSaving] = useState(false);
  const [relatorioFiltros, setRelatorioFiltros] = useState({
    timeId: '',
    posicaoId: '',
    torneioId: '',
  });

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
          console.error('Erro ao excluir categoria:', e);
          Swal.fire({
            title: 'Erro!',
            text: mensagemDeErro(e, 'Nao foi possivel excluir a categoria.'),
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
      // A mensagem vem da propria validacao (Categoria.validarIdade): o texto
      // fixo que existia aqui escondia o motivo real da recusa.
      console.error('Erro ao salvar categoria:', e);
      Swal.fire({
        title: 'Erro!',
        text: mensagemDeErro(e, 'Nao foi possivel salvar a categoria.'),
        icon: 'error',
        confirmButtonColor: '#920A13', // Use a cor vermelha do seu projeto JPC
      });
    }
  };

  const montarHtmlRelatorioCategorias = () => {
    if (!relatorioCategorias) {
      return montarDocumento({ titulo: 'Categorias', eyebrow: 'Relatorio Geral' });
    }

    const resumo = relatorioCategorias.resumo || {};
    const destaques = relatorioCategorias.destaques || {};
    const filtros = relatorioCategorias.filtrosAplicados || {};

    const linhasCategorias = (relatorioCategorias.categorias || []).map((categoria) => `
      <tr>
        <td><strong>${escapeHtml(categoria.nome)}</strong><span>#ID ${escapeHtml(categoria.id)}</span></td>
        <td class="center">${escapeHtml(categoria.idadeMin)} anos</td>
        <td class="center">${escapeHtml(categoria.idadeMax)} anos</td>
        <td class="center">${escapeHtml(categoria.amplitude)} anos</td>
        <td class="center">${escapeHtml(categoria.totalJogadores || 0)}</td>
      </tr>
    `);

    return montarDocumento({
      titulo: 'Categorias',
      eyebrow: 'Relatorio Geral',
      subtitulo: `Filtros: Time: ${filtros.timeNome || 'Todos'} | Posicao: ${filtros.posicaoNome || 'Todas'} | Torneio: ${filtros.torneioNome || 'Todos'}`,
      corpo: `
        ${blocoMetricas([
          { rotulo: 'Total de categorias', valor: resumo.totalCategorias || 0 },
          { rotulo: 'Total de jogadores', valor: resumo.totalJogadores || 0 },
          { rotulo: 'Com jogadores', valor: resumo.categoriasComJogadores || 0 },
          { rotulo: 'Sem jogadores', valor: resumo.categoriasSemJogadores || 0 },
          { rotulo: 'Menor idade', valor: resumo.menorIdade || 0 },
          { rotulo: 'Maior idade', valor: resumo.maiorIdade || 0 },
          { rotulo: 'Media jogadores/categoria', valor: resumo.mediaJogadoresPorCategoria || 0 },
          { rotulo: 'Media faixa etaria', valor: resumo.mediaAmplitudeFaixa || 0 },
        ])}
        ${blocoDestaques([
          {
            rotulo: 'Mais jogadores',
            valor: destaques.categoriaMaisJogadores
              ? `${destaques.categoriaMaisJogadores.nome} (${destaques.categoriaMaisJogadores.totalJogadores || 0})`
              : null,
          },
          {
            rotulo: 'Maior faixa etaria',
            valor: destaques.maiorFaixaEtaria
              ? `${destaques.maiorFaixaEtaria.nome} (${destaques.maiorFaixaEtaria.amplitude || 0} anos)`
              : null,
          },
          {
            rotulo: 'Menor faixa etaria',
            valor: destaques.menorFaixaEtaria
              ? `${destaques.menorFaixaEtaria.nome} (${destaques.menorFaixaEtaria.amplitude || 0} anos)`
              : null,
          },
        ])}
        ${blocoTabela({
          titulo: 'Categorias cadastradas',
          colunas: [
            'Categoria',
            { rotulo: 'Idade minima', center: true },
            { rotulo: 'Idade maxima', center: true },
            { rotulo: 'Amplitude', center: true },
            { rotulo: 'Jogadores', center: true },
          ],
          linhas: linhasCategorias,
          vazio: 'Nenhuma categoria cadastrada.',
        })}
      `,
    });
  };

  const handleRelatorioFiltroChange = (event) => {
    const { name, value } = event.target;
    setRelatorioFiltros((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleLimparFiltrosRelatorio = () => {
    const filtrosLimpos = { timeId: '', posicaoId: '', torneioId: '' };
    setRelatorioFiltros(filtrosLimpos);
    handleEmitirRelatorio(filtrosLimpos);
  };

  const getResumoFiltrosRelatorio = () => {
    const filtros = relatorioCategorias?.filtrosAplicados || {};
    return `Filtros: Time: ${filtros.timeNome || 'Todos'} | Posicao: ${filtros.posicaoNome || 'Todas'} | Torneio: ${filtros.torneioNome || 'Todos'}`;
  };

  const handleEmitirRelatorio = async (filtros = relatorioFiltros) => {
    const filtrosRelatorio = filtros?.target ? relatorioFiltros : filtros;
    setIsRelatorioLoading(true);

    try {
      if (!window.reportAPI?.categoriasRelatorio) {
        throw new Error('Relatorio indisponivel.');
      }

      const relatorio = await window.reportAPI.categoriasRelatorio(filtrosRelatorio);
      setRelatorioCategorias(relatorio);
      setIsRelatorioOpen(true);
    } catch (e) {
      Swal.fire({
        title: 'Erro!',
        text: mensagemDeErro(e, 'Nao foi possivel emitir o relatorio de categorias.'),
        icon: 'error',
        confirmButtonColor: '#920A13'
      });
    } finally {
      setIsRelatorioLoading(false);
    }
  };

  const handleSalvarRelatorioPdf = async () => {
    if (!relatorioCategorias) {
      return;
    }

    setIsPdfSaving(true);

    try {
      const result = await salvarRelatorioPdf({
        nomeArquivo: nomeArquivoRelatorio('relatorio', 'categorias', new Date().toISOString().slice(0, 10)),
        html: montarHtmlRelatorioCategorias(),
      });

      if (result?.success) {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Relatorio de categorias salvo em PDF.',
          icon: 'success',
          confirmButtonColor: '#920A13'
        });
      }
    } catch (e) {
      Swal.fire({
        title: 'Erro!',
        text: mensagemDeErro(e, 'Nao foi possivel salvar o relatorio em PDF.'),
        icon: 'error',
        confirmButtonColor: '#920A13'
      });
    } finally {
      setIsPdfSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 font-sans">
      {/* Container Centralizado */}
      <div className="max-w-7xl mx-auto w-full">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center gap-4 mb-8 border-b-2 border-red-600 pb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-colors"
          >
            Voltar
          </button>

          <div>
            <h1 className="text-4xl font-black text-black tracking-tight uppercase">Categorias</h1>
            <p className="text-gray-500 mt-1">Gerencie as divisões por faixa etária</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEmitirRelatorio}
              disabled={isRelatorioLoading}
              className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRelatorioLoading ? 'EMITINDO...' : 'RELATORIO'}
            </button>
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

      {isRelatorioOpen && relatorioCategorias && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-black px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b-4 border-red-600">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-300">Relatorio Geral</p>
                <h2 className="text-3xl font-black text-white tracking-wide uppercase">Categorias</h2>
                <p className="mt-1 text-sm font-semibold text-gray-300">{getResumoFiltrosRelatorio()}</p>
              </div>
              <button onClick={() => setIsRelatorioOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6 rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Filtros do Relatorio</p>
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">Filtrar categorias</h3>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    Por time, posicao e torneio
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Time</label>
                    <select
                      name="timeId"
                      value={relatorioFiltros.timeId}
                      onChange={handleRelatorioFiltroChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os times</option>
                      {(relatorioCategorias.opcoes?.times || []).map((time) => (
                        <option key={time.id} value={time.id}>{time.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Posicao</label>
                    <select
                      name="posicaoId"
                      value={relatorioFiltros.posicaoId}
                      onChange={handleRelatorioFiltroChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todas as posicoes</option>
                      {(relatorioCategorias.opcoes?.posicoes || []).map((posicao) => (
                        <option key={posicao.id} value={posicao.id}>{posicao.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-gray-600">Torneio</label>
                    <select
                      name="torneioId"
                      value={relatorioFiltros.torneioId}
                      onChange={handleRelatorioFiltroChange}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-bold text-black outline-none transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">Todos os torneios</option>
                      {(relatorioCategorias.opcoes?.torneios || []).map((torneio) => (
                        <option key={torneio.id} value={torneio.id}>{torneio.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleEmitirRelatorio(relatorioFiltros)}
                      disabled={isRelatorioLoading}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-red-700 disabled:bg-red-300"
                    >
                      {isRelatorioLoading ? 'Filtrando...' : 'Aplicar'}
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparFiltrosRelatorio}
                      disabled={isRelatorioLoading}
                      className="flex-1 rounded-xl bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-neutral-800 disabled:bg-gray-400"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <ReportMetric label="Categorias" value={relatorioCategorias.resumo?.totalCategorias || 0} featured />
                <ReportMetric label="Jogadores" value={relatorioCategorias.resumo?.totalJogadores || 0} />
                <ReportMetric label="Com jogadores" value={relatorioCategorias.resumo?.categoriasComJogadores || 0} />
                <ReportMetric label="Sem jogadores" value={relatorioCategorias.resumo?.categoriasSemJogadores || 0} />
                <ReportMetric label="Menor idade" value={`${relatorioCategorias.resumo?.menorIdade || 0} anos`} />
                <ReportMetric label="Maior idade" value={`${relatorioCategorias.resumo?.maiorIdade || 0} anos`} />
                <ReportMetric label="Media jogadores" value={relatorioCategorias.resumo?.mediaJogadoresPorCategoria || 0} />
                <ReportMetric label="Media faixa" value={`${relatorioCategorias.resumo?.mediaAmplitudeFaixa || 0} anos`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mais jogadores</p>
                  <p className="mt-1 text-lg font-black text-black">{relatorioCategorias.destaques?.categoriaMaisJogadores?.nome || 'Sem dados'}</p>
                  <p className="text-sm font-bold text-gray-500">{relatorioCategorias.destaques?.categoriaMaisJogadores?.totalJogadores || 0} jogadores</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Maior faixa etaria</p>
                  <p className="mt-1 text-lg font-black text-black">{relatorioCategorias.destaques?.maiorFaixaEtaria?.nome || 'Sem dados'}</p>
                  <p className="text-sm font-bold text-gray-500">{relatorioCategorias.destaques?.maiorFaixaEtaria?.amplitude || 0} anos de amplitude</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menor faixa etaria</p>
                  <p className="mt-1 text-lg font-black text-black">{relatorioCategorias.destaques?.menorFaixaEtaria?.nome || 'Sem dados'}</p>
                  <p className="text-sm font-bold text-gray-500">{relatorioCategorias.destaques?.menorFaixaEtaria?.amplitude || 0} anos de amplitude</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Categoria</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Min</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Max</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Amplitude</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center">Jogadores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorioCategorias.categorias?.length > 0 ? relatorioCategorias.categorias.map((categoria) => (
                      <tr key={categoria.id} className="border-t border-gray-100">
                        <td className="px-4 py-3">
                          <p className="font-black text-black uppercase">{categoria.nome}</p>
                          <p className="text-[10px] font-mono text-gray-400">#ID:{categoria.id}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">{categoria.idadeMin}</td>
                        <td className="px-4 py-3 text-center font-bold">{categoria.idadeMax}</td>
                        <td className="px-4 py-3 text-center font-bold">{categoria.amplitude} anos</td>
                        <td className="px-4 py-3 text-center font-black text-red-600">{categoria.totalJogadores || 0}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-400 font-bold">
                          Nenhuma categoria cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRelatorioOpen(false)}
                className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSalvarRelatorioPdf}
                disabled={isPdfSaving}
                className="px-6 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPdfSaving ? 'Salvando...' : 'Salvar como PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GerenciarCategorias;
