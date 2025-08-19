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
    const modalDependencias = document.getElementById('modal-dependencias');
    const btnSalvarDeps = document.getElementById('btn-salvar-deps');
    const btnCancelarDeps = document.getElementById('btn-cancelar-deps');
    
    // --- CONFIGURAÇÃO ---
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // --- ESTADO DA APLICAÇÃO ---
    let dadosParaSelecao = {};
    let operacoesAtuais = [];
    let infoRoteiroAtual = {};
    let idOperacaoEmEdicao = null;

    // --- LÓGICA DOS MENUS ---
    async function carregarMenusIniciais() {
        if (!selectProduto) return;
        selectProduto.innerHTML = '<option value="">Carregando...</option>';
        const url = `${urlApi}?action=getValoresFormulario&cacheBust=${new Date().getTime()}`;
        try {
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Falha de rede ao buscar dados.');
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
            const roteiros = Object.keys(dadosParaSelecao[produto][sequencia]).sort((a,b) => a-b);
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
            const revisoes = dadosParaSelecao[produto][sequencia][roteiro].sort((a,b) => a-b);
            revisoes.forEach(r => selectRevisao.add(new Option(r, r)));
            selectRevisao.disabled = false;
        }
    }

    // --- LÓGICA DE EDIÇÃO ---
    async function carregarRoteiroParaEdicao() {
        infoRoteiroAtual = { produto: selectProduto.value, sequencia: selectSequencia.value, roteiro: selectRoteiro.value, revisao: selectRevisao.value };
        if (!infoRoteiroAtual.produto || !infoRoteiroAtual.sequencia || !infoRoteiroAtual.roteiro || !infoRoteiroAtual.revisao) {
            alert('Por favor, selecione todos os campos para carregar.');
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
            if(inputRevisaoEdicao) inputRevisaoEdicao.value = dadosCarregados.revisao || '1';
            renderizarTabela();
            if(edicaoSection) edicaoSection.classList.remove('hidden');
        } catch (erro) {
            alert(`Erro ao carregar roteiro: ${erro.message}`);
        } finally {
            btnCarregar.textContent = "Carregar Roteiro";
            btnCarregar.disabled = false;
        }
    }

    function renderizarTabela() {
        if (!tabelaBody) return;
        tabelaBody.innerHTML = '';
        operacoesAtuais.sort((a, b) => (parseInt(a.ordem) || 0) - (parseInt(b.ordem) || 0));
        const mapaDeOrdens = new Map(operacoesAtuais.map(op => [op.id.toString(), op.ordem]));
        operacoesAtuais.forEach(op => {
            const linha = tabelaBody.insertRow();
            linha.dataset.id = op.id;
            const dependenciasTexto = (op.dependencias || []).map(idTemp => mapaDeOrdens.get(idTemp.toString()) || '?').join(', ');
            linha.innerHTML = `
                <td><input type="number" class="edit-ordem" value="${op.ordem || ''}"></td>
                <td><input type="text" class="edit-operacao" value="${op.operacao || ''}"></td>
                <td><input type="text" class="edit-setor" value="${op.setor_maquina || ''}"></td>
                <td><input type="number" class="edit-tempo" value="${op.tempo_estimado || ''}" step="0.1"></td>
                <td><input type="text" class="edit-responsavel" value="${op.responsavel || ''}"></td>
                <td><span>${dependenciasTexto}</span><button type="button" class="btn-editar-deps" title="Editar Dependências"><i class="fas fa-link"></i></button></td>
                <td class="acoes-tabela"><button type="button" class="btn-remover-edicao" title="Remover Operação"><i class="fas fa-trash-alt"></i></button></td>
            `;
            linha.querySelector('.btn-remover-edicao').addEventListener('click', () => {
                if (confirm('Tem certeza?')) {
                    operacoesAtuais = operacoesAtuais.filter(item => item.id !== op.id);
                    renderizarTabela();
                }
            });
            linha.querySelector('.btn-editar-deps').addEventListener('click', () => abrirModalDependencias(op.id));
        });
    }

    function adicionarNovaLinhaEditavel() {
        const novaOrdem = operacoesAtuais.length > 0 ? Math.max(...operacoesAtuais.map(op => parseInt(op.ordem) || 0)) + 1 : 1;
        operacoesAtuais.push({ id: 'novo-' + Date.now(), ordem: novaOrdem, operacao: '', setor_maquina: '', tempo_estimado: '', responsavel: '', dependencias: [] });
        renderizarTabela();
    }

    async function salvarAlteracoes() {
        if (!infoRoteiroAtual.produto) { alert("Nenhum roteiro carregado."); return; }
        const revisaoParaSalvar = inputRevisaoEdicao ? inputRevisaoEdicao.value : infoRoteiroAtual.revisao;
        if (!revisaoParaSalvar) { alert("O campo 'Salvar como Revisão nº' é obrigatório."); return; }
        btnSalvar.disabled = true;
        btnSalvar.textContent = "Salvando...";
        const operacoesAtualizadas = [];
        const linhasDaTabela = tabelaBody.querySelectorAll('tr');
        for(const linha of linhasDaTabela) {
            const idAtual = linha.dataset.id;
            const opOriginal = operacoesAtuais.find(op => op.id == idAtual);
            const op = {
                id: idAtual,
                ordem: linha.querySelector('.edit-ordem').value,
                operacao: linha.querySelector('.edit-operacao').value,
                setor_maquina: linha.querySelector('.edit-setor').value,
                tempo_estimado: linha.querySelector('.edit-tempo').value,
                responsavel: linha.querySelector('.edit-responsavel').value,
                dependencias: opOriginal ? opOriginal.dependencias : [] // Preserva as dependências
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
    
    function abrirModalDependencias(idOperacao) {
        idOperacaoEmEdicao = idOperacao;
        const operacaoAtual = operacoesAtuais.find(op => op.id === idOperacao);
        if (!operacaoAtual) return;
        const dependenciasAtuais = operacaoAtual.dependencias || [];
        const containerCheckboxes = document.getElementById('lista-dependencias-modal');
        document.getElementById('modal-op-ordem').textContent = `${operacaoAtual.ordem} - ${operacaoAtual.operacao}`;
        containerCheckboxes.innerHTML = '';
        operacoesAtuais.forEach(op => {
            if (op.id !== idOperacao) {
                const isChecked = dependenciasAtuais.includes(op.id);
                const item = document.createElement('label');
                item.className = 'checkbox-item';
                item.innerHTML = `<input type="checkbox" value="${op.id}" ${isChecked ? 'checked' : ''}> ${op.ordem} - ${op.operacao}`;
                containerCheckboxes.appendChild(item);
            }
        });
        if (modalDependencias) modalDependencias.classList.remove('hidden');
    }

    function salvarDependencias() {
        const operacaoAtual = operacoesAtuais.find(op => op.id === idOperacaoEmEdicao);
        if (!operacaoAtual) return;
        const containerCheckboxes = document.getElementById('lista-dependencias-modal');
        const novasDependencias = [];
        containerCheckboxes.querySelectorAll('input:checked').forEach(cb => {
            novasDependencias.push(cb.value);
        });
        operacaoAtual.dependencias = novasDependencias;
        renderizarTabela();
        if (modalDependencias) modalDependencias.classList.add('hidden');
    }

    // --- EVENT LISTENERS ---
    if (selectProduto) selectProduto.addEventListener('change', atualizarSequencias);
    if (selectSequencia) selectSequencia.addEventListener('change', atualizarRoteiros);
    if (selectRoteiro) selectRoteiro.addEventListener('change', atualizarRevisoes);
    if (btnCarregar) btnCarregar.addEventListener('click', carregarRoteiroParaEdicao);
    if (btnAddLinha) btnAddLinha.addEventListener('click', adicionarNovaLinhaEditavel);
    if (btnSalvar) btnSalvar.addEventListener('click', salvarAlteracoes);
    if (btnSalvarDeps) btnSalvarDeps.addEventListener('click', salvarDependencias);
    if (btnCancelarDeps) btnCancelarDeps.addEventListener('click', () => modalDependencias.classList.add('hidden'));
    
    carregarMenusIniciais();
});