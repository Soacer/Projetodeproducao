document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS DO DOM ---
    const resultadoSection = document.getElementById('resultado-caminho-critico');
    const duracaoTotalEl = document.getElementById('duracao-total');
    const ganttContainer = document.getElementById('gantt-container');
    const btnCalcular = document.getElementById('btn-calcular-caminho');
    const selectProduto = document.getElementById('produto');
    const selectSequencia = document.getElementById('sequencia');
    const selectRoteiro = document.getElementById('roteiro');
    const selectRevisao = document.getElementById('revisao');

    // --- CONFIGURAÇÃO ---
    // <<< IMPORTANTE: COLOQUE AQUI A SUA URL DA IMPLANTAÇÃO MAIS RECENTE >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // --- ESTADO DA APLICAÇÃO ---
    let dadosParaSelecao = {};

    // --- LÓGICA DOS MENUS DE SELEÇÃO ---
    async function carregarMenusIniciais() {
        if (!selectProduto) return;
        selectProduto.innerHTML = '<option value="">Carregando...</option>';
        const url = `${urlApi}?action=getValoresFormulario&cacheBust=${new Date().getTime()}`;
        try {
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha de rede ao buscar dados para os menus.');
            dadosParaSelecao = await resposta.json();
            if (dadosParaSelecao.erro) throw new Error(dadosParaSelecao.mensagem);
            const produtos = Object.keys(dadosParaSelecao).sort();
            selectProduto.innerHTML = '<option value="" disabled selected>Selecione um produto</option>';
            produtos.forEach(p => selectProduto.add(new Option(p, p)));
        } catch (erro) {
            console.error("Erro ao carregar menus:", erro);
            selectProduto.innerHTML = `<option value="">Erro: ${erro.message}</option>`;
        }
    }

    function atualizarSequencias() {
        const produto = selectProduto.value;
        selectSequencia.innerHTML = '<option value="" disabled selected>Selecione uma sequência</option>';
        selectSequencia.disabled = true;
        selectRoteiro.innerHTML = '<option value="" disabled selected>Selecione uma sequência</option>';
        selectRoteiro.disabled = true;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRevisao.disabled = true;
        if (produto && dadosParaSelecao[produto]) {
            const sequencias = Object.keys(dadosParaSelecao[produto]).sort((a, b) => a - b);
            sequencias.forEach(s => selectSequencia.add(new Option(s, s)));
            selectSequencia.disabled = false;
        }
    }

    function atualizarRoteiros() {
        const produto = selectProduto.value;
        const sequencia = selectSequencia.value;
        selectRoteiro.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRoteiro.disabled = true;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRevisao.disabled = true;
        if (produto && sequencia && dadosParaSelecao[produto][sequencia]) {
            const roteiros = Object.keys(dadosParaSelecao[produto][sequencia]).sort((a, b) => a - b);
            roteiros.forEach(r => selectRoteiro.add(new Option(r, r)));
            selectRoteiro.disabled = false;
        }
    }

    function atualizarRevisoes() {
        const produto = selectProduto.value;
        const sequencia = selectSequencia.value;
        const roteiro = selectRoteiro.value;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione uma revisão</option>';
        selectRevisao.disabled = true;
        if (produto && sequencia && roteiro && dadosParaSelecao[produto][sequencia][roteiro]) {
            const revisoes = dadosParaSelecao[produto][sequencia][roteiro].sort((a, b) => a - b);
            revisoes.forEach(r => selectRevisao.add(new Option(r, r)));
            selectRevisao.disabled = false;
        }
    }

    // --- LÓGICA DO CAMINHO CRÍTICO ---

    /**
     * Chama a API para calcular o caminho crítico e exibe os resultados.
     */
    async function calcularCaminhoCritico() {
        const produto = selectProduto.value;
        const sequencia = selectSequencia.value;
        const roteiro = selectRoteiro.value;
        const revisao = selectRevisao.value;

        if (!produto || !sequencia || !roteiro || !revisao) {
            alert('Por favor, selecione todos os campos do roteiro.');
            return;
        }

        btnCalcular.textContent = "Calculando...";
        btnCalcular.disabled = true;
        resultadoSection.classList.add('hidden');

        const url = `${urlApi}?action=getCaminhoCritico&produto=${produto}&sequencia=${sequencia}&roteiro=${roteiro}&revisao=${revisao}`;
        try {
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error("Falha ao calcular o caminho crítico.");
            
            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            renderizarResultado(dados);
            resultadoSection.classList.remove('hidden');

        } catch (erro) {
            alert(`Erro: ${erro.message}`);
            console.error(erro);
        } finally {
            btnCalcular.textContent = "Calcular Caminho Crítico";
            btnCalcular.disabled = false;
        }
    }

    /**
     * Desenha o resultado do caminho crítico e o gráfico de Gantt na tela.
     */
    function renderizarResultado(dados) {
        if (duracaoTotalEl) {
            duracaoTotalEl.textContent = dados.duracaoTotal.toFixed(2);
        }
        if (!ganttContainer) return;

        ganttContainer.innerHTML = ''; // Limpa o gráfico anterior

        if (!dados.operacoes || dados.operacoes.length === 0) {
            ganttContainer.innerHTML = '<p>Nenhuma operação encontrada para este roteiro.</p>';
            return;
        }
        
        // Adiciona uma legenda
        const legenda = document.createElement('div');
        legenda.className = 'gantt-legenda';
        legenda.innerHTML = `
            <div><span class="cor-legenda critico"></span> Caminho Crítico</div>
            <div><span class="cor-legenda nao-critico"></span> Com Folga</div>
        `;
        ganttContainer.appendChild(legenda);

        dados.operacoes.forEach(op => {
            const linhaGantt = document.createElement('div');
            linhaGantt.className = 'gantt-linha';
            
            const barra = document.createElement('div');
            barra.className = 'gantt-barra';
            if (op.isCritico) {
                barra.classList.add('critico');
            }
            // Calcula a posição e largura da barra em porcentagem
            barra.style.left = (op.inicioCedo / dados.duracaoTotal) * 100 + '%';
            barra.style.width = (op.duracao / dados.duracaoTotal) * 100 + '%';
            
            linhaGantt.innerHTML = `
                <div class="gantt-label" title="${op.ordem} - ${op.nome}">${op.ordem} - ${op.nome}</div>
                <div class="gantt-barra-container"></div>
            `;
            linhaGantt.querySelector('.gantt-barra-container').appendChild(barra);
            ganttContainer.appendChild(linhaGantt);
        });
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    if (selectProduto) selectProduto.addEventListener('change', atualizarSequencias);
    if (selectSequencia) selectSequencia.addEventListener('change', atualizarRoteiros);
    if (selectRoteiro) selectRoteiro.addEventListener('change', atualizarRevisoes);
    if (btnCalcular) btnCalcular.addEventListener('click', calcularCaminhoCritico);
    
    carregarMenusIniciais();
});