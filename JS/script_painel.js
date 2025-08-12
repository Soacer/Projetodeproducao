document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS DA PÁGINA E CONFIGURAÇÃO ---
    const acordeonContainer = document.getElementById('acordeon-ops');
    const filtroInput = document.getElementById('filtro-ops');

    // <<< IMPORTANTE: COLOQUE AQUI A URL MAIS RECENTE DA SUA IMPLANTAÇÃO >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    let todasAsOps = []; // Guarda a lista original de OPs para o filtro funcionar

    /**
     * Carrega a lista inicial de OPs "Em Andamento" para criar os botões do acordeão.
     */
    async function carregarPainel() {
        if (!acordeonContainer) return;
        acordeonContainer.innerHTML = `<div class="carregando">Carregando OPs...</div>`;

        const urlPainel = `${urlApi}?action=getTodasAsOps&cacheBust=${new Date().getTime()}`;

        try {
            const resposta = await fetch(urlPainel);
            if (!resposta.ok) throw new Error('Falha ao buscar a lista de OPs.');

            const dadosRecebidos = await resposta.json();
            if (dadosRecebidos.erro) throw new Error(dadosRecebidos.mensagem);

            // Garante que estamos sempre trabalhando com uma lista (array)
            todasAsOps = Array.isArray(dadosRecebidos) ? dadosRecebidos : [dadosRecebidos];

            exibirOps(todasAsOps);

        } catch (erro) {
            console.error("Erro ao carregar painel:", erro);
            acordeonContainer.innerHTML = `<div class="erro">Erro ao carregar OPs: ${erro.message}</div>`;
        }
    }

    /**
     * Constrói os botões do acordeão na tela com base nos dados recebidos.
     */
    function exibirOps(dados) {
        if (!acordeonContainer) return;
        acordeonContainer.innerHTML = '';
        if (dados.length === 0 || (dados.length > 0 && !dados[0].op)) {
            acordeonContainer.innerHTML = `<div class="aviso">Nenhuma Ordem de Produção "Em Andamento" encontrada.</div>`;
            return;
        }
        dados.forEach(op => {
            const opItem = document.createElement('div');
            opItem.className = 'op-item';
            // MUDANÇA IMPORTANTE: Usamos data-op-id para guardar o ID único e data-op-numero para o número
            opItem.innerHTML = `
            <button class="op-collapse-btn" data-op-id="${op.id}" data-op-numero="${op.op}">
                <div class="op-info-group">
                    <span class="op-info">OP: ${op.op}</span>
                    <span class="op-produto">${op.produto}</span>
                </div>
                <div class="op-details-group">
                    <span class="op-date">${op.data_emissao}</span>
                    <span class="status" data-status="${op.status}">${op.status}</span>
                </div>
            </button>
            <div class="op-collapse-content"></div>
        `;
            acordeonContainer.appendChild(opItem);
        });
        document.querySelectorAll('.op-collapse-btn').forEach(button => {
            button.addEventListener('click', toggleOperacoes);
        });
    }


    /**
     * ATUALIZADA: Ao clicar em um botão de OP, envia o ID único 
     * para a API para buscar as operações pendentes corretas.
     */
    async function toggleOperacoes(event) {
        const button = event.currentTarget;
        const idDaOp = button.dataset.opId; // <<< MUDANÇA: Pega o ID único em vez do número
        const opNumero = button.dataset.opNumero; // Pega o número apenas para uso visual e nos IDs dos checkboxes
        const contentDiv = button.nextElementSibling;

        button.classList.toggle('active');

        if (contentDiv.style.maxHeight) {
            contentDiv.style.maxHeight = null; // Se está aberto, fecha
            return;
        }

        if (contentDiv.dataset.loaded === 'true') {
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px"; // Se já carregou, apenas reabre
            return;
        }

        // Se for o primeiro clique, busca os dados na API
        contentDiv.innerHTML = `<div class="operacao-item">Buscando operações...</div>`;
        contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";

        try {
            // MUDANÇA: Agora envia o 'id_op' para a API, que é o ID único
            const url = `${urlApi}?action=getOperacoesPendentes&id_op=${idDaOp}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error('Não foi possível carregar as operações.');

            const operacoes = await resposta.json();
            if (operacoes.erro) throw new Error(operacoes.mensagem);

            contentDiv.innerHTML = '';
            contentDiv.dataset.loaded = 'true';

            if (operacoes.length === 0) {
                contentDiv.innerHTML = `<div class="operacao-item">Nenhuma operação pendente para esta OP.</div>`;
            } else {
                const form = document.createElement('form');
                form.addEventListener('submit', handleConcluirOperacoes);

                operacoes.forEach(op => {
                    const idBase = `op-${op.id_operacao}`;
                    const item = document.createElement('div');
                    item.className = 'operacao-item';
                    item.innerHTML = `
                    <div class="operacao-checkbox-label">
                        <input type="checkbox" id="${idBase}" name="operacaoId" value="${op.id_operacao}">
                        <label for="${idBase}">${op.ordem} - ${op.operacao}</label>
                    </div>
                    <div class="datetime-container">
                        <label for="${idBase}-inicio">Início:</label>
                        <input type="datetime-local" id="${idBase}-inicio" name="datetime_inicio" disabled required>
                    </div>
                    <div class="datetime-container">
                        <label for="${idBase}-fim">Fim:</label>
                        <input type="datetime-local" id="${idBase}-fim" name="datetime_fim" disabled required>
                    </div>
                    <div class="operador-container">
                        <label for="${idBase}-operador">Operador:</label>
                        <input type="text" id="${idBase}-operador" name="operador" disabled required>
                    </div>
                `;
                    item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        item.querySelector(`input[name="datetime_inicio"]`).disabled = !isChecked;
                        item.querySelector(`input[name="datetime_fim"]`).disabled = !isChecked;
                        item.querySelector(`input[name="operador"]`).disabled = !isChecked;
                    });
                    form.appendChild(item);
                });

                const saveButton = document.createElement('button');
                saveButton.type = 'submit';
                saveButton.textContent = 'Concluir Selecionadas';
                form.appendChild(saveButton);
                contentDiv.appendChild(form);
            }
            // Reajusta a altura máxima após adicionar o conteúdo real
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
        } catch (erro) {
            contentDiv.innerHTML = `<div class="operacao-item erro">${erro.message}</div>`;
        }
    }
    /**
     * Lida com o envio do formulário de conclusão de operações.
     */
    async function handleConcluirOperacoes(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const checkboxesMarcadas = form.querySelectorAll('input[name="operacaoId"]:checked');

        if (checkboxesMarcadas.length === 0) {
            alert('Por favor, selecione ao menos uma operação para concluir.');
            return;
        }

        button.disabled = true;
        button.textContent = 'Salvando...';

        const operacoesParaEnviar = [];
        let formValido = true;

        checkboxesMarcadas.forEach(cb => {
            const id = cb.value;
            const itemDiv = cb.closest('.operacao-item');
            const inicio = itemDiv.querySelector('input[name="datetime_inicio"]').value;
            const fim = itemDiv.querySelector('input[name="datetime_fim"]').value;
            const operador = itemDiv.querySelector('input[name="operador"]').value;

            if (!inicio || !fim || !operador) {
                formValido = false;
            }
            operacoesParaEnviar.push({ id: id, inicio: inicio, fim: fim, operador: operador });
        });

        if (!formValido) {
            alert('Por favor, preencha todos os campos (Início, Fim e Operador) para as operações selecionadas.');
            button.disabled = false;
            button.textContent = 'Concluir Selecionadas';
            return;
        }

        try {
            const payload = {
                action: 'atualizarStatusOperacoes',
                operacoes: operacoesParaEnviar
            };

            await fetch(urlApi, {
                method: 'POST',
                mode: 'no-cors', // Modo "dispare e esqueça" para contornar problemas de CORS com Google Scripts
                body: JSON.stringify(payload)
            });

            // Atualiza a interface otimisticamente.
            const opCollapseButton = form.closest('.op-item').querySelector('.op-collapse-btn');
            const contentDiv = opCollapseButton.nextElementSibling;

            contentDiv.style.maxHeight = null;
            opCollapseButton.classList.remove('active');

            setTimeout(() => {
                contentDiv.innerHTML = '';
                contentDiv.dataset.loaded = 'false';
                opCollapseButton.click();
            }, 300);

        } catch (erro) {
            console.error('Erro ao enviar status:', erro);
            alert(`Falha crítica de rede ao salvar as alterações.`);
            button.disabled = false;
            button.textContent = 'Concluir Selecionadas';
        }
    }

    /**
     * Filtra a lista de OPs visíveis na tela.
     */
    function filtrarPainel() {
        if (!filtroInput) return;
        const textoFiltro = filtroInput.value.toLowerCase();
        const dadosFiltrados = todasAsOps.filter(op => {
            return op.op.toLowerCase().includes(textoFiltro) ||
                op.produto.toLowerCase().includes(textoFiltro) ||
                op.status.toLowerCase().includes(textoFiltro);
        });
        exibirOps(dadosFiltrados);
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    if (filtroInput) {
        filtroInput.addEventListener('keyup', filtrarPainel);
    }
    carregarPainel();
});