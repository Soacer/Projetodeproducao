document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS GLOBAIS DA PÁGINA ---
    const acordeonContainer = document.getElementById('acordeon-ops');
    const filtroInput = document.getElementById('filtro-ops');
    
    // --- ELEMENTOS DE ORDENAÇÃO ---
    const btnOrdemCrescente = document.getElementById('btn-ordem-crescente');
    const btnOrdemDecrescente = document.getElementById('btn-ordem-decrescente');
    
    // --- ELEMENTOS DO MODAL DE APONTAMENTO EM LOTE ---
    const modalOverlay = document.getElementById('modal-lote-overlay');
    const btnAbrirModalLote = document.getElementById('btn-abrir-modal-lote');
    const btnFecharModal = document.querySelector('.modal-close-btn');
    const listaOperacoesLote = document.getElementById('lista-operacoes-lote');
    const formLoteDetalhes = document.getElementById('form-lote-detalhes');
    const tituloOperacaoSelecionada = document.getElementById('titulo-operacao-selecionada');
    const loteInicioInput = document.getElementById('lote-inicio');
    const loteFimInput = document.getElementById('lote-fim');
    const loteOperadorInput = document.getElementById('lote-operador');
    const btnConcluirLoteModal = document.getElementById('btn-concluir-lote-modal');

    // <<< URL DA API DO GOOGLE APPS SCRIPT >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    // --- VARIÁVEIS DE ESTADO ---
    let todasAsOps = []; // Armazena a lista completa de OPs para o filtro funcionar
    let operacoesLoteAgrupadas = {}; // Armazena as operações agrupadas para o modal
    let direcaoOrdenacao = 'crescente'; // Estado inicial da ordenação

    // ==========================================================
    // SEÇÃO 1: CARREGAMENTO, EXIBIÇÃO, FILTRO E ORDENAÇÃO
    // ==========================================================

    /**
     * Carrega a lista inicial de OPs "Em Andamento" do backend.
     */
    async function carregarPainel() {
        acordeonContainer.innerHTML = `<div class="carregando">Carregando OPs...</div>`;
        const urlPainel = `${urlApi}?action=getTodasAsOps&cacheBust=${new Date().getTime()}`;
        try {
            const resposta = await fetch(urlPainel);
            if (!resposta.ok) throw new Error('Falha na comunicação ao buscar OPs.');
            const dadosRecebidos = await resposta.json();
            if (dadosRecebidos.erro) throw new Error(dadosRecebidos.mensagem);
            
            todasAsOps = Array.isArray(dadosRecebidos) ? dadosRecebidos : [dadosRecebidos];
            // Ordena os dados assim que chegam, antes de exibir
            ordenarEExibirOps();
        } catch (erro) {
            console.error("Erro ao carregar painel:", erro);
            acordeonContainer.innerHTML = `<div class="erro">Erro ao carregar OPs: ${erro.message}</div>`;
        }
    }

    /**
     * Renderiza a lista de OPs na tela a partir de um array de dados.
     * @param {Array} dados Array de objetos de OP para exibir.
     */
    function exibirOps(dados) {
        acordeonContainer.innerHTML = '';
        if (dados.length === 0) {
            acordeonContainer.innerHTML = `<div class="aviso">Nenhuma Ordem de Produção "Em Andamento" encontrada.</div>`;
            return;
        }
        dados.forEach(op => {
            const opItem = document.createElement('div');
            opItem.className = 'op-item';
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
     * Função central que filtra, ordena e exibe as OPs.
     */
    function ordenarEExibirOps() {
        // 1. Filtra os dados com base no input
        const textoFiltro = filtroInput.value.toLowerCase();
        const dadosFiltrados = todasAsOps.filter(op => 
            op.op.toLowerCase().includes(textoFiltro) ||
            op.produto.toLowerCase().includes(textoFiltro)
        );

        // 2. Ordena o resultado filtrado
        dadosFiltrados.sort((a, b) => {
            // localeCompare com numeric: true é ideal para ordenar strings que são números
            if (direcaoOrdenacao === 'crescente') {
                return a.op.localeCompare(b.op, undefined, { numeric: true });
            } else {
                return b.op.localeCompare(a.op, undefined, { numeric: true });
            }
        });

        // 3. Exibe os dados já filtrados e ordenados
        exibirOps(dadosFiltrados);
    }
    
    /**
     * Atualiza o estado da ordenação e a aparência dos botões.
     * @param {string} novaDirecao A nova direção ('crescente' ou 'decrescente').
     */
    function definirDirecaoOrdenacao(novaDirecao) {
        direcaoOrdenacao = novaDirecao;
        
        btnOrdemCrescente.classList.toggle('active', novaDirecao === 'crescente');
        btnOrdemDecrescente.classList.toggle('active', novaDirecao === 'decrescente');
        
        ordenarEExibirOps();
    }


    // ==========================================================
    // SEÇÃO 2: LÓGICA DO ACORDEÃO E CONCLUSÃO INDIVIDUAL
    // ==========================================================

    /**
     * Expande ou recolhe o painel de detalhes de uma OP e busca suas operações pendentes.
     * @param {Event} event O evento de clique no botão do acordeão.
     */
    async function toggleOperacoes(event) {
        const button = event.currentTarget;
        const contentDiv = button.nextElementSibling;
        button.classList.toggle('active');

        if (contentDiv.style.maxHeight) {
            contentDiv.style.maxHeight = null;
            return;
        }

        if (contentDiv.dataset.loaded === 'true') {
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
            return;
        }

        contentDiv.innerHTML = `<div class="operacao-item">Buscando operações...</div>`;
        contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";

        try {
            const idDaOp = button.dataset.opId;
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
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
        } catch (erro) {
            contentDiv.innerHTML = `<div class="operacao-item erro">${erro.message}</div>`;
        }
    }
    
    /**
     * Processa o envio do formulário de conclusão de operações individuais de uma OP.
     * @param {Event} event O evento de envio do formulário.
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
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });

            // Recarrega o painel inteiro para garantir consistência
            setTimeout(() => {
                carregarPainel();
            }, 1000);

        } catch (erro) {
            console.error('Erro ao enviar status:', erro);
            alert(`Falha crítica de rede ao salvar as alterações.`);
            button.disabled = false;
            button.textContent = 'Concluir Selecionadas';
        }
    }
    

    // ==========================================================
    // SEÇÃO 3: LÓGICA DO MODAL E CONCLUSÃO EM LOTE
    // ==========================================================
    
    /**
     * Abre o modal de apontamento em lote, busca e agrupa as operações pendentes.
     */
    async function abrirModalLote() {
        listaOperacoesLote.innerHTML = `<div class="carregando">Buscando e agrupando operações...</div>`;
        formLoteDetalhes.style.display = 'none';
        modalOverlay.style.display = 'flex';

        try {
            const url = `${urlApi}?action=getTodasAsOperacoesPendentes&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            const todasAsOperacoes = await resposta.json();

            if (todasAsOperacoes.erro) throw new Error(todasAsOperacoes.mensagem);
            if (todasAsOperacoes.length === 0) {
                listaOperacoesLote.innerHTML = `<div class="aviso">Nenhuma operação pendente foi encontrada.</div>`;
                return;
            }

            // A chave de agrupamento é uma combinação da operação E do produto.
            operacoesLoteAgrupadas = todasAsOperacoes.reduce((acc, op) => {
                const chave = `${op.ordem} - ${op.operacao}|${op.produto}`;
                if (!acc[chave]) {
                    acc[chave] = [];
                }
                acc[chave].push(op);
                return acc;
            }, {});

            listaOperacoesLote.innerHTML = '';
            // Filtra para mostrar apenas grupos com mais de uma OP (lote de fato)
            const gruposParaLote = Object.keys(operacoesLoteAgrupadas).filter(chave => operacoesLoteAgrupadas[chave].length > 1);

            if (gruposParaLote.length === 0) {
                 listaOperacoesLote.innerHTML = `<div class="aviso">Nenhuma operação em comum encontrada para 2 ou mais OPs do mesmo produto.</div>`;
                 return;
            }

            for (const chave of gruposParaLote) {
                const [nomeOperacao, nomeProduto] = chave.split('|');
                const operacoes = operacoesLoteAgrupadas[chave];
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-operacao-lote';
                itemDiv.dataset.chaveGrupo = chave;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'item-info';
                
                const nomeSpan = document.createElement('span');
                nomeSpan.className = 'item-nome';
                nomeSpan.textContent = nomeOperacao;
                
                const produtosSmall = document.createElement('small');
                produtosSmall.className = 'item-produtos';
                produtosSmall.innerHTML = `Produto: <strong>${nomeProduto}</strong>`;

                infoDiv.appendChild(nomeSpan);
                infoDiv.appendChild(produtosSmall);

                const countSpan = document.createElement('span');
                countSpan.className = 'count';
                countSpan.textContent = `Pendente em ${operacoes.length} OPs`;
                
                itemDiv.appendChild(infoDiv);
                itemDiv.appendChild(countSpan);
                
                itemDiv.addEventListener('click', selecionarOperacaoLote);
                listaOperacoesLote.appendChild(itemDiv);
            }

        } catch (erro) {
            console.error("Erro ao buscar operações em lote:", erro);
            listaOperacoesLote.innerHTML = `<div class="erro">Erro ao buscar dados: ${erro.message}</div>`;
        }
    }

    /**
     * Fecha o modal de apontamento em lote.
     */
    function fecharModalLote() {
        modalOverlay.style.display = 'none';
    }

    /**
     * Manipula o clique em um item da lista de operações em lote no modal.
     * @param {Event} event O evento de clique.
     */
    function selecionarOperacaoLote(event) {
        document.querySelectorAll('.item-operacao-lote.selecionado').forEach(el => el.classList.remove('selecionado'));
        
        const itemSelecionado = event.currentTarget;
        itemSelecionado.classList.add('selecionado');
        
        const chaveGrupo = itemSelecionado.dataset.chaveGrupo;
        const [nomeOperacao, nomeProduto] = chaveGrupo.split('|');

        tituloOperacaoSelecionada.innerHTML = `Preencha os dados para: <br>"${nomeOperacao}" do produto "${nomeProduto}"`;
        formLoteDetalhes.style.display = 'block';
    }

    /**
     * Envia os dados do formulário do modal para concluir as operações em lote.
     */
    async function handleConcluirLoteModal() {
        const itemSelecionado = document.querySelector('.item-operacao-lote.selecionado');
        if (!itemSelecionado) {
            alert('Por favor, selecione uma operação da lista.');
            return;
        }

        const inicio = loteInicioInput.value;
        const fim = loteFimInput.value;
        const operador = loteOperadorInput.value.trim();

        if (!inicio || !fim || !operador) {
            alert('Preencha todos os campos: Início, Fim e Operador.');
            return;
        }
        
        btnConcluirLoteModal.disabled = true;
        btnConcluirLoteModal.textContent = 'Processando...';

        const chaveGrupo = itemSelecionado.dataset.chaveGrupo;
        const operacoesParaConcluir = operacoesLoteAgrupadas[chaveGrupo];
        
        const operacoesParaEnviar = operacoesParaConcluir.map(op => ({
            id: op.id_operacao,
            inicio: inicio,
            fim: fim,
            operador: operador
        }));

        try {
            const payload = {
                action: 'atualizarStatusOperacoes',
                operacoes: operacoesParaEnviar
            };

            await fetch(urlApi, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(payload)
            });

            setTimeout(() => {
                const [nomeOperacao] = chaveGrupo.split('|');
                alert(`${operacoesParaEnviar.length} instâncias da operação "${nomeOperacao}" foram concluídas com sucesso!`);
                fecharModalLote();
                carregarPainel();
            }, 1000);

        } catch (erro) {
            alert(`Falha crítica ao salvar as alterações: ${erro.message}`);
        } finally {
            btnConcluirLoteModal.disabled = false;
            btnConcluirLoteModal.textContent = 'Concluir Operações';
        }
    }

    // ==========================================================
    // SEÇÃO 4: INICIALIZAÇÃO E EVENT LISTENERS
    // ==========================================================

    filtroInput.addEventListener('keyup', ordenarEExibirOps);
    
    // Listeners para os botões de ordenação
    btnOrdemCrescente.addEventListener('click', () => definirDirecaoOrdenacao('crescente'));
    btnOrdemDecrescente.addEventListener('click', () => definirDirecaoOrdenacao('decrescente'));
    
    // Listeners do modal
    btnAbrirModalLote.addEventListener('click', abrirModalLote);
    btnFecharModal.addEventListener('click', fecharModalLote);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) fecharModalLote();
    });
    btnConcluirLoteModal.addEventListener('click', handleConcluirLoteModal);

    // Inicia o carregamento do painel
    carregarPainel();
});