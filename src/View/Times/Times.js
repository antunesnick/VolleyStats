import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TimesControl from "../../Control/TimesControl";
import { Alertas } from "../../utils/Alertas";

const initialFormData = {
  nome: "",
  cidade: "",
  imagem: "",
};

const TeamAvatar = ({ time, className = "h-16 w-16" }) => {
  const [imageError, setImageError] = useState(false);
  const primeiraLetra = String(time?.nome || "T").slice(0, 1).toUpperCase();

  if (time?.imagem && !imageError) {
    return (
      <img
        src={time.imagem}
        alt={time.nome}
        onError={() => setImageError(true)}
        className={`${className} rounded-lg object-cover border border-gray-200 bg-gray-100`}
      />
    );
  }

  return (
    <div className={`${className} rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xl`}>
      {primeiraLetra}
    </div>
  );
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
  const [relatorioTime, setRelatorioTime] = useState(null);
  const [isRelatorioOpen, setIsRelatorioOpen] = useState(false);
  const [isLoadingRelatorio, setIsLoadingRelatorio] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [relatorioGeral, setRelatorioGeral] = useState(null);
  const [isRelatorioGeralOpen, setIsRelatorioGeralOpen] = useState(false);
  const [isLoadingRelatorioGeral, setIsLoadingRelatorioGeral] = useState(false);

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

  const formatarDataBrasil = (dataString) => {
    if (!dataString) return "--/--/----";

    const [ano, mes, dia] = String(dataString).split("-");
    if (!ano || !mes || !dia) return dataString;

    return `${dia}/${mes}/${ano}`;
  };

  const handleEmitirRelatorio = async (time) => {
    setIsLoadingRelatorio(true);

    try {
      const relatorio = await timesControl.relatorioTime(time.id);
      setRelatorioTime(relatorio);
      setIsRelatorioOpen(true);
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel emitir o relatorio do time.");
    } finally {
      setIsLoadingRelatorio(false);
    }
  };

  const handleFecharRelatorio = () => {
    setIsRelatorioOpen(false);
    setRelatorioTime(null);
    setIsSavingPdf(false);
  };

  const handleEmitirRelatorioGeral = async () => {
    setIsLoadingRelatorioGeral(true);

    try {
      const relatorio = await timesControl.relatorioGeralTimes();
      setRelatorioGeral(relatorio);
      setIsRelatorioGeralOpen(true);
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel emitir o relatorio geral de times.");
    } finally {
      setIsLoadingRelatorioGeral(false);
    }
  };

  const handleFecharRelatorioGeral = () => {
    setIsRelatorioGeralOpen(false);
    setRelatorioGeral(null);
    setIsSavingPdf(false);
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const montarHtmlRelatorioTime = () => {
    const time = relatorioTime.time;
    const resumo = relatorioTime.resumo;
    const linhasHistorico = relatorioTime.historico.map((partida) => `
      <tr>
        <td>${escapeHtml(formatarDataBrasil(partida.dataPartida))}</td>
        <td>
          <strong>${escapeHtml(partida.nome || "Partida")}</strong>
          <span>${escapeHtml(partida.ginasioNome)}</span>
        </td>
        <td>${escapeHtml(partida.adversario)}</td>
        <td>${escapeHtml(partida.torneioNome)}</td>
        <td class="center">${partida.status === "FINALIZADA" ? `${partida.pontosPro} x ${partida.pontosContra}` : "--"}</td>
        <td class="center">
          <span class="tag ${partida.resultado === "Vitoria" ? "win" : partida.resultado === "Derrota" ? "loss" : "pending"}">
            ${escapeHtml(partida.resultado)}
          </span>
        </td>
      </tr>
    `).join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio do Time - ${escapeHtml(time.nome)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 24px;
              padding: 22px 24px;
              color: #ffffff;
              background: #000000;
              border-bottom: 6px solid #dc2626;
              border-radius: 14px 14px 0 0;
            }
            .eyebrow {
              margin: 0 0 6px;
              color: #f87171;
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            h1 {
              margin: 0;
              font-size: 30px;
              line-height: 1;
              text-transform: uppercase;
            }
            .city {
              margin-top: 8px;
              color: #d1d5db;
              font-size: 13px;
              font-weight: 700;
            }
            .avatar {
              width: 72px;
              height: 72px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 auto;
              border-radius: 12px;
              background: #dc2626;
              color: #ffffff;
              font-size: 32px;
              font-weight: 900;
            }
            .metrics {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin: 22px 0;
            }
            .metric {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 16px;
              background: #ffffff;
            }
            .metric.featured {
              color: #ffffff;
              background: #000000;
              border-color: #000000;
            }
            .metric span {
              display: block;
              color: #6b7280;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 1.4px;
              text-transform: uppercase;
            }
            .metric.featured span { color: #f87171; }
            .metric strong {
              display: block;
              margin-top: 8px;
              font-size: 28px;
              font-weight: 900;
            }
            .table-title {
              margin: 26px 0 0;
              padding: 14px 18px;
              background: #dc2626;
              color: #ffffff;
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              border-radius: 12px 12px 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e5e7eb;
            }
            th {
              padding: 11px;
              background: #000000;
              color: #ffffff;
              font-size: 10px;
              letter-spacing: 1px;
              text-align: left;
              text-transform: uppercase;
            }
            td {
              padding: 12px 11px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 12px;
              vertical-align: top;
            }
            td span {
              display: block;
              margin-top: 4px;
              color: #6b7280;
              font-size: 10px;
              font-weight: 700;
            }
            .center { text-align: center; }
            .tag {
              display: inline-block;
              min-width: 78px;
              margin: 0;
              padding: 5px 8px;
              border-radius: 999px;
              color: #ffffff;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .tag.win { background: #dc2626; }
            .tag.loss { background: #000000; }
            .tag.pending { background: #e5e7eb; color: #374151; }
          </style>
        </head>
        <body>
          <header>
            <div>
              <p class="eyebrow">Relatorio do Time</p>
              <h1>${escapeHtml(time.nome)}</h1>
              <div class="city">${escapeHtml(time.cidade || "Cidade nao informada")}</div>
            </div>
            <div class="avatar">${escapeHtml(String(time.nome || "T").slice(0, 1).toUpperCase())}</div>
          </header>

          <section class="metrics">
            <div class="metric featured"><span>Taxa de vitoria</span><strong>${resumo.taxaVitoria}%</strong></div>
            <div class="metric"><span>Vitorias</span><strong>${resumo.vitorias}</strong></div>
            <div class="metric"><span>Derrotas</span><strong>${resumo.derrotas}</strong></div>
            <div class="metric"><span>Jogos finalizados</span><strong>${resumo.finalizadas}</strong></div>
            <div class="metric"><span>Total de jogos</span><strong>${resumo.totalPartidas}</strong></div>
            <div class="metric"><span>Agendadas</span><strong>${resumo.agendadas}</strong></div>
            <div class="metric"><span>Sets ganhos</span><strong>${resumo.setsGanhos}</strong></div>
            <div class="metric"><span>Saldo de sets</span><strong>${resumo.saldoSets}</strong></div>
          </section>

          <h2 class="table-title">Historico de Partidas</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Partida</th>
                <th>Adversario</th>
                <th>Torneio</th>
                <th class="center">Placar</th>
                <th class="center">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHistorico || '<tr><td colspan="6" class="center">Este time ainda nao possui partidas cadastradas.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const montarHtmlRelatorioGeralTimes = () => {
    const resumo = relatorioGeral.resumo;
    const linhasTimes = relatorioGeral.times
      .sort((a, b) => b.vitorias - a.vitorias || b.saldoSets - a.saldoSets || String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" }))
      .map((time, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td><strong>${escapeHtml(time.nome)}</strong><span>${escapeHtml(time.cidade || "Cidade nao informada")}</span></td>
          <td class="center">${time.vitorias}</td>
          <td class="center">${time.derrotas}</td>
          <td class="center">${time.finalizadas}</td>
          <td class="center">${time.taxaVitoria}%</td>
          <td class="center">${time.setsGanhos}</td>
          <td class="center">${time.setsPerdidos}</td>
          <td class="center">${time.saldoSets}</td>
        </tr>
      `).join("");
    const linhasJogos = relatorioGeral.jogos.map((jogo) => `
      <tr>
        <td>${escapeHtml(formatarDataBrasil(jogo.dataPartida))}</td>
        <td><strong>${escapeHtml(jogo.time1Nome)} x ${escapeHtml(jogo.time2Nome)}</strong><span>${escapeHtml(jogo.nome || "Partida")}</span></td>
        <td>${escapeHtml(jogo.torneioNome)}</td>
        <td>${escapeHtml(jogo.ginasioNome)}</td>
        <td class="center">${escapeHtml(jogo.placar)}</td>
        <td class="center">${escapeHtml(jogo.vencedor)}</td>
      </tr>
    `).join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio Geral de Times</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 30px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #fff; }
            header { padding: 22px 24px; color: #fff; background: #000; border-bottom: 6px solid #dc2626; border-radius: 14px 14px 0 0; }
            .eyebrow { margin: 0 0 6px; color: #f87171; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
            h1 { margin: 0; font-size: 30px; line-height: 1; text-transform: uppercase; }
            .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
            .metric { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
            .metric.featured { color: #fff; background: #000; border-color: #000; }
            .metric span { display: block; color: #6b7280; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; }
            .metric.featured span { color: #f87171; }
            .metric strong { display: block; margin-top: 8px; font-size: 28px; font-weight: 900; }
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
            <p class="eyebrow">VolleyStats</p>
            <h1>Relatorio Geral de Times</h1>
          </header>

          <section class="metrics">
            <div class="metric featured"><span>Quem ganhou mais</span><strong>${escapeHtml(relatorioGeral.rankingVitorias[0]?.nome || "Sem dados")}</strong></div>
            <div class="metric"><span>Vitorias do lider</span><strong>${relatorioGeral.rankingVitorias[0]?.vitorias || 0}</strong></div>
            <div class="metric"><span>Quem perdeu mais</span><strong>${escapeHtml(relatorioGeral.rankingDerrotas[0]?.nome || "Sem dados")}</strong></div>
            <div class="metric"><span>Derrotas</span><strong>${relatorioGeral.rankingDerrotas[0]?.derrotas || 0}</strong></div>
            <div class="metric"><span>Total de times</span><strong>${resumo.totalTimes}</strong></div>
            <div class="metric"><span>Total de jogos</span><strong>${resumo.totalJogos}</strong></div>
            <div class="metric"><span>Finalizados</span><strong>${resumo.jogosFinalizados}</strong></div>
            <div class="metric"><span>Agendados</span><strong>${resumo.jogosAgendados}</strong></div>
          </section>

          <h2 class="table-title">Classificacao por vitorias</h2>
          <table>
            <thead>
              <tr>
                <th class="center">#</th><th>Time</th><th class="center">V</th><th class="center">D</th><th class="center">J</th><th class="center">Taxa</th><th class="center">SG</th><th class="center">SP</th><th class="center">Saldo</th>
              </tr>
            </thead>
            <tbody>${linhasTimes || '<tr><td colspan="9" class="center">Nenhum time encontrado.</td></tr>'}</tbody>
          </table>

          <h2 class="table-title">Pontuacao de cada jogo</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Jogo</th><th>Torneio</th><th>Local</th><th class="center">Placar</th><th class="center">Vencedor</th>
              </tr>
            </thead>
            <tbody>${linhasJogos || '<tr><td colspan="6" class="center">Nenhum jogo encontrado.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleSalvarRelatorioPdf = async () => {
    if (!relatorioTime) {
      return;
    }

    setIsSavingPdf(true);

    try {
      const nomeTime = String(relatorioTime.time?.nome || "time")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const result = await window.reportAPI.salvarPdf({
        nomeArquivo: `relatorio-time-${nomeTime}.pdf`,
        html: montarHtmlRelatorioTime(),
      });

      if (result?.success) {
        Alertas.sucesso("Relatorio salvo em PDF com sucesso.");
      }
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel salvar o relatorio em PDF.");
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSalvarRelatorioGeralPdf = async () => {
    if (!relatorioGeral) {
      return;
    }

    setIsSavingPdf(true);

    try {
      const result = await window.reportAPI.salvarPdf({
        nomeArquivo: "relatorio-geral-times.pdf",
        html: montarHtmlRelatorioGeralTimes(),
      });

      if (result?.success) {
        Alertas.sucesso("Relatorio geral salvo em PDF com sucesso.");
      }
    } catch (e) {
      Alertas.erro(e?.message || "Nao foi possivel salvar o relatorio geral em PDF.");
    } finally {
      setIsSavingPdf(false);
    }
  };

  const renderMetricaRelatorio = (label, value, destaque = false) => (
    <div className={`${destaque ? "bg-black text-white border-black" : "bg-white text-black border-gray-200"} rounded-xl border p-5 shadow-sm`}>
      <p className={`text-[11px] font-black uppercase tracking-widest ${destaque ? "text-red-400" : "text-gray-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black tracking-tight ${destaque ? "text-white" : "text-black"}`}>
        {value}
      </p>
    </div>
  );

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
    return <TeamAvatar time={time} />;
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isLoadingRelatorioGeral}
            className="bg-black hover:bg-gray-800 text-white font-bold py-3 px-5 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-wait"
            onClick={handleEmitirRelatorioGeral}
          >
            {isLoadingRelatorioGeral ? "Emitindo..." : "Relatorio Geral"}
          </button>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors"
            onClick={handleNovoTime}
          >
            NOVO TIME
          </button>
        </div>
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

              <button
                type="button"
                disabled={isLoadingRelatorio}
                className="mb-3 w-full bg-white hover:bg-red-50 text-red-700 border-2 border-red-600 font-black py-2.5 rounded-lg transition-colors text-xs uppercase tracking-widest disabled:opacity-60 disabled:cursor-wait"
                onClick={() => handleEmitirRelatorio(time)}
              >
                {isLoadingRelatorio ? "Emitindo..." : "Emitir Relatorio"}
              </button>

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

      {isRelatorioGeralOpen && relatorioGeral && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-black">
            <div className="bg-black px-7 py-5 border-b-4 border-red-600 flex justify-between items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                  VolleyStats
                </p>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                  Relatorio Geral de Times
                </h2>
                <p className="text-sm font-semibold text-gray-300">
                  Ranking de vitorias, derrotas e pontuacao de cada jogo
                </p>
              </div>

              <button
                type="button"
                onClick={handleFecharRelatorioGeral}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-3xl font-light p-2"
              >
                ×
              </button>
            </div>

            <div className="p-7 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderMetricaRelatorio("Quem ganhou mais", relatorioGeral.rankingVitorias[0]?.nome || "Sem dados", true)}
                {renderMetricaRelatorio("Vitorias do lider", relatorioGeral.rankingVitorias[0]?.vitorias || 0)}
                {renderMetricaRelatorio("Quem perdeu mais", relatorioGeral.rankingDerrotas[0]?.nome || "Sem dados", true)}
                {renderMetricaRelatorio("Derrotas", relatorioGeral.rankingDerrotas[0]?.derrotas || 0)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderMetricaRelatorio("Total de times", relatorioGeral.resumo.totalTimes)}
                {renderMetricaRelatorio("Total de jogos", relatorioGeral.resumo.totalJogos)}
                {renderMetricaRelatorio("Jogos finalizados", relatorioGeral.resumo.jogosFinalizados)}
                {renderMetricaRelatorio("Jogos agendados", relatorioGeral.resumo.jogosAgendados)}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-red-600 px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                      Ranking por Vitorias
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] bg-white">
                      <thead>
                        <tr className="bg-black text-white">
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Time</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">V</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">D</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Taxa</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorioGeral.rankingVitorias.map((time, index) => (
                          <tr key={time.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                            <td className="px-4 py-3 text-center text-sm font-black text-red-600">{index + 1}</td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-black text-black">{time.nome}</p>
                              <p className="text-xs font-semibold text-gray-500">{time.cidade || "Cidade nao informada"}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-black">{time.vitorias}</td>
                            <td className="px-4 py-3 text-center font-black">{time.derrotas}</td>
                            <td className="px-4 py-3 text-center font-black">{time.taxaVitoria}%</td>
                            <td className="px-4 py-3 text-center font-black">{time.saldoSets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-black px-6 py-4">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                      Quem Perdeu Mais
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] bg-white">
                      <thead>
                        <tr className="bg-red-600 text-white">
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">#</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest">Time</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Derrotas</th>
                          <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Vitorias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relatorioGeral.rankingDerrotas.map((time, index) => (
                          <tr key={time.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                            <td className="px-4 py-3 text-center text-sm font-black text-red-600">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-black text-black">{time.nome}</td>
                            <td className="px-4 py-3 text-center font-black">{time.derrotas}</td>
                            <td className="px-4 py-3 text-center font-black">{time.vitorias}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Pontuacao de cada jogo
                  </h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-100">
                    {relatorioGeral.jogos.length} jogos
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Data</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Jogo</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Torneio</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Local</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Placar</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Vencedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioGeral.jogos.map((jogo) => (
                        <tr key={jogo.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-bold text-gray-700">{formatarDataBrasil(jogo.dataPartida)}</td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-black">{jogo.time1Nome} x {jogo.time2Nome}</p>
                            <p className="text-xs font-semibold text-gray-500">{jogo.nome || "Partida"}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-600">{jogo.torneioNome}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-600">{jogo.ginasioNome}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-black text-black">
                              {jogo.placar}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-sm font-black text-black">{jogo.vencedor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={handleFecharRelatorioGeral}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarRelatorioGeralPdf}
                  disabled={isSavingPdf}
                  className="px-6 py-3 font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors uppercase tracking-wider text-sm disabled:opacity-60 disabled:cursor-wait"
                >
                  {isSavingPdf ? "Salvando..." : "Salvar como PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRelatorioOpen && relatorioTime && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2100] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl border-4 border-black">
            <div className="bg-black px-7 py-5 border-b-4 border-red-600 flex justify-between items-center gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {renderImagemTime(relatorioTime.time)}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">
                    Relatorio do Time
                  </p>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase truncate">
                    {relatorioTime.time.nome}
                  </h2>
                  <p className="text-sm font-semibold text-gray-300">
                    {relatorioTime.time.cidade || "Cidade nao informada"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFecharRelatorio}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors text-3xl font-light p-2"
              >
                ×
              </button>
            </div>

            <div className="p-7 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderMetricaRelatorio("Taxa de vitoria", `${relatorioTime.resumo.taxaVitoria}%`, true)}
                {renderMetricaRelatorio("Vitorias", relatorioTime.resumo.vitorias)}
                {renderMetricaRelatorio("Derrotas", relatorioTime.resumo.derrotas)}
                {renderMetricaRelatorio("Jogos finalizados", relatorioTime.resumo.finalizadas)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {renderMetricaRelatorio("Total de jogos", relatorioTime.resumo.totalPartidas)}
                {renderMetricaRelatorio("Agendadas", relatorioTime.resumo.agendadas)}
                {renderMetricaRelatorio("Empates", relatorioTime.resumo.empates)}
                {renderMetricaRelatorio("Sets ganhos", relatorioTime.resumo.setsGanhos)}
                {renderMetricaRelatorio("Saldo de sets", relatorioTime.resumo.saldoSets)}
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Historico de Partidas
                  </h3>
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-100">
                    {relatorioTime.historico.length} registros
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] bg-white">
                    <thead>
                      <tr className="bg-black text-white">
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Data</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Partida</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Adversario</th>
                        <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Torneio</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Placar</th>
                        <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioTime.historico.length > 0 ? (
                        relatorioTime.historico.map((partida) => (
                          <tr key={partida.id} className="border-b border-gray-100 hover:bg-red-50/50 transition-colors">
                            <td className="px-5 py-4 text-sm font-bold text-gray-700">
                              {formatarDataBrasil(partida.dataPartida)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-black text-black">{partida.nome || "Partida"}</p>
                              <p className="text-xs font-semibold text-gray-500">{partida.ginasioNome}</p>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-gray-700">
                              {partida.adversario}
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-gray-500">
                              {partida.torneioNome}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-sm font-black text-black">
                                {partida.status === "FINALIZADA" ? `${partida.pontosPro} x ${partida.pontosContra}` : "--"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                                  partida.resultado === "Vitoria"
                                    ? "bg-red-600 text-white"
                                    : partida.resultado === "Derrota"
                                      ? "bg-black text-white"
                                      : "bg-gray-200 text-gray-700"
                                }`}
                              >
                                {partida.resultado}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-5 py-10 text-center text-sm font-bold text-gray-500">
                            Este time ainda nao possui partidas cadastradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                <button
                  type="button"
                  onClick={handleFecharRelatorio}
                  className="px-6 py-3 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarRelatorioPdf}
                  disabled={isSavingPdf}
                  className="px-6 py-3 font-black text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition-colors uppercase tracking-wider text-sm"
                >
                  {isSavingPdf ? "Salvando..." : "Salvar como PDF"}
                </button>
              </div>
            </div>
          </div>
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
