import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import GinasioControl from "../../Control/GinasioControl";

const initialFormData = {
  nome: "",
  cidade: "",
  endereco: "",
  estado: "",
};

const swalBaseOptions = {
  backdrop: false,
};

const ESTADOS_UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const Ginasio = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ginasios, setGinasios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [filtrosPesquisa, setFiltrosPesquisa] = useState({
    nome: "",
    estado: "",
    cidade: "",
  });

  const [novoGinasio, setNovoGinasio] = useState(initialFormData);

  const ordenarPorNome = (lista) => {
    return [...(lista || [])].sort((a, b) =>
      String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
        sensitivity: "base",
      })
    );
  };

  const carregarGinasios = async () => {
    try {
      const dadosDoBanco = await GinasioControl.listarGinasios();
      setGinasios(ordenarPorNome(dadosDoBanco || []));
    } catch (e) {
      await Swal.fire({
        ...swalBaseOptions,
        title: "Erro!",
        text: "Nao foi possivel carregar os ginasios.",
        icon: "error",
        confirmButtonColor: "#920A13",
      });
    }
  };

  useEffect(() => {
    carregarGinasios();
  }, []);

  const handlePesquisar = async (e) => {
    e.preventDefault();

    const filtro = {
      nome: filtrosPesquisa.nome.trim(),
      estado: filtrosPesquisa.estado.trim(),
      cidade: filtrosPesquisa.cidade.trim(),
    };

    if (!filtro.nome && !filtro.estado && !filtro.cidade) {
      await carregarGinasios();
      return;
    }

    try {
      const resultado = await GinasioControl.pesquisarGinasio(filtro);
      setGinasios(ordenarPorNome(resultado || []));
    } catch (e) {
      await Swal.fire({
        ...swalBaseOptions,
        title: "Erro!",
        text: "Nao foi possivel pesquisar os ginasios.",
        icon: "error",
        confirmButtonColor: "#920A13",
      });
    }
  };

  const handleLimparPesquisa = async () => {
    setFiltrosPesquisa({ nome: "", estado: "", cidade: "" });
    await carregarGinasios();
  };

  const handleFiltroPesquisaChange = (e) => {
    const { name, value } = e.target;
    setFiltrosPesquisa((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = value;

    setNovoGinasio({
      ...novoGinasio,
      [name]: nextValue,
    });

    if (["nome", "cidade", "estado"].includes(name)) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: String(nextValue || "").trim() ? "" : prev[name],
      }));
    }
  };

  const validarCamposFormulario = () => {
    const erros = {};

    if (!String(novoGinasio.nome || "").trim()) {
      erros.nome = "Nome do ginásio é obrigatório.";
    }

    if (!String(novoGinasio.cidade || "").trim()) {
      erros.cidade = "Cidade é obrigatória.";
    }

    if (!String(novoGinasio.estado || "").trim()) {
      erros.estado = "Estado é obrigatório.";
    }

    setFieldErrors(erros);
    return Object.keys(erros).length === 0;
  };

  const handleNovoGinasio = () => {
    setEditingId(null);
    setFieldErrors({});
    setNovoGinasio(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditarGinasio = (ginasio) => {

    if (!ginasio) {
      return;
    }

    setEditingId(ginasio.id);
    setNovoGinasio({
      nome: ginasio.nome,
      cidade: ginasio.cidade,
      endereco: ginasio.endereco || "",
      estado: String(ginasio.estado || "").toUpperCase(),
    });
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleExcluirGinasio = async (id) => {
    const result = await Swal.fire({
      ...swalBaseOptions,
      title: "Tem certeza?",
      text: "Essa acao nao pode ser desfeita!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#920A13",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await GinasioControl.excluirGinasio(id);
      setGinasios(ordenarPorNome(ginasios.filter((ginasio) => ginasio.id !== id)));

      if (editingId === id) {
        setEditingId(null);
        setNovoGinasio(initialFormData);
        setIsModalOpen(false);
      }

      await Swal.fire({
        ...swalBaseOptions,
        title: "Sucesso!",
        text: "Ginasio excluido com sucesso.",
        icon: "success",
        confirmButtonColor: "#920A13",
      });
    } catch (e) {
      await Swal.fire({
        ...swalBaseOptions,
        title: "Erro!",
        text: "Erro ao excluir ginasio.",
        icon: "error",
        confirmButtonColor: "#920A13",
      });
    }
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
    setNovoGinasio(initialFormData);
  };

  const handleSalvarGinasio = async (e) => {
    e.preventDefault();

    if (!validarCamposFormulario()) {
      return;
    }

    const dados = {
      nome: novoGinasio.nome,
      cidade: novoGinasio.cidade,
      endereco: novoGinasio.endereco,
      estado: novoGinasio.estado,
    };

    if (editingId !== null) {
      const confirmacao = await Swal.fire({
        ...swalBaseOptions,
        title: "Confirmar alteracao?",
        text: "Deseja salvar as alteracoes deste ginasio?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#920A13",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sim, salvar",
        cancelButtonText: "Cancelar",
      });

      if (!confirmacao.isConfirmed) {
        return;
      }

      try {
        await GinasioControl.editarGinasio(editingId, dados);

        setGinasios(
          ordenarPorNome(
            ginasios.map((ginasio) =>
              ginasio.id === editingId ? { ...ginasio, ...dados, id: editingId } : ginasio
            )
          )
        );

        await Swal.fire({
          ...swalBaseOptions,
          title: "Sucesso!",
          text: "Ginasio alterado com sucesso.",
          icon: "success",
          confirmButtonColor: "#920A13",
        });
      } catch (e) {
        await Swal.fire({
          ...swalBaseOptions,
          title: "Erro!",
          text: e?.message || "Erro ao alterar ginasio.",
          icon: "error",
          confirmButtonColor: "#920A13",
        });
        return;
      }
    } else {
      try {
        const resultado = await GinasioControl.cadastrarDados(dados);

        if (resultado) {
          setGinasios([
            ...ordenarPorNome(ginasios),
            {
              ...dados,
              id: resultado,
            },
          ].sort((a, b) =>
            String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
              sensitivity: "base",
            })
          ));
        }
      } catch (e) {
        await Swal.fire({
          ...swalBaseOptions,
          title: "Erro!",
          text: e?.message || "Erro ao cadastrar ginasio.",
          icon: "error",
          confirmButtonColor: "#920A13",
        });
        return;
      }
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

      <form
        onSubmit={handlePesquisar}
        className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch"
      >
        <input
          type="text"
          name="nome"
          value={filtrosPesquisa.nome}
          onChange={handleFiltroPesquisaChange}
          placeholder="Pesquisar por nome"
          className="sm:col-span-2 lg:col-span-4 bg-white border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 p-3"
        />
        <select
          name="estado"
          value={filtrosPesquisa.estado}
          onChange={handleFiltroPesquisaChange}
          className="lg:col-span-2 bg-white border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 p-3"
        >
          <option value="">Todos os estados</option>
          {ESTADOS_UF.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="cidade"
          value={filtrosPesquisa.cidade}
          onChange={handleFiltroPesquisaChange}
          placeholder="Pesquisar por cidade"
          className="lg:col-span-2 bg-white border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 p-3"
        />
        <button
          type="submit"
          className="lg:col-span-2 bg-black hover:bg-gray-800 text-white font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap"
        >
          Pesquisar
        </button>
        <button
          type="button"
          onClick={handleLimparPesquisa}
          className="lg:col-span-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap"
        >
          Limpar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ginasios.map((ginasio, index) => (
          <div
            key={`${ginasio.nome}-${ginasio.cidade}-${index}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Ginásio
              </span>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-black mb-1">{ginasio.nome}</h3>
              <p className="text-gray-600 font-medium mb-5">
                {ginasio.cidade || "Sem cidade"} - {ginasio.estado}
              </p>
              <p className="text-gray-500 text-sm mb-5">
                {ginasio.endereco || "Sem endereco"}
              </p>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleEditarGinasio(ginasio)}
                >
                  Alterar
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleExcluirGinasio(ginasio.id)}
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {editingId !== null ? "Alterar Ginásio" : "Novo Ginásio"}
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

            <form noValidate onSubmit={handleSalvarGinasio} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Nome do Ginásio *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={novoGinasio.nome}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 text-black rounded-lg block p-3 ${
                    fieldErrors.nome
                      ? "border border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border border-gray-300 focus:ring-red-500 focus:border-red-500"
                  }`}
                />
                {fieldErrors.nome && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.nome}</p>
                )}
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
                    className={`w-full bg-gray-50 text-black rounded-lg block p-3 ${
                      fieldErrors.cidade
                        ? "border border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border border-gray-300 focus:ring-red-500 focus:border-red-500"
                    }`}
                  />
                  {fieldErrors.cidade && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.cidade}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Estado *
                  </label>
                  <select
                    name="estado"
                    value={novoGinasio.estado}
                    onChange={handleInputChange}
                    className={`w-full bg-gray-50 text-black rounded-lg block p-3 uppercase ${
                      fieldErrors.estado
                        ? "border border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border border-gray-300 focus:ring-red-500 focus:border-red-500"
                    }`}
                  >
                    <option value="">Selecione o estado</option>
                    {ESTADOS_UF.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.estado && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.estado}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Endereco
                </label>
                <input
                  type="text"
                  name="endereco"
                  value={novoGinasio.endereco}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 block p-3"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                  {editingId !== null ? "Salvar Alteracao" : "Salvar Ginasio"}
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
