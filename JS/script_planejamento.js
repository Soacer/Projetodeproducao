document.addEventListener('DOMContentLoaded', function () {
    google.charts.load('current', { 'packages': ['gantt', 'timeline'], 'language': 'pt-BR' });

    // --- ELEMENTOS GERAIS ---
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- ESTADO GLOBAL (Dados em memória) ---
    let todosOsPlanosSalvos = [];
    let ultimoPlanejamento = [];
    let ultimosPlanosSelecionados = [];
    let modoDeVisualizacao = 'operacao'; // 'operacao' ou 'responsavel'
    let modoDeRotulo = 'op'; // 'op' ou 'produto'

    // --- ELEMENTOS DA ABA 1: CRIAR E EDITAR PLANO ---
    const formCriar = document.getElementById('form-planejamento');
    const selectOp = document.getElementById('select-op');
    const inputDataHora = document.getElementById('data-hora-inicio');
    const resultadoCriar = document.getElementById('resultado-planejamento');
    const btnSalvarPlano = document.getElementById('btn-salvar-planejamento');
    const ganttChartDivCriar = document.getElementById('gantt-chart');

    // --- ELEMENTOS DA ABA 2: VISUALIZAR E COMPARAR ---
    const acordeonContainer = document.getElementById('acordeon-planos');
    const filtrosStatus = document.querySelectorAll('input[name="filtro-status"]');
    const btnComparar = document.getElementById('btn-comparar-planos');
    const resultadoComparacao = document.getElementById('resultado-comparacao');
    const ganttChartDivComparativo = document.getElementById('gantt-chart-comparativo');
    const btnViewOperacao = document.getElementById('btn-view-operacao');
    const btnViewResponsavel = document.getElementById('btn-view-responsavel');
    const btnRotuloOp = document.getElementById('btn-rotulo-op');
    const btnRotuloProduto = document.getElementById('btn-rotulo-produto');

    async function carregarOpsParaSelecao() {
        if (!selectOp) return;
        selectOp.innerHTML = '<option value="">Carregando OPs...</option>';
        try {
            const url = `${urlApi}?action=getOpsParaPlanejamento&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar lista de OPs.');
            const listaOps = await resposta.json();
            if (listaOps.erro) throw new Error(listaOps.mensagem);
            selectOp.innerHTML = '<option value="" disabled selected>Selecione uma OP para Planejar</option>';
            listaOps.forEach(op => {
                const option = document.createElement('option');
                option.value = JSON.stringify({ id: op.id, op: op.op, produto: op.produto, sequencia: op.sequencia, roteiro: op.roteiro, revisao: op.revisao });
                option.textContent = `OP: ${op.op} (${op.produto})`;
                selectOp.appendChild(option);
            });
        } catch (erro) {
            selectOp.innerHTML = `<option value="">Erro: ${erro.message}</option>`;
        }
    }

    async function handlePlanejamento(event) {
        event.preventDefault();
        const btnPlanejar = formCriar.querySelector('button[type="submit"]');
        btnPlanejar.disabled = true;
        btnPlanejar.textContent = 'Planejando...';
        resultadoCriar.classList.add('hidden');
        try {
            const dadosOpString = selectOp.value;
            const dataHoraInicio = inputDataHora.value;
            if (!dadosOpString || !dataHoraInicio) throw new Error("Selecione uma OP e uma data/hora de início.");
            const dadosOp = JSON.parse(dadosOpString);
            const url = `${urlApi}?action=calcularLinhaDoTempo&id_op=${dadosOp.id}&dataHoraInicio=${dataHoraInicio}`;
            const resposta = await fetch(url);
            const planejamento = await resposta.json();
            if (planejamento.erro) throw new Error(planejamento.mensagem);
            ultimoPlanejamento = planejamento.map(tarefa => ({ ...tarefa, op: dadosOp.op, produto: dadosOp.produto }));
            resultadoCriar.classList.remove('hidden');
            google.charts.setOnLoadCallback(() => desenharGraficoGantt(ultimoPlanejamento, ganttChartDivCriar));
        } catch (erro) {
            alert(`Erro ao planejar: ${erro.message}`);
        } finally {
            btnPlanejar.disabled = false;
            btnPlanejar.textContent = 'Planejar';
        }
    }

    async function salvarPlano() {
        if (!ultimoPlanejamento || ultimoPlanejamento.length === 0) {
            alert("Não há nenhum planejamento para salvar.");
            return;
        }
        btnSalvarPlano.disabled = true;
        btnSalvarPlano.textContent = 'Salvando...';
        try {
            const payload = { action: 'salvarPlanejamento', planejamento: ultimoPlanejamento };

            // --- INÍCIO DA MUDANÇA ---
            // Removemos o 'mode: no-cors' e agora processamos a resposta
            const response = await fetch(urlApi, {
                method: 'POST',
                // O Apps Script funciona bem com 'text/plain' para o corpo do post
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json(); // Lemos a resposta do servidor

            // Se o servidor retornou um erro, nós o exibimos
            if (result.erro) {
                throw new Error(result.mensagem);
            }
            // --- FIM DA MUDANÇA ---

            alert('Planejamento salvo com sucesso!');
            document.querySelector('.tab-link[data-tab="visualizar-planos"]').click();
            // Força o recarregamento dos dados para refletir a alteração
            carregarPlanosSalvos();

        } catch (erro) {
            // Agora, qualquer erro (de rede ou do script) será exibido aqui
            alert(`Erro ao salvar o planejamento: ${erro.message}`);
        } finally {
            btnSalvarPlano.disabled = false;
            btnSalvarPlano.textContent = 'Salvar Planejamento';
        }
    }

    async function carregarPlanosSalvos() {
        if (!acordeonContainer) return;
        acordeonContainer.innerHTML = `<div class="carregando">Carregando planejamentos...</div>`;
        try {
            const url = `${urlApi}?action=getTodosOsPlanejamentos&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar planejamentos.');
            todosOsPlanosSalvos = await resposta.json();
            if (todosOsPlanosSalvos.erro) throw new Error(todosOsPlanosSalvos.mensagem);
            filtrarPlanos();
            carregarOpsParaComparacao();
        } catch (erro) {
            acordeonContainer.innerHTML = `<div class="erro">Erro: ${erro.message}</div>`;
        }
    }

    function renderizarPlanos(planosParaExibir) {
        acordeonContainer.innerHTML = '';
        if (planosParaExibir.length === 0) {
            acordeonContainer.innerHTML = '<div class="aviso">Nenhum planejamento encontrado para este filtro.</div>';
            return;
        }
        planosParaExibir.forEach(plano => {
            const opItem = document.createElement('div');
            opItem.className = 'op-item';
            opItem.innerHTML = `
                <div class="op-item-header">
                    <button class="op-collapse-btn">
                        <div class="op-info-group">
                            <span class="op-info">OP: ${plano.op}</span>
                            <span class="op-produto">${plano.produto}</span>
                        </div>
                        <span class="status" data-status="${plano.status}">${plano.status}</span>
                    </button>
                    <div class="op-actions">
                        <button class="btn-editar-plano" title="Editar este planejamento">
                            <i class="fas fa-pen-to-square"></i> Editar
                        </button>
                    </div>
                </div>
                <div class="op-collapse-content">
                    <div class="gantt-container-visualizacao" id="gantt-chart-${plano.op}"></div>
                </div>
            `;
            opItem.querySelector('.op-collapse-btn').addEventListener('click', (e) => toggleGantt(e, plano));
            opItem.querySelector('.btn-editar-plano').addEventListener('click', () => iniciarEdicaoPlano(plano));
            acordeonContainer.appendChild(opItem);
        });
    }

    function iniciarEdicaoPlano(plano) {
        if (!plano.planejamento || plano.planejamento.length === 0) {
            alert("Este planejamento não contém tarefas e não pode ser editado.");
            return;
        }
        const dataInicioISO = plano.planejamento[0].inicio;
        const dataInicioFormatada = new Date(dataInicioISO).toISOString().slice(0, 16);
        inputDataHora.value = dataInicioFormatada;
        let opEncontrada = false;
        for (let option of selectOp.options) {
            if (option.value) {
                const optionData = JSON.parse(option.value);
                if (optionData.id === plano.id) {
                    option.selected = true;
                    opEncontrada = true;
                    break;
                }
            }
        }
        if (!opEncontrada) {
            alert(`A Ordem de Produção "${plano.op}" está salva, mas não foi encontrada na lista de OPs "Em Andamento". Ela pode ter sido concluída.`);
            return;
        }
        document.querySelector('.tab-link[data-tab="criar-plano"]').click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function toggleGantt(event, plano) {
        const button = event.currentTarget;
        const header = button.parentElement;
        const contentDiv = header.nextElementSibling;
        header.classList.toggle('active');
        if (contentDiv.style.maxHeight) {
            contentDiv.style.maxHeight = null;
        } else {
            if (!contentDiv.dataset.desenhado) {
                const chartContainer = contentDiv.querySelector('.gantt-container-visualizacao');
                google.charts.setOnLoadCallback(() => desenharGraficoGantt(plano.planejamento, chartContainer));
                contentDiv.dataset.desenhado = 'true';
            }
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
        }
    }

    function filtrarPlanos() {
        const status = document.querySelector('input[name="filtro-status"]:checked').value;
        if (status === 'todos') {
            renderizarPlanos(todosOsPlanosSalvos);
        } else {
            const planosFiltrados = todosOsPlanosSalvos.filter(p => p.status === status);
            renderizarPlanos(planosFiltrados);
        }
    }

    function carregarOpsParaComparacao() {
        const selectOpsComp = document.getElementById('select-ops-comparacao');
        if (!selectOpsComp) return;
        selectOpsComp.innerHTML = '';
        todosOsPlanosSalvos.forEach(plano => {
            const option = document.createElement('option');
            option.value = plano.op;
            option.textContent = `OP: ${plano.op} (${plano.produto})`;
            selectOpsComp.appendChild(option);
        });
    }

    function handleComparacao() {
        const selectOpsComp = document.getElementById('select-ops-comparacao');
        const opsSelecionadas = [...selectOpsComp.selectedOptions].map(opt => opt.value);
        if (opsSelecionadas.length < 2) {
            alert("Por favor, selecione pelo menos duas OPs para comparar.");
            return;
        }
        ultimosPlanosSelecionados = todosOsPlanosSalvos.filter(p => opsSelecionadas.includes(p.op));
        if (ultimosPlanosSelecionados.length !== opsSelecionadas.length) {
            alert("Não foi possível encontrar os dados de uma ou mais OPs selecionadas.");
            return;
        }
        resultadoComparacao.classList.remove('hidden');
        google.charts.setOnLoadCallback(() => desenharTimelineComparativa(ultimosPlanosSelecionados, ganttChartDivComparativo));
    }

    function desenharGraficoGantt(planejamento, container) {
        if (!planejamento || planejamento.length === 0) {
            container.innerHTML = '<div class="aviso">Não há dados para exibir o gráfico.</div>';
            return;
        }
        const data = new google.visualization.DataTable();
        data.addColumn('string', 'ID da Tarefa');
        data.addColumn('string', 'Nome da Tarefa');
        data.addColumn('string', 'Recurso');
        data.addColumn('date', 'Data de Início');
        data.addColumn('date', 'Data de Término');
        data.addColumn('number', 'Duração');
        data.addColumn('number', '% Concluído');
        data.addColumn('string', 'Dependências');
        const rows = planejamento.map(tarefa => [
            tarefa.id_tarefa,
            tarefa.nome_tarefa,
            null,
            new Date(tarefa.inicio),
            new Date(tarefa.fim),
            null,
            tarefa.percentual_concluido || 0,
            tarefa.dependencias || null
        ]);
        data.addRows(rows);
        const alturaGrafico = rows.length * 41 + 50;
        const options = { height: alturaGrafico, gantt: { trackHeight: 30 } };
        const chart = new google.visualization.Gantt(container);
        chart.draw(data, options);
    }

    function desenharTimelineComparativa(listaDePlanos, container) {
        const coresPaleta = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e"];
        const data = new google.visualization.DataTable();
        data.addColumn({ type: 'string', id: 'Agrupador' });
        data.addColumn({ type: 'string', id: 'Rótulo da Barra' });
        data.addColumn({ type: 'string', role: 'tooltip', 'p': { 'html': true } });
        data.addColumn({ type: 'date', id: 'Início' });
        data.addColumn({ type: 'date', id: 'Fim' });
        let todasAsRows = [];
        let labelsUnicas = new Set();
        listaDePlanos.forEach(plano => {
            const rowsDoPlano = plano.planejamento.map(tarefa => {
                const tooltipHtml = `<div style="padding:10px; font-family: Arial, sans-serif;">
                    <strong>${tarefa.nome_tarefa} (OP ${plano.op})</strong><br>
                    <strong>Produto:</strong> ${plano.produto}<br>
                    <strong>Responsável:</strong> ${tarefa.responsavel || 'Não definido'}<br>
                    <strong>Início:</strong> ${new Date(tarefa.inicio).toLocaleString()}<br>
                    <strong>Fim:</strong> ${new Date(tarefa.fim).toLocaleString()}
                   </div>`;
                let agrupador, rotuloBarra;
                if (modoDeVisualizacao === 'operacao') {
                    agrupador = tarefa.nome_tarefa;
                    rotuloBarra = modoDeRotulo === 'produto' ? plano.produto : `OP ${plano.op}`;
                } else {
                    agrupador = tarefa.responsavel || 'Não Atribuído';
                    const identificador = modoDeRotulo === 'produto' ? plano.produto : `OP ${plano.op}`;
                    rotuloBarra = `${tarefa.nome_tarefa} (${identificador})`;
                }
                labelsUnicas.add(agrupador);
                return [agrupador, rotuloBarra, tooltipHtml, new Date(tarefa.inicio), new Date(tarefa.fim)];
            });
            todasAsRows.push(...rowsDoPlano);
        });
        if (todasAsRows.length === 0) {
            container.innerHTML = '<div class="aviso">Não há dados para exibir o gráfico.</div>';
            return;
        }
        data.addRows(todasAsRows);
        const alturaGrafico = labelsUnicas.size * 41 + 60;
        const options = {
            height: alturaGrafico,
            colors: coresPaleta,
            tooltip: { isHtml: true },
            timeline: {
                groupByRowLabel: true,
                rowLabelStyle: { fontName: 'Helvetica', fontSize: 13 },
                barLabelStyle: { fontName: 'Arial', fontSize: 11 }
            }
        };
        const chart = new google.visualization.Timeline(container);
        const legendaContainer = document.getElementById('legenda-comparativo');
        google.visualization.events.addListener(chart, 'ready', function () {
            if (legendaContainer) {
                legendaContainer.innerHTML = '';
                listaDePlanos.forEach((plano, index) => {
                    const cor = coresPaleta[index % coresPaleta.length];
                    const legendaItem = document.createElement('div');
                    legendaItem.className = 'legenda-item';
                    const textoLegenda = modoDeRotulo === 'produto' ? plano.produto : `OP ${plano.op}`;
                    legendaItem.innerHTML = `<span class="legenda-cor" style="background-color: ${cor};"></span> ${textoLegenda}`;
                    legendaContainer.appendChild(legendaItem);
                });
            }
        });
        chart.draw(data, options);
    }

    // --- LÓGICA DE NAVEGAÇÃO E EVENTOS ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            tabContents.forEach(content => content.classList.remove('active'));
            if (target) target.classList.add('active');
        });
    });

    btnViewOperacao.addEventListener('click', () => {
        modoDeVisualizacao = 'operacao';
        btnViewOperacao.classList.add('active');
        btnViewResponsavel.classList.remove('active');
        if (ultimosPlanosSelecionados.length > 0) {
            desenharTimelineComparativa(ultimosPlanosSelecionados, ganttChartDivComparativo);
        }
    });

    btnViewResponsavel.addEventListener('click', () => {
        modoDeVisualizacao = 'responsavel';
        btnViewResponsavel.classList.add('active');
        btnViewOperacao.classList.remove('active');
        if (ultimosPlanosSelecionados.length > 0) {
            desenharTimelineComparativa(ultimosPlanosSelecionados, ganttChartDivComparativo);
        }
    });

    btnRotuloOp.addEventListener('click', () => {
        modoDeRotulo = 'op';
        btnRotuloOp.classList.add('active');
        btnRotuloProduto.classList.remove('active');
        if (ultimosPlanosSelecionados.length > 0) {
            desenharTimelineComparativa(ultimosPlanosSelecionados, ganttChartDivComparativo);
        }
    });

    btnRotuloProduto.addEventListener('click', () => {
        modoDeRotulo = 'produto';
        btnRotuloProduto.classList.add('active');
        btnRotuloOp.classList.remove('active');
        if (ultimosPlanosSelecionados.length > 0) {
            desenharTimelineComparativa(ultimosPlanosSelecionados, ganttChartDivComparativo);
        }
    });

    if (formCriar) formCriar.addEventListener('submit', handlePlanejamento);
    if (btnSalvarPlano) btnSalvarPlano.addEventListener('click', salvarPlano);
    filtrosStatus.forEach(filtro => filtro.addEventListener('change', filtrarPlanos));
    if (btnComparar) btnComparar.addEventListener('click', handleComparacao);

    // --- CARREGAMENTO INICIAL DOS DADOS ---
    carregarOpsParaSelecao();
    carregarPlanosSalvos();

});