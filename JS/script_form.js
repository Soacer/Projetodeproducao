document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENTOS DA PÁGINA ---
    const form = document.getElementById('form-ordem');
    const botaoGerar = document.getElementById('botao-gerar');
    const selectProduto = document.getElementById('produto');
    const selectSequencia = document.getElementById('sequencia');
    const selectRoteiro = document.getElementById('roteiro');
    const selectRevisao = document.getElementById('revisao'); // <<< NOVO ELEMENTO

    // --- CONFIGURAÇÃO ---
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';
    
    let dadosDoFormulario = {};

    /**
     * PASSO 1: Busca o mapa de dados completo e popula o campo Produto.
     */
    async function carregarFormularioInicial() {
        const url = `${urlApi}?action=getValoresFormulario`;
        try {
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha ao buscar dados iniciais.');
            
            dadosDoFormulario = await resposta.json();
            if(dadosDoFormulario.erro) throw new Error(dadosDoFormulario.mensagem);
            
            const todosOsProdutos = Object.keys(dadosDoFormulario).sort();
            selectProduto.innerHTML = '<option value="" disabled selected>Selecione um produto</option>';
            todosOsProdutos.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto;
                option.textContent = produto;
                selectProduto.appendChild(option);
            });
        } catch (erro) {
            console.error("Erro ao carregar formulário:", erro);
            selectProduto.innerHTML = `<option value="">Erro: ${erro.message}</option>`;
        }
    }

    /**
     * PASSO 2: Chamado quando um Produto é selecionado. Popula o campo Sequencia.
     */
    function atualizarSequencias() {
        const produtoSelecionado = selectProduto.value;
        // Reseta todos os campos dependentes
        selectSequencia.innerHTML = '<option value="" disabled selected>Selecione uma sequência</option>';
        selectSequencia.disabled = true;
        selectRoteiro.innerHTML = '<option value="" disabled selected>Selecione uma sequência</option>';
        selectRoteiro.disabled = true;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>'; // <<< ATUALIZADO
        selectRevisao.disabled = true;

        if (produtoSelecionado && dadosDoFormulario[produtoSelecionado]) {
            const sequenciasDoProduto = Object.keys(dadosDoFormulario[produtoSelecionado]).sort((a,b) => a-b);
            sequenciasDoProduto.forEach(sequencia => {
                const option = document.createElement('option');
                option.value = sequencia;
                option.textContent = sequencia;
                selectSequencia.appendChild(option);
            });
            selectSequencia.disabled = false;
        }
    }

    /**
     * PASSO 3: Chamado quando uma Sequencia é selecionada. Popula o campo Roteiro.
     */
    function atualizarRoteiros() {
        const produtoSelecionado = selectProduto.value;
        const sequenciaSelecionada = selectSequencia.value;
        // Reseta os campos dependentes
        selectRoteiro.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRoteiro.disabled = true;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>'; // <<< ATUALIZADO
        selectRevisao.disabled = true;

        if (produtoSelecionado && sequenciaSelecionada && dadosDoFormulario[produtoSelecionado][sequenciaSelecionada]) {
            const roteirosDisponiveis = Object.keys(dadosDoFormulario[produtoSelecionado][sequenciaSelecionada]).sort((a,b) => a-b);
            roteirosDisponiveis.forEach(roteiro => {
                const option = document.createElement('option');
                option.value = roteiro;
                option.textContent = roteiro;
                selectRoteiro.appendChild(option);
            });
            selectRoteiro.disabled = false;
        }
    }

    /**
     * PASSO 4: NOVA FUNÇÃO. Chamada quando um Roteiro é selecionado. Popula o campo Revisão.
     */
    function atualizarRevisoes() {
        const produtoSelecionado = selectProduto.value;
        const sequenciaSelecionada = selectSequencia.value;
        const roteiroSelecionado = selectRoteiro.value;
        
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione uma revisão</option>';
        selectRevisao.disabled = true;

        if (produtoSelecionado && sequenciaSelecionada && roteiroSelecionado && dadosDoFormulario[produtoSelecionado][sequenciaSelecionada][roteiroSelecionado]) {
            const revisoesDisponiveis = dadosDoFormulario[produtoSelecionado][sequenciaSelecionada][roteiroSelecionado].sort((a,b) => a-b);
            revisoesDisponiveis.forEach(revisao => {
                const option = document.createElement('option');
                option.value = revisao;
                option.textContent = revisao;
                selectRevisao.appendChild(option);
            });
            selectRevisao.disabled = false;
        }
    }

    /**
     * Função que lida com o envio do formulário. (Sua função, sem alterações)
     */
    async function enviarFormulario(event) {
        event.preventDefault();
        botaoGerar.disabled = true;
        botaoGerar.textContent = 'Salvando na planilha...';
        const formData = new FormData(form);
        const dadosParaEnviar = Object.fromEntries(formData.entries());
        try {
            const resposta = await fetch(urlApi, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar),
                redirect: 'follow'
            });
            botaoGerar.textContent = 'Sucesso! Redirecionando...';
            const params = new URLSearchParams(dadosParaEnviar);
            const urlDestino = `of.html?${params.toString()}`;
            setTimeout(() => {
                window.location.href = urlDestino;
            }, 500);
        } catch (erro) {
            console.error("Erro ao enviar dados:", erro);
            alert(`Falha ao enviar os dados: ${erro.message}`);
            botaoGerar.disabled = false;
            botaoGerar.textContent = 'Gerar Ordem de Fabricação';
        }
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    form.addEventListener('submit', enviarFormulario);
    selectProduto.addEventListener('change', atualizarSequencias);
    selectSequencia.addEventListener('change', atualizarRoteiros);
    selectRoteiro.addEventListener('change', atualizarRevisoes); // <<< NOVO EVENTO ADICIONADO
    
    carregarFormularioInicial();
});