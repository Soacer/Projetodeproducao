document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS DO DOM ---
    const edicaoSection = document.getElementById('edicao-roteiro');
    const btnCarregar = document.getElementById('btn-carregar-roteiro');
    const btnAddLinha = document.getElementById('btn-add-linha-edicao');
    const btnSalvar = document.getElementById('btn-salvar-alteracoes');
    const tabelaBody = document.getElementById('tabela-edicao-body');
    const selectProduto = document.getElementById('produto');
    const selectSequencia = document.getElementById('sequencia');
    const selectRoteiro = document.getElementById('roteiro');
    const selectRevisao = document.getElementById('revisao');
    const inputRevisaoEdicao = document.getElementById('roteiro-revisao-edicao');
    
    // --- CONFIGURAÇÃO ---
    // <<< IMPORTANTE: COLOQUE AQUI A URL DA SUA IMPLANTAÇÃO MAIS RECENTE E FUNCIONAL >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // --- ESTADO DA APLICAÇÃO (Variáveis de memória) ---
    let dadosParaSelecao = {};
    let operacoesAtuais = [];
    let infoRoteiroAtual = {};

    /**
     * PASSO 1: Carrega os dados para os menus de seleção em cascata.
     */
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

    /**
     * PASSO 2: Atualiza o menu de Sequências quando um Produto é escolhido.
     */
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

    /**
     * PASSO 3: Atualiza o menu de Roteiros quando uma Sequência é escolhida.
     */
    function atualizarRoteiros() {
        const produto = selectProduto.value;
        const sequencia = selectSequencia.value;
        selectRoteiro.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRoteiro.disabled = true;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione um roteiro</option>';
        selectRevisao.disabled = true;

        if (produto && sequencia && dadosParaSelecao[produto][sequencia]) {
            const roteiros = Object.keys(dadosParaSelecao[produto][sequencia]).sort((a,b) => a-b);
            roteiros.forEach(r => selectRoteiro.add(new Option(r, r)));
            selectRoteiro.disabled = false;
        }
    }
    
    /**
     * PASSO 4: Atualiza o menu de Revisões quando um Roteiro é escolhido.
     */
    function atualizarRevisoes() {
        const produto = selectProduto.value;
        const sequencia = selectSequencia.value;
        const roteiro = selectRoteiro.value;
        selectRevisao.innerHTML = '<option value="" disabled selected>Selecione uma revisão</option>';
        selectRevisao.disabled = true;
        if (produto && sequencia && roteiro && dadosParaSelecao[produto][sequencia][roteiro]) {
            const revisoes = dadosParaSelecao[produto][sequencia][roteiro].sort((a,b) => a-b);
            revisoes.forEach(r => selectRevisao.add(new Option(r, r)));
            selectRevisao.disabled = false;
        }
    }

    /**
     * Busca os dados do roteiro selecionado e os exibe na tabela de edição.
     */
    async function carregarRoteiroParaEdicao() {
        infoRoteiroAtual = { produto: selectProduto.value, sequencia: selectSequencia.value, roteiro: selectRoteiro.value, revisao: selectRevisao.value };
        if (!infoRoteiroAtual.produto || !infoRoteiroAtual.sequencia || !infoRoteiroAtual.roteiro || !infoRoteiroAtual.revisao) {
            alert('Por favor, selecione Produto, Sequência, Roteiro e Revisão para carregar.');
            return;
        }
        btnCarregar.textContent = "Carregando...";
        btnCarregar.disabled = true;

        const url = `${urlApi}?action=getDadosRoteiroParaEdicao&produto=${infoRoteiroAtual.produto}&sequencia=${infoRoteiroAtual.sequencia}&roteiro=${infoRoteiroAtual.roteiro}&revisao=${infoRoteiroAtual.revisao}`;
        try {
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error("Falha ao carregar dados do roteiro.");
            const dadosCarregados = await resposta.json();
            if (dadosCarregados.erro) throw new Error(dadosCarregados.mensagem);
            
            operacoesAtuais = dadosCarregados.operacoes || [];
            if(inputRevisaoEdicao) inputRevisaoEdicao.value = dadosCarregados.revisao || '1'; // Campo para editar a revisão
            
            renderizarTabela();
            if(edicaoSection) edicaoSection.classList.remove('hidden');
            if(btnSalvar) btnSalvar.classList.remove('hidden');
        } catch (erro) {
            alert(`Erro ao carregar roteiro: ${erro.message}`);
        } finally {
            btnCarregar.textContent = "Carregar Roteiro";
            btnCarregar.disabled = false;
        }
    }

    /**
     * Desenha a tabela editável na tela com base nos dados em memória.
     */
    function renderizarTabela() {
        tabelaBody.innerHTML = '';
        if (!operacoesAtuais) return;
        operacoesAtuais.sort((a, b) => a.ordem - b.ordem);
        operacoesAtuais.forEach(op => {
            const linha = tabelaBody.insertRow();
            linha.dataset.id = op.id;
            linha.innerHTML = `
                <td><input type="number" class="edit-ordem" value="${op.ordem || ''}" placeholder="Ordem"></td>
                <td><input type="text" class="edit-operacao" value="${op.operacao || ''}" placeholder="Descrição"></td>
                <td><input type="text" class="edit-setor" value="${op.setor_maquina || ''}" placeholder="Setor/Máquina"></td>
                <td><input type="number" class="edit-tempo" value="${op.tempo_estimado || ''}" step="0.1" placeholder="Tempo"></td>
                <td><input type="text" class="edit-responsavel" value="${op.responsavel || ''}" placeholder="Responsável"></td>
                <td><button type="button" class="btn-remover-edicao" title="Remover"><i class="fas fa-trash-alt"></i></button></td>
            `;
            linha.querySelector('.btn-remover-edicao').addEventListener('click', () => {
                if (confirm('Tem certeza que deseja remover esta operação?')) {
                    operacoesAtuais = operacoesAtuais.filter(item => item.id !== op.id);
                    renderizarTabela();
                }
            });
        });
    }

    /**
     * Adiciona uma nova linha em branco na tabela de edição.
     */
    function adicionarNovaLinhaEditavel() {
        const novaOrdem = operacoesAtuais.length > 0 ? Math.max(...operacoesAtuais.map(op => parseInt(op.ordem) || 0)) + 1 : 1;
        operacoesAtuais.push({ id: 'novo-' + Date.now(), ordem: novaOrdem, operacao: '', setor_maquina: '', tempo_estimado: '', responsavel: '' });
        renderizarTabela();
    }

    /**
     * Coleta todos os dados da tela, monta o payload e envia para salvar.
     */
    async function salvarAlteracoes() {
        if (!infoRoteiroAtual.produto) { alert("Nenhum roteiro carregado."); return; }
        const revisaoParaSalvar = inputRevisaoEdicao ? inputRevisaoEdicao.value : infoRoteiroAtual.revisao;
        if (!revisaoParaSalvar) { alert("O campo 'Revisão' é obrigatório."); return; }
        
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";
        
        const operacoesAtualizadas = [];
        const linhasDaTabela = tabelaBody.querySelectorAll('tr');
        for(const linha of linhasDaTabela) {
            const op = {
                id: linha.dataset.id,
                ordem: linha.querySelector('.edit-ordem').value,
                operacao: linha.querySelector('.edit-operacao').value,
                setor_maquina: linha.querySelector('.edit-setor').value,
                tempo_estimado: linha.querySelector('.edit-tempo').value,
                responsavel: linha.querySelector('.edit-responsavel').value,
            };
            if (!op.ordem || !op.operacao) {
                alert('Os campos "Ordem" e "Operação" não podem estar vazios.');
                btnSalvar.disabled = false;
                btnSalvar.textContent = "Salvar Alterações";
                return;
            }
            operacoesAtualizadas.push(op);
        };
        
        const payload = { action: 'salvarRoteiroEditado', ...infoRoteiroAtual, revisao: revisaoParaSalvar, operacoes: operacoesAtualizadas };
        
        try {
            await fetch(urlApi, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert('Roteiro salvo com sucesso!');
            window.location.reload();
        } catch (erro) {
            console.error('Erro ao salvar roteiro:', erro);
            alert('Falha ao salvar o roteiro.');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = "Salvar Alterações";
        }
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    if (selectProduto) selectProduto.addEventListener('change', atualizarSequencias);
    if (selectSequencia) selectSequencia.addEventListener('change', atualizarRoteiros);
    if (selectRoteiro) selectRoteiro.addEventListener('change', atualizarRevisoes);
    if (btnCarregar) btnCarregar.addEventListener('click', carregarRoteiroParaEdicao);
    if (btnAddLinha) btnAddLinha.addEventListener('click', adicionarNovaLinhaEditavel);
    if (btnSalvar) btnSalvar.addEventListener('click', salvarAlteracoes);
    
    carregarMenusIniciais();
});