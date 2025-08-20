document.addEventListener('DOMContentLoaded', function () {
    // URL da API (garanta que está correta)
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // Registra o plugin de labels para todos os gráficos
    Chart.register(ChartDataLabels);

    // --- LÓGICA DE NAVEGAÇÃO DAS ABAS ---
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            const target = document.getElementById(tab.dataset.tab);
            tabContents.forEach(content => content.classList.remove('active'));
            if (target) target.classList.add('active');

            // Carrega o gráfico correspondente ao clicar na aba
            if (tab.dataset.tab === 'progresso-ops') {
                carregarGraficoProgresso();
            } else if (tab.dataset.tab === 'planejado-realizado') {
                carregarGraficoPlanejadoRealizado();
            }
        });
    });

    // --- LÓGICA DO GRÁFICO 1: PROGRESSO DAS OPS ---
    const ctxProgresso = document.getElementById('grafico-progresso-ops');
    let graficoProgresso = null; // Guarda a instância do gráfico para evitar duplicação

    async function carregarGraficoProgresso() {
        if (!ctxProgresso) return;
        if (graficoProgresso) graficoProgresso.destroy(); // Destrói o gráfico antigo antes de desenhar um novo

        try {
            const url = `${urlApi}?action=getDadosGrafico&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar dados para o gráfico de progresso.');
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            if (dados.length === 0) {
                ctxProgresso.getContext('2d').fillText("Nenhuma OP 'Em Andamento' para exibir.", 10, 50);
                return;
            }

            const labels = dados.map(item => `OP: ${item.op}`);
            const valoresProgresso = dados.map(item => item.progresso);

            graficoProgresso = new Chart(ctxProgresso, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '% de Conclusão',
                        data: valoresProgresso,
                        backgroundColor: 'rgba(0, 123, 255, 0.8)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Progresso por Ordem de Produção', font: { size: 18 } },
                        datalabels: {
                            color: '#ffffff',
                            anchor: 'center',
                            align: 'center',
                            font: { weight: 'bold', size: 14 },
                            formatter: (value) => value + '%'
                        }
                    },
                    scales: {
                        x: { max: 100, grid: { display: false }, ticks: { display: false } },
                        y: { grid: { display: false }, ticks: { font: { size: 14 } } }
                    }
                }
            });
        } catch (erro) {
            console.error("Erro ao carregar o gráfico de progresso:", erro);
        }
    }

    // --- LÓGICA DO GRÁFICO 2: PLANEJADO VS. REALIZADO ---
    const ctxPlanejadoRealizado = document.getElementById('grafico-planejado-realizado');
    let graficoPlanejadoRealizado = null; // Guarda a instância do gráfico

    async function carregarGraficoPlanejadoRealizado() {
        if (!ctxPlanejadoRealizado) return;
        if (graficoPlanejadoRealizado) graficoPlanejadoRealizado.destroy();

        try {
            const url = `${urlApi}?action=getDadosPlanejadoRealizado&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar dados para o gráfico comparativo.');
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            // MUDANÇA 2: Novo formato dos labels para incluir o número da OP
            const labels = dados.map(item => `${item.operacao} (OP ${item.op})`);
            const temposPlanejados = dados.map(item => item.tempoPlanejado);
            const temposReais = dados.map(item => item.tempoReal);

            graficoPlanejadoRealizado = new Chart(ctxPlanejadoRealizado, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tempo Planejado (min)',
                        data: temposPlanejados,
                        backgroundColor: 'rgba(0, 123, 255, 0.7)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }, {
                        label: 'Tempo Real (min)',
                        data: temposReais,
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    // MUDANÇA 1: Gráfico na horizontal
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Tempo Planejado vs. Tempo Real por Operação (em minutos)', font: { size: 18 } },
                        legend: { position: 'top' }
                    },
                    scales: {
                        x: { // Agora o eixo X é o de valores (tempo)
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Minutos'
                            }
                        }
                    }
                }
            });

        } catch (erro) {
            console.error("Erro ao carregar o gráfico Planejado vs. Realizado:", erro);
        }
    }

    // Inicia o carregamento do primeiro gráfico ao carregar a página
    carregarGraficoProgresso();
});