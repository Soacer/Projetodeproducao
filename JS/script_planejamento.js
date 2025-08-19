document.addEventListener('DOMContentLoaded', function () {
    google.charts.load('current', { 'packages': ['gantt', 'timeline'] });

    // --- ELEMENTOS GERAIS ---
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- ESTADO GLOBAL (Dados em memória) ---
    let todosOsPlanosSalvos = [];
    let ultimoPlanejamento = [];

    // --- LÓGICA DA ABA 1: CRIAR NOVO PLANEJamento ---
    const formCriar = document.getElementById('form-planejamento');
    const selectOp = document.getElementById('select-op');
    const resultadoCriar = document.getElementById('resultado-planejamento');
    const btnSalvarPlano = document.getElementById('btn-salvar-planejamento');
    const ganttChartDivCriar = document.getElementById('gantt-chart');

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
            console.error("Erro ao carregar OPs para seleção:", erro);
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
            const dataHoraInicio = document.getElementById('data-hora-inicio').value;
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
        if (ultimoPlanejamento.length === 0) {
            alert("Não há nenhum planejamento para salvar.");
            return;
        }
        btnSalvarPlano.disabled = true;
        btnSalvarPlano.textContent = 'Salvando...';
        try {
            const payload = { action: 'salvarPlanejamento', planejamento: ultimoPlanejamento };
            await fetch(urlApi, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert('Planejamento salvo com sucesso!');
            document.querySelector('.tab-link[data-tab="visualizar-planos"]').click();
        } catch (erro) {
            alert(`Erro ao salvar: ${erro.message}`);
        } finally {
            btnSalvarPlano.disabled = false;
            btnSalvarPlano.textContent = 'Salvar Planejamento';
        }
    }

    // --- LÓGICA DA ABA 2: VISUALIZAR E COMPARAR PLANOS SALVOS ---
    const acordeonContainer = document.getElementById('acordeon-planos');
    const filtrosStatus = document.querySelectorAll('input[name="filtro-status"]');
    const selectOp1 = document.getElementById('select-op-1');
    const selectOp2 = document.getElementById('select-op-2');
    const btnComparar = document.getElementById('btn-comparar-planos');
    const resultadoComparacao = document.getElementById('resultado-comparacao');
    const ganttChartDivComparativo = document.getElementById('gantt-chart-comparativo');

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
                <button class="op-collapse-btn">
                    <div class="op-info-group"><span class="op-info">OP: ${plano.op}</span>\n<span class="op-produto">${plano.produto}\n</span></div>
                    <span class="status" data-status="${plano.status}">${plano.status}</span>
                </button>
                <div class="op-collapse-content"><div class="gantt-container-visualizacao" id="gantt-chart-${plano.op}"></div></div>
            `;
            opItem.querySelector('.op-collapse-btn').addEventListener('click', (e) => toggleGantt(e, plano));
            acordeonContainer.appendChild(opItem);
        });
    }

    function toggleGantt(event, plano) {
        const button = event.currentTarget;
        const contentDiv = button.nextElementSibling;
        button.classList.toggle('active');
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
        // Agora temos apenas um seletor múltiplo
        const selectOpsComp = document.getElementById('select-ops-comparacao');
        if (!selectOpsComp) return;

        selectOpsComp.innerHTML = ''; // Limpa opções antigas

        // Popula o seletor com todos os planos salvos
        todosOsPlanosSalvos.forEach(plano => {
            const option = document.createElement('option');
            option.value = plano.op;
            option.textContent = `OP: ${plano.op} (${plano.produto})`;
            selectOpsComp.appendChild(option);
        });
    }

    function handleComparacao() {
        const selectOpsComp = document.getElementById('select-ops-comparacao');

        // Pega todos os valores das opções selecionadas
        const opsSelecionadas = [...selectOpsComp.selectedOptions].map(opt => opt.value);

        if (opsSelecionadas.length < 2) {
            alert("Por favor, selecione pelo menos duas OPs para comparar.");
            return;
        }

        // Filtra a lista de todos os planos para obter apenas os que foram selecionados
        const planosSelecionados = todosOsPlanosSalvos.filter(p => opsSelecionadas.includes(p.op));

        if (planosSelecionados.length !== opsSelecionadas.length) {
            alert("Não foi possível encontrar os dados de uma ou mais OPs selecionadas.");
            return;
        }

        resultadoComparacao.classList.remove('hidden');
        // Passa a lista inteira de planos para a função de desenho
        google.charts.setOnLoadCallback(() => desenharTimelineComparativa(planosSelecionados, ganttChartDivComparativo));
    }


    // --- FUNÇÕES GENÉRICAS DE DESENHAR GRÁFICOS ---
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

    // Substitua a função desenharGraficoGanttComparativo inteira por esta nova função
    function desenharTimelineComparativa(listaDePlanos, container) {
        // A paleta de cores continua sendo usada
        const coresPaleta = [
            "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099",
            "#0099c6", "#dd4477", "#66aa00", "#b82e2e"
        ];

        const data = new google.visualization.DataTable();
        // A estrutura de colunas do Timeline é diferente:
        data.addColumn({ type: 'string', id: 'Operação' });
        data.addColumn({ type: 'string', id: 'OP' });
        data.addColumn({ type: 'date', id: 'Início' });
        data.addColumn({ type: 'date', id: 'Fim' });

        let todasAsRows = [];

        // Itera sobre a lista de planos para criar as linhas
        listaDePlanos.forEach(plano => {
            const rowsDoPlano = plano.planejamento.map(tarefa => [
                tarefa.nome_tarefa,      // Coluna 1: O nome da operação (será a linha do gráfico)
                `OP ${plano.op}`,        // Coluna 2: O rótulo da barra (qual OP ela representa)
                new Date(tarefa.inicio), // Coluna 3: Data de início
                new Date(tarefa.fim)     // Coluna 4: Data de fim
            ]);
            todasAsRows.push(...rowsDoPlano);
        });

        if (todasAsRows.length === 0) {
            container.innerHTML = '<div class="aviso">Não há dados para exibir o gráfico.</div>';
            return;
        }

        data.addRows(todasAsRows);

        // Calcula a altura ideal, considerando um número único de operações
        const numOperacoesUnicas = new Set(todasAsRows.map(row => row[0])).size;
        const alturaGrafico = numOperacoesUnicas * 41 + 60; // 41px por linha + 60px para eixos

        const options = {
            height: alturaGrafico,
            colors: coresPaleta, // O Timeline usa um array simples de cores
            timeline: {
                groupByRowLabel: true, // Agrupa as barras pela primeira coluna (nome da operação)
                rowLabelStyle: { fontName: 'Helvetica', fontSize: 13 },
                barLabelStyle: { fontName: 'Arial', fontSize: 11 }
            }
        };

        // Agora instanciamos um google.visualization.Timeline
        const chart = new google.visualization.Timeline(container);

        // A lógica da legenda continua a mesma
        const legendaContainer = document.getElementById('legenda-comparativo');
        if (legendaContainer) {
            legendaContainer.innerHTML = '';
            listaDePlanos.forEach((plano, index) => {
                const cor = coresPaleta[index % coresPaleta.length];
                const legendaItem = document.createElement('div');
                legendaItem.className = 'legenda-item';
                legendaItem.innerHTML = `
                <span class="legenda-cor" style="background-color: ${cor};"></span>
                OP ${plano.op}
            `;
                legendaContainer.appendChild(legendaItem);
            });
        }

        chart.draw(data, options);
    }

    // ==========================================================
    // CÓDIGO CORRIGIDO - LÓGICA DE NAVEGAÇÃO DAS ABAS
    // ==========================================================
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões de aba
            tabs.forEach(item => item.classList.remove('active'));
            // Adiciona a classe 'active' apenas no botão clicado
            tab.classList.add('active');

            // Pega o alvo (o ID do conteúdo) do atributo data-tab
            const target = document.getElementById(tab.dataset.tab);

            // Esconde todos os conteúdos de aba
            tabContents.forEach(content => content.classList.remove('active'));

            // Mostra apenas o conteúdo da aba alvo, se ele existir
            if (target) {
                target.classList.add('active');
            }

            // Se a aba clicada for a de visualizar, recarrega os planos
            if (tab.dataset.tab === 'visualizar-planos') {
                carregarPlanosSalvos();
            }
        });
    });


    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    if (formCriar) formCriar.addEventListener('submit', handlePlanejamento);
    if (btnSalvarPlano) btnSalvarPlano.addEventListener('click', salvarPlano);
    filtrosStatus.forEach(filtro => filtro.addEventListener('change', filtrarPlanos));
    if (btnComparar) btnComparar.addEventListener('click', handleComparacao);

    // Carrega os dados iniciais ao entrar na página
    carregarOpsParaSelecao();
    carregarPlanosSalvos();
});