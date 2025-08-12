document.addEventListener('DOMContentLoaded', function () {
    // --- ELEMENTOS ---
    const formCadastro = document.getElementById('form-cadastro-manutencao');
    const tabelaBody = document.getElementById('tabela-manutencao-corpo');
    const filtroInput = document.getElementById('filtro-manutencao');
    const modal = document.getElementById('modal-edicao');
    const formEdicao = document.getElementById('form-edicao-manutencao');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-edicao');
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';
    let todasAsManutencoes = [];

    /**
     * Carrega a lista inicial de manutenções.
     */
    async function carregarManutencoes() {
        if (!tabelaBody) return;
        tabelaBody.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;
        try {
            const url = `${urlApi}?action=getManutencoes&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error("Falha ao buscar manutenções.");

            todasAsManutencoes = await resposta.json();
            if (todasAsManutencoes.erro) throw new Error(todasAsManutencoes.mensagem);

            exibirDados(todasAsManutencoes);
        } catch (erro) {
            console.error("Erro ao carregar manutenções:", erro);
            tabelaBody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados: ${erro.message}</td></tr>`;
        }
    }

    /**
     * Exibe os dados na tabela e adiciona os botões de Ação.
     */
    function exibirDados(dados) {
        if (!tabelaBody) return;
        tabelaBody.innerHTML = '';
        if (dados.length === 0) {
            tabelaBody.innerHTML = `<tr><td colspan="5">Nenhuma tarefa de manutenção encontrada.</td></tr>`;
            return;
        }
        dados.forEach(manutencao => {
            const linha = document.createElement('tr');
            linha.dataset.manutencao = JSON.stringify(manutencao);
            linha.innerHTML = `
                <td>${manutencao.item || ''}</td>
                <td>${manutencao.modelo || ''}</td>
                <td>${manutencao.serie || ''}</td>
                <td>${manutencao.proxima_execucao || ''}</td>
                <td>${manutencao.status || ''}</td>
                <td class="acoes-tabela">
                    <button class="btn-editar" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-deletar" title="Deletar"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            linha.querySelector('.btn-editar').addEventListener('click', abrirModalEdicao);
            linha.querySelector('.btn-deletar').addEventListener('click', deletarItem);
            tabelaBody.appendChild(linha);
        });
    }

    /**
     * Deleta um item de manutenção.
     */
    async function deletarItem(event) {
        const linha = event.currentTarget.closest('tr');
        const dados = JSON.parse(linha.dataset.manutencao);
        console.log(dados);
        if (!confirm(`Tem certeza que deseja deletar a manutenção do item "${dados.item}"?`)) return;
        try {
            const payload = { action: 'deletarManutencao', id: dados.id };
            await fetch(urlApi, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert('Item deletado com sucesso!');
            carregarManutencoes();
        } catch (erro) {
            alert('Falha ao deletar o item.');
        }
    }

    /**
     * Abre o modal de edição e preenche com os dados da linha.
     */
    function abrirModalEdicao(event) {
        const linha = event.currentTarget.closest('tr');
        const dados = JSON.parse(linha.dataset.manutencao);
        for (const chave in dados) {
            // O 'name' dos inputs no formulário de edição deve corresponder às chaves dos dados
            const input = formEdicao.querySelector(`[name="${chave}"]`);
            if (input) {
                input.value = dados[chave];
            }
        }
        if (modal) modal.classList.remove('hidden');
    }

    /**
     * Lida com o salvamento do formulário de edição.
     */
    async function salvarEdicao(event) {
        event.preventDefault(); // Impede o envio GET padrão
        const btnSalvar = formEdicao.querySelector('button[type="submit"]');
        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const formData = new FormData(formEdicao);
        const dadosParaEnviar = Object.fromEntries(formData.entries());
        console.log(dadosParaEnviar);

        try {
            const payload = { action: 'editarManutencao', dados: dadosParaEnviar };
            await fetch(urlApi, {
                method: 'POST',
                mode: 'no-cors', // Usa 'no-cors' para evitar problemas de preflight
                body: JSON.stringify(payload)
            });
            alert('Alterações salvas com sucesso!');
            if (modal) modal.classList.add('hidden');
            carregarManutencoes();
        } catch (erro) {
            alert('Falha ao salvar as alterações.');
            console.error(erro);
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Alterações';
        }
    }

    /**
     * Lida com o cadastro de uma nova manutenção.
     */
    async function salvarNovaManutencao(event) {
        event.preventDefault(); // Impede o recarregamento padrão da página
        const btnSalvar = document.getElementById('btn-salvar-manutencao');
        const fileInput = document.getElementById('anexos');
        if (!btnSalvar) return;

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        try {
            const formData = new FormData(formCadastro);
            const dadosParaEnviar = Object.fromEntries(formData.entries());

            // ==========================================================
            // LÓGICA DE CÁLCULO DE DATA INTEGRADA AQUI
            // ==========================================================
            const ultimaExecucao = dadosParaEnviar.ultima_execucao;
            const periodo = dadosParaEnviar.periodo;

            // Se o usuário informou a última execução e o período, calcula a próxima
            if (ultimaExecucao && periodo) {
                const dataBase = new Date(ultimaExecucao + 'T00:00:00'); // Garante que a data seja lida corretamente
                const periodoEmDias = parseInt(periodo, 10);

                if (!isNaN(dataBase.getTime()) && !isNaN(periodoEmDias)) {
                    // Adiciona os dias à data base
                    dataBase.setDate(dataBase.getDate() + periodoEmDias);

                    // Formata a data para o padrão YYYY-MM-DD
                    const ano = dataBase.getFullYear();
                    const mes = String(dataBase.getMonth() + 1).padStart(2, '0');
                    const dia = String(dataBase.getDate()).padStart(2, '0');
                    const dataFormatada = `${ano}-${mes}-${dia}`;

                    // Sobrescreve o valor de 'proxima_execucao' com a data calculada
                    dadosParaEnviar.proxima_execucao = dataFormatada;
                    // Também atualiza o valor no campo do formulário, para o usuário ver
                    const inputProximaExecucao = document.getElementById('proxima_execucao');
                    if (inputProximaExecucao) inputProximaExecucao.value = dataFormatada;
                }
            }
            // ==========================================================

            dadosParaEnviar.action = 'cadastrarManutencao';
            
            await fetch(urlApi, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(dadosParaEnviar)
            });

            alert('Tarefa de manutenção salva com sucesso!');
            formCadastro.reset(); // Limpa o formulário
            carregarManutencoes(); // Recarrega a tabela com o novo item

        } catch (erro) {
            console.error("Erro ao salvar:", erro);
            alert("Falha ao salvar a tarefa de manutenção. Verifique o console.");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Salvar Tarefa';
        }
    }

    /**
     * Filtra a tabela de manutenções com base no texto digitado no campo de busca.
     */
    function filtrarTabela() {
        if (!filtroInput || !todasAsManutencoes) return; // Verificações de segurança

        const texto = filtroInput.value.toLowerCase();

        // Filtra a lista completa de manutenções guardada na memória
        const dadosFiltrados = todasAsManutencoes.filter(manutencao => {
            // Verifica se o texto de busca aparece em algum dos campos principais
            return (manutencao.item && manutencao.item.toLowerCase().includes(texto)) ||
                (manutencao.modelo && manutencao.modelo.toLowerCase().includes(texto)) ||
                (manutencao.status && manutencao.status.toLowerCase().includes(texto));
        });

        // Exibe apenas os dados que passaram no filtro
        exibirDados(dadosFiltrados);
    }

    // --- EVENT LISTENERS E EXECUÇÃO INICIAL ---
    if (formCadastro) formCadastro.addEventListener('submit', salvarNovaManutencao);
    if (filtroInput) filtroInput.addEventListener('keyup', filtrarTabela);
    if (formEdicao) formEdicao.addEventListener('submit', salvarEdicao);
    if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', () => modal.classList.add('hidden'));

    carregarManutencoes();
});