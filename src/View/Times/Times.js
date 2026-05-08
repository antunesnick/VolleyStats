import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TimesControl from "../../Control/TimesControl";
import { Alertas } from "../../utils/Alertas";

const initialFormData = {
  nome: "",
  cidade: "",
  imagem: "",
};

const Times = () => {
  const navigate = useNavigate();
  const timesControl = TimesControl.getInstance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [times, setTimes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [filtrosPesquisa, setFiltrosPesquisa] = useState({
    nome: "",
    cidade: "",
  });
  const [novoTime, setNovoTime] = useState(initialFormData);

  const ordenarPorNome = (lista) => {
    return [...(lista || [])].sort((a, b) =>
      String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
        sensitivity: "base",
      })
    );
  };

  const carregarTimes = async () => {
    try {
      const dadosDoBanco = await timesControl.listarTimes();
      setTimes(ordenarPorNome(dadosDoBanco || []));
    } catch (e) {
      Alertas.erro("Nao foi possivel carregar os times.");
    }
  };

  useEffect(() => {
    carregarTimes();
  }, []);

  const handlePesquisar = async (e) => {
    e.preventDefault();

    const filtro = {
      nome: filtrosPesquisa.nome.trim(),
      cidade: filtrosPesquisa.cidade.trim(),
    };

    if (!filtro.nome && !filtro.cidade) {
      await carregarTimes();
      return;
    }

    try {
      const resultado = await timesControl.pesquisarTime(filtro);
      setTimes(ordenarPorNome(resultado || []));
    } catch (e) {
      Alertas.erro("Nao foi possivel pesquisar os times.");
    }
  };

  const handleLimparPesquisa = async () => {
    setFiltrosPesquisa({ nome: "", cidade: "" });
    await carregarTimes();
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

    setNovoTime({
      ...novoTime,
      [name]: value,
    });

    if (["nome", "cidade"].includes(name)) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: String(value || "").trim() ? "" : prev[name],
      }));
    }
  };

  const handleImagemChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNovoTime((prev) => ({
        ...prev,
        imagem: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const validarCamposFormulario = () => {
    const erros = {};

    if (!String(novoTime.nome || "").trim()) {
      erros.nome = "Nome do time e obrigatorio.";
    }

    if (!String(novoTime.cidade || "").trim()) {
      erros.cidade = "Cidade e obrigatoria.";
    }

    setFieldErrors(erros);
    return Object.keys(erros).length === 0;
  };

  const handleNovoTime = () => {
    setEditingId(null);
    setFieldErrors({});
    setNovoTime(initialFormData);
    setIsModalOpen(true);
  };

  const handleEditarTime = (time) => {
    if (!time) {
      return;
    }

    setEditingId(time.id);
    setNovoTime({
      nome: time.nome || "",
      cidade: time.cidade || "",
      imagem: time.imagem || "",
    });
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleExcluirTime = async (id) => {
    const confirmado = await Alertas.confirmacao("Essa acao nao pode ser desfeita!", "Tem certeza?");

    if (!confirmado) {
      return;
    }

    try {
      await timesControl.excluirTime(id);
      setTimes(ordenarPorNome(times.filter((time) => time.id !== id)));

      if (editingId === id) {
        setEditingId(null);
        setNovoTime(initialFormData);
        setIsModalOpen(false);
      }

      Alertas.sucesso("Time excluido com sucesso.");
    } catch (e) {
      Alertas.erro(e?.message || "Erro ao excluir time.");
    }
  };

  const handleFecharModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
    setNovoTime(initialFormData);
  };

  const handleSalvarTime = async (e) => {
    e.preventDefault();

    if (!validarCamposFormulario()) {
      return;
    }

    const dados = {
      nome: novoTime.nome,
      cidade: novoTime.cidade,
      imagem: novoTime.imagem,
    };

    if (editingId !== null) {
      const confirmacao = await Alertas.confirmacao(
        "Deseja salvar as alteracoes deste time?",
        "Confirmar alteracao?"
      );

      if (!confirmacao) {
        return;
      }

      try {
        await timesControl.editarTime(editingId, dados);

        setTimes(
          ordenarPorNome(
            times.map((time) =>
              time.id === editingId ? { ...time, ...dados, id: editingId } : time
            )
          )
        );

        Alertas.sucesso("Time alterado com sucesso.");
      } catch (e) {
        Alertas.erro(e?.message || "Erro ao alterar time.");
        return;
      }
    } else {
      try {
        const resultado = await timesControl.cadastrarDados(dados);

        if (resultado) {
          setTimes(
            ordenarPorNome([
              ...times,
              {
                ...dados,
                id: resultado,
              },
            ])
          );
        }

        Alertas.sucesso("Time cadastrado com sucesso.");
      } catch (e) {
        Alertas.erro(e?.message || "Erro ao cadastrar time.");
        return;
      }
    }

    handleFecharModal();
  };

  const renderImagemTime = (time) => {
    if (time.imagem) {
      return (
        <img
          src={time.imagem}
          alt={time.nome}
          className="h-16 w-16 rounded-lg object-cover border border-gray-200 bg-gray-100"
        />
      );
    }

    return (
      <div className="h-16 w-16 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xl">
        {String(time.nome || "T").slice(0, 1).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="flex justify-between items-center gap-4 mb-8 border-b-2 border-red-600 pb-4">
        <button
          type="button"
          className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-colors"
          onClick={() => navigate("/")}
        >
          Voltar
        </button>

        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">
            Times
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os times cadastrados</p>
        </div>

        <button
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors"
          onClick={handleNovoTime}
        >
          NOVO TIME
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
        <input
          type="text"
          name="cidade"
          value={filtrosPesquisa.cidade}
          onChange={handleFiltroPesquisaChange}
          placeholder="Pesquisar por cidade"
          className="lg:col-span-4 bg-white border border-gray-300 text-black rounded-lg focus:ring-red-500 focus:border-red-500 p-3"
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
        {times.map((time, index) => (
          <div
            key={`${time.nome}-${time.cidade}-${index}`}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Time
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                {renderImagemTime(time)}
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-black mb-1 truncate">{time.nome}</h3>
                  <p className="text-gray-600 font-medium">
                    {time.cidade || "Sem cidade"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleEditarTime(time)}
                >
                  Alterar
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleExcluirTime(time.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {times.length === 0 && (
        <div className="mt-8 bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
          Nenhum time cadastrado ainda.
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-black px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                {editingId !== null ? "Alterar Time" : "Novo Time"}
              </h2>
              <button
                type="button"
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

            <form noValidate onSubmit={handleSalvarTime} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Nome do Time *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={novoTime.nome}
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

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  name="cidade"
                  value={novoTime.cidade}
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
                  Imagem do Time
                </label>
                {novoTime.imagem && (
                  <img
                    src={novoTime.imagem}
                    alt="Preview do time"
                    className="w-24 h-24 object-cover rounded-lg mb-3 border border-gray-300 bg-gray-100"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagemChange}
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
                  {editingId !== null ? "Salvar Alteracao" : "Salvar Time"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Times;
