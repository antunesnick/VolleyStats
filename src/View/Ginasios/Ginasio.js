import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GinasioControl from "../../Control/GinasioControl";
import { Alertas } from "../../utils/Alertas";

const initialFormData = {
  nome: "",
  cidade: "",
  endereco: "",
  estado: "",
};

const ESTADOS_UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const Ginasio = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ginasios, setGinasios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [reportData, setReportData] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportLoadingId, setIsReportLoadingId] = useState(null);
  const [isReportPdfSaving, setIsReportPdfSaving] = useState(false);
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

  const formatDateBR = (value) => {
    if (!value) {
      return "--/--/----";
    }

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return String(value);
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const carregarGinasios = async () => {
    try {
      const dadosDoBanco = await GinasioControl.listarGinasios();
      setGinasios(ordenarPorNome(dadosDoBanco || []));
    } catch (e) {
      Alertas.erro("Nao foi possivel carregar os ginasios.");
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
      Alertas.erro("Nao foi possivel pesquisar os ginasios.");
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
    const confirmado = await Alertas.confirmacao("Essa acao nao pode ser desfeita!", "Tem certeza?");

    if (!confirmado) {
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

      Alertas.sucesso("Ginasio excluido com sucesso.");
    } catch (e) {
      Alertas.erro("Erro ao excluir ginasio.");
    }
  };

  const handleEmitirRelatorio = async (ginasio) => {
    if (!ginasio?.id) {
      return;
    }

    if (!window.reportAPI?.ginasioRelatorio) {
      Alertas.erro("Relatorio indisponivel.");
      return;
    }

    setIsReportLoadingId(ginasio.id);
    try {
      const relatorio = await window.reportAPI.ginasioRelatorio(ginasio.id);
      setReportData(relatorio);
      setIsReportOpen(true);
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel emitir o relatorio do ginasio.");
    } finally {
      setIsReportLoadingId(null);
    }
  };

  const handleFecharRelatorio = () => {
    setIsReportOpen(false);
    setReportData(null);
    setIsReportPdfSaving(false);
  };

  const montarHtmlRelatorioGinasio = () => {
    if (!reportData) {
      return "<html><body><h1>Relatorio do ginasio</h1></body></html>";
    }

    const ginasio = reportData.ginasio || {};
    const resumo = reportData.resumo || {};
    const times = reportData.times || [];
    const jogos = reportData.jogos || [];

    const linhasTimes = times.map((time, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(time.nome)}</strong></td>
        <td class="center">${time.jogos}</td>
        <td class="center">${time.vitorias}</td>
        <td class="center">${time.derrotas}</td>
        <td class="center">${time.empates}</td>
        <td class="center">${time.taxaVitoria}%</td>
        <td class="center">${time.setsGanhos}</td>
        <td class="center">${time.setsPerdidos}</td>
        <td class="center">${time.saldoSets}</td>
      </tr>
    `).join("");

    const linhasJogos = jogos.map((jogo) => `
      <tr>
        <td>${escapeHtml(formatDateBR(jogo.dataPartida))}</td>
        <td><strong>${escapeHtml(jogo.time1Nome)} x ${escapeHtml(jogo.time2Nome)}</strong><span>${escapeHtml(jogo.nome || "Partida")}</span></td>
        <td>${escapeHtml(jogo.torneioNome || "Sem torneio")}</td>
        <td class="center">${escapeHtml(jogo.placar)}</td>
        <td class="center">${escapeHtml(jogo.vencedor)}</td>
      </tr>
    `).join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio do Ginasio - ${escapeHtml(ginasio.nome)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 30px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }
            header { padding: 22px 24px; color: #fff; background: #000; border-bottom: 6px solid #dc2626; border-radius: 14px 14px 0 0; }
            .eyebrow { margin: 0 0 6px; color: #f87171; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
            h1 { margin: 0; font-size: 30px; line-height: 1; text-transform: uppercase; }
            .sub { margin-top: 8px; color: #d1d5db; font-size: 13px; font-weight: 700; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
            .metric { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
            .metric.featured { color: #fff; background: #000; border-color: #000; }
            .metric span { display: block; color: #6b7280; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; }
            .metric.featured span { color: #f87171; }
            .metric strong { display: block; margin-top: 8px; font-size: 22px; font-weight: 900; }
            .table-title { margin: 26px 0 0; padding: 14px 18px; background: #dc2626; color: #fff; font-size: 18px; font-weight: 900; text-transform: uppercase; border-radius: 12px 12px 0 0; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
            th { padding: 10px; background: #000; color: #fff; font-size: 10px; letter-spacing: 1px; text-align: left; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: top; }
            td span { display: block; margin-top: 4px; color: #6b7280; font-size: 10px; font-weight: 700; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <header>
            <p class="eyebrow">Relatorio do Ginasio</p>
            <h1>${escapeHtml(ginasio.nome || "Ginasio")}</h1>
            <div class="sub">${escapeHtml(ginasio.cidade || "Cidade nao informada")} - ${escapeHtml(ginasio.estado || "UF")}</div>
            <div class="sub">${escapeHtml(ginasio.endereco || "Endereco nao informado")}</div>
          </header>

          <section class="metrics">
            <div class="metric featured"><span>Total partidas</span><strong>${resumo.totalPartidas || 0}</strong></div>
            <div class="metric"><span>Finalizadas</span><strong>${resumo.finalizadas || 0}</strong></div>
            <div class="metric"><span>Agendadas</span><strong>${resumo.agendadas || 0}</strong></div>
            <div class="metric"><span>Times diferentes</span><strong>${resumo.totalTimes || 0}</strong></div>
            <div class="metric featured"><span>Vitorias</span><strong>${resumo.vitorias || 0}</strong></div>
            <div class="metric"><span>Derrotas</span><strong>${resumo.derrotas || 0}</strong></div>
            <div class="metric"><span>Empates</span><strong>${resumo.empates || 0}</strong></div>
            <div class="metric"><span>Melhor time</span><strong>${escapeHtml(reportData.melhorTime?.nome || "Sem dados")}</strong></div>
          </section>

          <h2 class="table-title">Desempenho por time</h2>
          <table>
            <thead>
              <tr>
                <th class="center">#</th><th>Time</th><th class="center">J</th><th class="center">V</th><th class="center">D</th><th class="center">E</th><th class="center">Taxa</th><th class="center">SG</th><th class="center">SP</th><th class="center">Saldo</th>
              </tr>
            </thead>
            <tbody>${linhasTimes || '<tr><td colspan="10" class="center">Nenhum time encontrado.</td></tr>'}</tbody>
          </table>

          <h2 class="table-title">Historico de partidas</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Jogo</th><th>Torneio</th><th class="center">Placar</th><th class="center">Vencedor</th>
              </tr>
            </thead>
            <tbody>${linhasJogos || '<tr><td colspan="5" class="center">Nenhuma partida encontrada.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleSalvarRelatorioPdf = async () => {
    if (!reportData) {
      return;
    }

    if (!window.reportAPI?.salvarPdf) {
      Alertas.erro("Exportacao em PDF indisponivel.");
      return;
    }

    setIsReportPdfSaving(true);

    try {
      const nomeGinasio = String(reportData.ginasio?.nome || "ginasio")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const result = await window.reportAPI.salvarPdf({
        nomeArquivo: `relatorio-ginasio-${nomeGinasio}.pdf`,
        html: montarHtmlRelatorioGinasio(),
      });

      if (result?.success) {
        Alertas.sucesso("Relatorio salvo em PDF com sucesso.");
      }
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel salvar o relatorio em PDF.");
    } finally {
      setIsReportPdfSaving(false);
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
      const confirmacao = await Alertas.confirmacao(
        "Deseja salvar as alteracoes deste ginasio?",
        "Confirmar alteracao?"
      );

      if (!confirmacao) {
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

        Alertas.sucesso("Ginasio alterado com sucesso.");
      } catch (e) {
        Alertas.erro(e?.message || "Erro ao alterar ginasio.");
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
        Alertas.erro(e?.message || "Erro ao cadastrar ginasio.");
        return;
      }
    }

    handleFecharModal();
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

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="flex-1 bg-black hover:bg-gray-800 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleEditarGinasio(ginasio)}
                >
                  Alterar
                </button>
                <button
                  type="button"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors text-sm"
                  onClick={() => handleExcluirGinasio(ginasio.id)}
                >
                  Excluir
                </button>
                <button
                  type="button"
                  disabled={isReportLoadingId === ginasio.id}
                  className="flex-1 bg-gray-900 hover:bg-black text-white font-semibold py-2 rounded transition-colors text-sm disabled:opacity-60 disabled:cursor-wait"
                  onClick={() => handleEmitirRelatorio(ginasio)}
                >
                  {isReportLoadingId === ginasio.id ? "Emitindo..." : "Relatorio"}
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

      {isReportOpen && reportData && (
        <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl max-h-[88vh] rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            <div className="shrink-0 flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Relatorio do ginasio</p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {reportData.ginasio?.nome || "Ginasio"}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isReportPdfSaving}
                  onClick={handleSalvarRelatorioPdf}
                  className="rounded-full bg-black px-5 py-2.5 text-sm font-black text-white hover:bg-gray-900 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {isReportPdfSaving ? "Salvando..." : "Salvar PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleFecharRelatorio}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm font-black text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="Fechar"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Local</p>
                <div className="text-sm font-medium text-gray-700 space-y-1">
                  <p><span className="font-black text-gray-900">Cidade:</span> {reportData.ginasio?.cidade || "--"} - {reportData.ginasio?.estado || "--"}</p>
                  <p><span className="font-black text-gray-900">Endereco:</span> {reportData.ginasio?.endereco || "Nao informado"}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total partidas</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.totalPartidas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Finalizadas</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.finalizadas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Agendadas</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.agendadas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Times diferentes</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.totalTimes || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vitorias</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.vitorias || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Derrotas</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.derrotas || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Empates</p>
                  <p className="mt-2 text-2xl font-black text-gray-900">{reportData.resumo?.empates || 0}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-black p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Melhor time</p>
                  <p className="mt-2 text-2xl font-black">{reportData.melhorTime?.nome || "Sem dados"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Desempenho por time</h3>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-3 py-3 text-center">#</th>
                        <th className="px-3 py-3 text-left">Time</th>
                        <th className="px-3 py-3 text-center">J</th>
                        <th className="px-3 py-3 text-center">V</th>
                        <th className="px-3 py-3 text-center">D</th>
                        <th className="px-3 py-3 text-center">E</th>
                        <th className="px-3 py-3 text-center">Taxa</th>
                        <th className="px-3 py-3 text-center">SG</th>
                        <th className="px-3 py-3 text-center">SP</th>
                        <th className="px-3 py-3 text-center">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.times || []).length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-3 py-4 text-center text-gray-500">
                            Nenhum time encontrado.
                          </td>
                        </tr>
                      )}
                      {(reportData.times || []).map((time, index) => (
                        <tr key={`${time.nome}-${index}`} className="bg-white">
                          <td className="px-3 py-3 text-center font-semibold">{index + 1}</td>
                          <td className="px-3 py-3 font-semibold text-gray-900">{time.nome}</td>
                          <td className="px-3 py-3 text-center">{time.jogos}</td>
                          <td className="px-3 py-3 text-center">{time.vitorias}</td>
                          <td className="px-3 py-3 text-center">{time.derrotas}</td>
                          <td className="px-3 py-3 text-center">{time.empates}</td>
                          <td className="px-3 py-3 text-center">{time.taxaVitoria}%</td>
                          <td className="px-3 py-3 text-center">{time.setsGanhos}</td>
                          <td className="px-3 py-3 text-center">{time.setsPerdidos}</td>
                          <td className="px-3 py-3 text-center">{time.saldoSets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Historico de partidas</h3>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black text-white text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-3 py-3 text-left">Data</th>
                        <th className="px-3 py-3 text-left">Jogo</th>
                        <th className="px-3 py-3 text-left">Torneio</th>
                        <th className="px-3 py-3 text-center">Placar</th>
                        <th className="px-3 py-3 text-center">Vencedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(reportData.jogos || []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                            Nenhuma partida encontrada.
                          </td>
                        </tr>
                      )}
                      {(reportData.jogos || []).map((jogo) => (
                        <tr key={jogo.id} className="bg-white">
                          <td className="px-3 py-3 font-semibold text-gray-900">{formatDateBR(jogo.dataPartida)}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-gray-900">{jogo.time1Nome} x {jogo.time2Nome}</p>
                            <p className="text-xs text-gray-500">{jogo.nome || "Partida"}</p>
                          </td>
                          <td className="px-3 py-3 text-gray-700">{jogo.torneioNome || "Sem torneio"}</td>
                          <td className="px-3 py-3 text-center font-semibold">{jogo.placar}</td>
                          <td className="px-3 py-3 text-center font-semibold">{jogo.vencedor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ginasio;
