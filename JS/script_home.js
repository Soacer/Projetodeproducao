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

    /**
 * Carrega e exibe as próximas manutenções pendentes.
 */
    async function carregarProximasManutencoes() {
        const listaEl = document.getElementById('lista-proximas-manutencoes');
        if (!listaEl) return;
        try {
            // Ação nova que criaremos no backend
            const url = `${urlApi}?action=getProximasManutencoes&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            listaEl.innerHTML = '';
            if (dados.length === 0) {
                listaEl.innerHTML = '<li>Nenhuma manutenção pendente encontrada.</li>';
                return;
            }

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            dados.forEach(item => {
                const li = document.createElement('li');

                const dataManutencao = new Date(item.proxima_execucao);
                const dataFormatada = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(dataManutencao);

                let classeData = 'futuro';
                if (dataManutencao.getTime() < hoje.getTime()) {
                    classeData = 'vencido';
                } else if (dataManutencao.getTime() === hoje.getTime()) {
                    classeData = 'hoje';
                }

                // =============================================
                // ======= INÍCIO DA CORREÇÃO =======
                // =============================================
                let primeiraTarefa = 'Nenhuma tarefa especificada'; // Valor padrão
                // Verifica se 'item.tarefas' existe e é uma string antes de processar
                if (item.tarefas && typeof item.tarefas === 'string') {
                    // Divide as tarefas pelo hífen e encontra a primeira que não seja vazia
                    const primeiraTarefaValida = item.tarefas.split('-').find(tarefa => tarefa.trim() !== '');
                    if (primeiraTarefaValida) {
                        primeiraTarefa = primeiraTarefaValida.trim();
                    }
                }
                // =============================================
                // ======= FIM DA CORREÇÃO =======
                // =============================================

                li.innerHTML = `
                <div class="item-info">
                    <span class="item-nome">${item.item}</span>
                    <small>${primeiraTarefa}</small> </div>
                <span class="item-data ${classeData}">${dataFormatada}</span>
            `;
                listaEl.appendChild(li);
            });

        } catch (erro) {
            console.error("Erro ao carregar próximas manutenções:", erro);
            listaEl.innerHTML = '<li>Erro ao carregar dados.</li>';
        }
    }

    // Chama todas as funções de carregamento do dashboard
    carregarEstatisticas();
    carregarGargalos();
    carregarTempoMedio();
    carregarProximasManutencoes()
});