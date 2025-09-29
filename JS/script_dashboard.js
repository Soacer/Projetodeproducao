document.addEventListener('DOMContentLoaded', function () {
    // URL da sua API do Google Apps Script
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // --- LÓGICA DE NAVEGAÇÃO POR ABAS ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            const tabId = link.dataset.tab;
            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            if (tabId === 'progresso-ops' && !window.progressoOpsChart) {
                carregarGraficoProgresso();
            } else if (tabId === 'planejado-realizado' && !window.planejadoRealizadoChart) {
                carregarGraficoPlanejadoRealizado();
            } else if (tabId === 'gantt-concluidas' && !window.ganttChart) {
                carregarGraficoGantt();
            }
        });
    });

    // --- GRÁFICO 1: PROGRESSO DAS OPS (Usa Chart.js) ---
    async function carregarGraficoProgresso() {
        const ctx = document.getElementById('grafico-progresso-ops').getContext('2d');
        const container = ctx.canvas.parentElement;
        container.innerHTML = '<div class="carregando">Carregando dados...</div>';
        
        try {
            const response = await fetch(`${urlApi}?action=getDadosGrafico`);
            const data = await response.json();
            if (data.erro) throw new Error(data.mensagem);

            if (!data || data.length === 0) {
                container.innerHTML = `<div class="aviso">Nenhuma Ordem de Produção "Em Andamento" foi encontrada.</div>`;
                return;
            }

            container.innerHTML = '';
            container.appendChild(ctx.canvas);

            window.progressoOpsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(item => item.op),
                    datasets: [{
                        label: 'Progresso (%)',
                        data: data.map(item => item.progresso),
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Progresso das Ordens de Produção' } },
                    scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '% Concluído' } } }
                }
            });
        } catch (error) {
            container.innerHTML = `<div class="erro">Erro ao carregar gráfico: ${error.message}</div>`;
        }
    }

    // --- GRÁFICO 2: PLANEJADO VS REALIZADO (Usa Chart.js) ---
    async function carregarGraficoPlanejadoRealizado() {
        const ctx = document.getElementById('grafico-planejado-realizado').getContext('2d');
        const container = ctx.canvas.parentElement;
        container.innerHTML = '<div class="carregando">Carregando dados...</div>';
        
        try {
            const response = await fetch(`${urlApi}?action=getDadosPlanejadoRealizado`);
            const data = await response.json();
            if (data.erro) throw new Error(data.mensagem);

            container.innerHTML = '';
            container.appendChild(ctx.canvas);

            window.planejadoRealizadoChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => `${d.operacao} (OP: ${d.op})`),
                    datasets: [
                        { label: 'Tempo Planejado (min)', data: data.map(d => d.tempoPlanejado), backgroundColor: 'rgba(255, 159, 64, 0.6)' },
                        { label: 'Tempo Real (min)', data: data.map(d => d.tempoReal), backgroundColor: 'rgba(75, 192, 192, 0.6)' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { title: { display: true, text: 'Tempo Planejado vs. Tempo Real por Operação' } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutos' } } }
                }
            });
        } catch (error) {
            container.innerHTML = `<div class="erro">Erro ao carregar gráfico: ${error.message}</div>`;
        }
    }

    // --- GRÁFICO 3: GANTT DE ATIVIDADES CONCLUÍDAS (Usa ApexCharts) ---
    let ganttData = [];
    let tipoAgrupamentoGantt = 'op_numero';

    async function carregarGraficoGantt() {
        const container = document.getElementById('grafico-gantt-concluidas');
        container.innerHTML = `<div class="carregando">Carregando dados do Gantt...</div>`;
        try {
            const response = await fetch(`${urlApi}?action=getDadosGanttConcluidas&cacheBust=${new Date().getTime()}`);
            const data = await response.json();
            if (data.erro) throw new Error(data.mensagem);
            ganttData = data;
            renderizarGantt();
        } catch (error) {
            container.innerHTML = `<div class="erro">Erro ao carregar Gantt: ${error.message}</div>`;
        }
    }

    function renderizarGantt() {
        const container = document.getElementById('grafico-gantt-concluidas');
        if (ganttData.length === 0) {
            container.innerHTML = '<div class="aviso">Nenhuma atividade concluída encontrada para exibir.</div>';
            return;
        }

        const groupedByOperation = ganttData.reduce((acc, item) => {
            const opName = item.operacao;
            if (!acc[opName]) acc[opName] = [];
            acc[opName].push(item);
            return acc;
        }, {});
        
        const series = [];
        const colorCache = {};
        let colorIndex = 0;
        const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];
        const getKeyColor = (key) => {
            if (!colorCache[key]) {
                colorCache[key] = colors[colorIndex % colors.length];
                colorIndex++;
            }
            return colorCache[key];
        };
        
        for (const opName in groupedByOperation) {
            const tasks = groupedByOperation[opName].map(task => {
                const groupKey = task[tipoAgrupamentoGantt] || 'N/D';
                return {
                    x: groupKey,
                    y: new Date(task.data_inicio).getTime(),
                    fillColor: getKeyColor(groupKey),
                    endDate: new Date(task.data_fim).getTime()
                };
            });
            series.push({ name: opName, data: tasks });
        }
        
        const options = {
            series: series,
            chart: { height: 800, type: 'rangeBar', toolbar: { show: true } },
            plotOptions: { bar: { horizontal: true, distributed: true, dataLabels: { hideOverflowingLabels: false } } },
            dataLabels: {
                enabled: true,
                formatter: (val, opts) => opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].x,
                style: { colors: ['#f8f8f8', '#fff'], fontWeight: 'bold' },
                textAnchor: 'middle'
            },
            xaxis: { type: 'datetime', labels: { datetimeUTC: false, format: 'dd MMM' } },
            yaxis: { show: true, labels: { maxWidth: 200 } },
            grid: { row: { colors: ['#f3f4f5', '#fff'], opacity: 1 } },
            tooltip: { x: { format: 'dd MMM yyyy HH:mm' } },
            legend: { show: false }
        };

        container.innerHTML = '';
        if (!window.ganttChart) {
            window.ganttChart = new ApexCharts(container, options);
            window.ganttChart.render();
        } else {
            window.ganttChart.updateOptions(options);
        }
    }

    document.querySelectorAll('#gantt-concluidas .btn-agrupar').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('#gantt-concluidas .btn-agrupar').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tipoAgrupamentoGantt = button.dataset.groupBy;
            renderizarGantt();
        });
    });

    carregarGraficoProgresso();
});