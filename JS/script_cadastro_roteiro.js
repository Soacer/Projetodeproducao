document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENTOS DO DOM ---
    const formAddOperacao = document.getElementById('form-add-operacao');
    const tabelaBody = document.getElementById('tabela-operacoes-body');
    const btnSalvarRoteiro = document.getElementById('salvar-roteiro-completo');
    const formHeader = document.getElementById('form-roteiro-header');
    
    // --- CONFIGURAÇÃO ---
    // <<< IMPORTANTE: COLOQUE AQUI A URL DA SUA IMPLANTAÇÃO MAIS RECENTE >>>
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';
    
    // --- ESTADO DA APLICAÇÃO (Dados em memória) ---
    let operacoesAdicionadas = [];

    /**
     * Adiciona uma nova operação à lista e atualiza a interface.
     */
    function adicionarOperacao(event) {
        event.preventDefault();
        const form = event.currentTarget;
        
        const dependenciasMarcadas = [];
        form.querySelectorAll('#lista-dependencias-checkboxes input:checked').forEach(cb => {
            dependenciasMarcadas.push(cb.value);
        });

        const novaOperacao = {
            id: 'temp-' + Date.now(), // ID temporário para uso no frontend
            ordem: form.querySelector('#op-ordem').value,
            operacao: form.querySelector('#op-descricao').value,
            setor_maquina: form.querySelector('#op-setor').value,
            tempo_estimado: form.querySelector('#op-tempo').value,
            responsavel: form.querySelector('#op-responsavel').value,
            dependencias: dependenciasMarcadas // Salva os IDs temporários das dependências
        };
        
        operacoesAdicionadas.push(novaOperacao);
        renderizarTabela();
        atualizarCheckboxesDeDependencia();
        form.reset(); // Limpa os campos do formulário de adição
        form.querySelector('#op-ordem').focus(); // Coloca o foco de volta no campo 'Ordem'
    }

    /**
     * Atualiza a lista de checkboxes de dependências disponíveis.
     */
    function atualizarCheckboxesDeDependencia() {
        const container = document.getElementById('lista-dependencias-checkboxes');
        if (!container) return;
        container.innerHTML = '';
        if (operacoesAdicionadas.length === 0) {
            container.innerHTML = '<p class="aviso-sem-op">Adicione operações para poder definir dependências.</p>';
            return;
        }
        const operacoesOrdenadas = [...operacoesAdicionadas].sort((a,b) => a.ordem - b.ordem);

        operacoesOrdenadas.forEach(op => {
            const item = document.createElement('label');
            item.className = 'checkbox-item';
            item.innerHTML = `<input type="checkbox" value="${op.id}"> ${op.ordem} - ${op.operacao}`;
            container.appendChild(item);
        });
    }

    /**
     * Desenha a tabela na tela com base na lista de operações.
     */
    function renderizarTabela() {
        if (!tabelaBody) return;
        tabelaBody.innerHTML = '';
        operacoesAdicionadas.sort((a,b) => a.ordem - b.ordem);
        
        const mapaDeOrdens = new Map(operacoesAdicionadas.map(op => [op.id.toString(), op.ordem]));

        operacoesAdicionadas.forEach(op => {
            const linha = document.createElement('tr');
            // Mapeia os IDs de dependência para os seus números de 'ordem' para exibição
            const dependenciasTexto = op.dependencias.map(idTemp => mapaDeOrdens.get(idTemp) || '?').join(', ');

            linha.innerHTML = `
                <td>${op.ordem}</td>
                <td>${op.operacao}</td>
                <td>${op.setor_maquina}</td>
                <td>${op.tempo_estimado}</td>
                <td>${op.responsavel}</td>
                <td>${dependenciasTexto}</td>
                <td><button type="button" class="btn-remover" data-id="${op.id}"><i class="fas fa-trash-alt"></i></button></td>
            `;
            linha.querySelector('.btn-remover').addEventListener('click', () => removerOperacao(op.id));
            tabelaBody.appendChild(linha);
        });
    }

    /**
     * Remove uma operação da lista e atualiza a interface.
     */
    function removerOperacao(idParaRemover) {
        if (!confirm('Tem certeza que deseja remover esta operação da lista?')) return;
        operacoesAdicionadas = operacoesAdicionadas.filter(op => op.id !== idParaRemover);
        renderizarTabela();
        atualizarCheckboxesDeDependencia();
    }

    /**
     * Coleta todos os dados e envia para o Google Apps Script para salvar.
     */
    async function salvarRoteiroCompleto() {
        if (!formHeader.checkValidity()) {
            alert('Por favor, preencha todos os campos do cabeçalho do roteiro (Produto, Sequência, etc.).');
            return;
        }
        if (operacoesAdicionadas.length === 0) {
            alert('Adicione ao menos uma operação ao roteiro antes de salvar.');
            return;
        }

        btnSalvarRoteiro.disabled = true;
        btnSalvarRoteiro.textContent = 'Salvando...';

        const dadosRoteiro = {
            action: 'cadastrarRoteiro',
            produto: document.getElementById('roteiro-produto').value,
            sequencia: document.getElementById('roteiro-sequencia').value,
            roteiro: document.getElementById('roteiro-numero').value,
            revisao: document.getElementById('roteiro-revisao').value,
            operacoes: operacoesAdicionadas
        };

        try {
            await fetch(urlApi, { 
                method: 'POST', 
                mode: 'no-cors', // Modo "dispare e esqueça" para contornar problemas de CORS
                body: JSON.stringify(dadosRoteiro) 
            });
            alert('Roteiro salvo com sucesso!');
            window.location.reload(); // Recarrega a página para um novo cadastro
        } catch (erro) {
            console.error('Erro ao salvar roteiro:', erro);
            alert('Falha ao salvar o roteiro. Verifique o console para mais detalhes.');
        } finally {
            btnSalvarRoteiro.disabled = false;
            btnSalvarRoteiro.textContent = 'Salvar Roteiro Completo';
        }
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    
    if (formAddOperacao) {
        formAddOperacao.addEventListener('submit', adicionarOperacao);
    }
    
    if (btnSalvarRoteiro) {
        btnSalvarRoteiro.addEventListener('click', salvarRoteiroCompleto);
    }
    
    // Inicia a lista de checkboxes vazia ao carregar a página
    atualizarCheckboxesDeDependencia(); 
});