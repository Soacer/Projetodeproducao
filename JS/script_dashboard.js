document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('grafico-progresso-ops');
    if (!ctx) return;

    // <<< COLOQUE AQUI A URL ATUALIZADA DO SEU APP DA WEB >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    /**
     * Busca os dados de progresso e desenha o gráfico.
     */
    async function carregarGrafico() {
        try {
            const url = `${urlApi}?action=getDadosGrafico&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar dados para o gráfico.');
            
            const dados = await resposta.json();
            if(dados.erro) throw new Error(dados.mensagem);

            if (dados.length === 0) {
                ctx.getContext('2d').font = "16px Arial";
                ctx.getContext('2d').fillText("Nenhuma OP 'Em Andamento' para exibir.", 10, 50);
                return;
            }

            const labels = dados.map(item => `OP: ${item.op}`);
            const valoresProgresso = dados.map(item => item.progresso);

            // Registra o plugin globalmente para este gráfico
            Chart.register(ChartDataLabels);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '% de Conclusão',
                        data: valoresProgresso,
                        backgroundColor: 'rgba(0, 123, 255, 0.8)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1,
                        borderRadius: 4, // Deixa as bordas das barras arredondadas
                    }]
                },
                options: {
                    // =============================================
                    // ===== MUDANÇAS PARA O NOVO VISUAL AQUI =====
                    // =============================================
                    indexAxis: 'y', // Mantém o gráfico na horizontal
                    responsive: true,
                    maintainAspectRatio: false, // Permite controlar melhor a altura

                    // Configurações dos Plugins
                    plugins: {
                        legend: {
                            display: false // Remove a legenda de "% de Conclusão"
                        },
                        title: {
                            display: true,
                            text: 'Progresso por Ordem de Produção',
                            font: { size: 18 }
                        },
                        // Configuração do novo plugin de rótulos
                        datalabels: {
                            color: '#ffffff', // Cor do texto dentro da barra
                            anchor: 'center',  // Posição do rótulo na barra (start, center, end)
                            align: 'center',   // Alinhamento do rótulo
                            font: {
                                weight: 'bold',
                                size: 14
                            },
                            // Formata o número para exibir com o símbolo de "%"
                            formatter: function(value, context) {
                                return value + '%';
                            }
                        }
                    },
                    
                    // Configuração dos Eixos
                    scales: {
                        // Eixo X (Percentual)
                        x: {
                            max: 100, // Garante que a escala vá sempre até 100
                            grid: {
                                display: false, // <<< REMOVE AS GRADES VERTICAIS
                                drawBorder: false // Remove a linha do próprio eixo
                            },
                            ticks: {
                                display: false // Remove os rótulos de 0%, 10%, etc.
                            }
                        },
                        // Eixo Y (OPs)
                        y: {
                            grid: {
                                display: false, // <<< REMOVE AS GRADES HORIZONTAIS
                                drawBorder: false
                            },
                            ticks: {
                                font: {
                                    size: 14 // Aumenta o tamanho da fonte dos nomes das OPs
                                }
                            }
                        }
                    }
                }
            });

        } catch (erro) {
            console.error("Erro ao carregar o gráfico:", erro);
            ctx.getContext('2d').font = "16px Arial";
            ctx.getContext('2d').fillStyle = "red";
            ctx.getContext('2d').fillText(`Erro ao carregar gráfico: ${erro.message}`, 10, 50);
        }
    }

    // Inicia o carregamento do gráfico
    carregarGrafico();
});