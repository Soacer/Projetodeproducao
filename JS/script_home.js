document.addEventListener('DOMContentLoaded', function () {
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // Seleciona os elementos para os KPIs
    const opsAndamentoEl = document.getElementById('ops-em-andamento');
    const opsConcluidasEl = document.getElementById('ops-concluidas');
    const operacoesPendentesEl = document.getElementById('operacoes-pendentes');

    /**
     * Carrega os 3 cartões de KPI (Indicadores).
     */
    async function carregarEstatisticas() {
        try {
            // Ação correta para as estatísticas dos KPIs
            const url = `${urlApi}?action=getDashboardStats&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar estatísticas.');

            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            opsAndamentoEl.textContent = dados.opsEmAndamento;
            opsConcluidasEl.textContent = dados.opsConcluidas;
            operacoesPendentesEl.textContent = dados.operacoesPendentes;

        } catch (erro) {
            console.error("Erro ao carregar estatísticas:", erro);
            [opsAndamentoEl, opsConcluidasEl, operacoesPendentesEl].forEach(el => {
                if (el) el.textContent = 'Erro';
            });
        }
    }

    /**
     * Carrega e desenha o gráfico de gargalos.
     */
    async function carregarGargalos() {
        try {
            // CORREÇÃO AQUI: Adicionado o parâmetro 'action'
            const url = `${urlApi}?action=getGargalosPorSetor&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            const ctx = document.getElementById('grafico-gargalos');
            if (!ctx) return;

            const labels = dados.map(item => item.setor);
            const valores = dados.map(item => item.pendentes);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Operações Pendentes',
                        data: valores,
                        backgroundColor: 'rgba(255, 159, 64, 0.7)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            });

        } catch (erro) { console.error("Erro ao carregar gargalos:", erro); }
    }

    /**
     * Carrega e exibe a lista de tempo médio de conclusão.
     */
    async function carregarTempoMedio() {
        const listaEl = document.getElementById('lista-tempo-medio');
        if (!listaEl) return;
        try {
            // CORREÇÃO AQUI: Adicionado o parâmetro 'action'
            const url = `${urlApi}?action=getTempoMedioPorProduto&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            listaEl.innerHTML = '';
            if (dados.length === 0) {
                listaEl.innerHTML = '<li>Nenhum dado de OPs concluídas ainda.</li>';
                return;
            }

            dados.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="produto">${item.produto}</span><span class="tempo">${item.tempoMedio} dias</span>`;
                listaEl.appendChild(li);
            });

        } catch (erro) { console.error("Erro ao carregar tempo médio:", erro); }
    }

    // Chama todas as funções de carregamento do dashboard
    carregarEstatisticas();
    carregarGargalos();
    carregarTempoMedio();
});