document.addEventListener('DOMContentLoaded', function () {
    const selectOpBusca = document.getElementById('select-op-busca');
    const resultadoContainer = document.getElementById('resultado-container');
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    /**
     * Carrega a lista de todas as OPs (incluindo o ID) e popula o menu dropdown.
     */
    async function carregarListaDeOps() {
        if (!selectOpBusca) return;
        try {
            const url = `${urlApi}?action=getListaDeOps&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error("Falha de rede ao buscar lista de OPs.");

            const listaOps = await resposta.json();
            if (listaOps.erro) throw new Error(listaOps.mensagem);

            selectOpBusca.innerHTML = '<option value="" disabled selected>Selecione uma OP</option>';
            listaOps.forEach(item => {
                // O valor da opção será o ID único (ex: 'md34e8j1q1...')
                const optionValue = item.id;

                // O texto visível para o usuário continuará o mesmo
                const optionText = `OP: ${item.op} (${item.status})`;

                selectOpBusca.add(new Option(optionText, optionValue));
            });

        } catch (erro) {
            console.error("Erro ao carregar lista de OPs:", erro);
            selectOpBusca.innerHTML = `<option value="">Erro: ${erro.message}</option>`;
        }
    }

    /**
     * Busca os detalhes completos da OP selecionada usando o seu ID.
     */
    async function buscarOpSelecionada() {
        // Agora, o valor selecionado será o ID correto
        const idSelecionado = selectOpBusca.value;
        if (!idSelecionado) return;

        resultadoContainer.classList.remove('hidden');
        resultadoContainer.innerHTML = `<div class="card">Buscando dados da OP...</div>`;
        console.log(idSelecionado);
        try {
            // A chamada para a API agora usa 'getOpById' e envia o id_op
            const url = `${urlApi}?action=getOpById&id_op=${idSelecionado}&cacheBust=${new Date().getTime()}`;
            const resposta = await fetch(url);
            if (!resposta.ok) throw new Error("Falha de rede ao buscar detalhes da OP.");

            const dados = await resposta.json();
            if (dados.erro) throw new Error(dados.mensagem);

            renderizarResultado(dados);

        } catch (erro) {
            console.error("Erro ao buscar OP:", erro);
            resultadoContainer.innerHTML = `<div class="card erro">Erro: ${erro.message}</div>`;
        }
    }

    function renderizarResultado(dados) {
        const { cabecalho, operacoes } = dados;

        // Garante que 'operacoes' seja sempre um array para o .map() funcionar
        const listaOperacoes = Array.isArray(operacoes) ? operacoes : [];

        const resultadoHtml = `
            <div class="card">
                <header class="ordem-header">
                    <table class="tabela-principal">
                        <tr>
                            <td rowspan="3" class="logo-op-visualizar"><div class="logo-texto">algetec<span>+</span></div></td>
                            <td colspan="3" class="titulo">ORDEM DE FABRICACAO</td>
                            <td class="campo-container"><label>Nº:</label><div class="valor">${cabecalho.numero || ''}</div></td>
                        </tr>
                        <tr>
                            <td class="campo-container"><label>Data do Pedido:</label><div class="valor">${cabecalho.data_pedido || ''}</div></td>
                            <td class="campo-container"><label>Data de Emissão:</label><div class="valor">${cabecalho.data_emissao || ''}</div></td>
                            <td class="campo-container"><label>Quantidade:</label><div class="valor">${cabecalho.quantidade || ''}</div></td>
                            <td class="campo-container"><label>Prioridade:</label><div class="valor">${cabecalho.prioridade || ''}</div></td>
                        </tr>
                        <tr>
                            <td class="campo-container"><label>Produto:</label><div class="valor">${cabecalho.produto || ''}</div></td>
                            <td class="campo-container"><label>Sequência:</label><div class="valor">${cabecalho.sequencia || ''}</div></td>
                            <td class="campo-container"><label>Roteiro:</label><div class="valor">${cabecalho.roteiro || ''}</div></td>
                            <td class="campo-container"><label>Revisão:</label><div class="valor">${cabecalho.revisao || ''}</div></td>
                        </tr>
                    </table>
                </header>
                <main class="ordem-corpo">
                    <table class="tabela-operacoes">
                        <thead>
                            <tr>
                                <th>Ordem</th><th>Operação</th><th>Setor/Maquina</th>
                                <th>Tempo Estimado (h)</th><th>Responsável</th>
                                <th>Data/Hora Início</th><th>Data/Hora Final</th><th>Assinatura</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${listaOperacoes.map(op => `
                                <tr>
                                    <td>${op[0] || ''}</td><td>${op[1] || ''}</td><td>${op[2] || ''}</td>
                                    <td>${op[3] || ''}</td><td>${op[4] || ''}</td>
                                    <td></td><td></td><td></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </main>
                <section class="secao-assinaturas">
                    <div class="campo-assinatura">
                        <div class="linha-para-assinar"></div>
                        <p class="titulo-assinatura">Coordenador de Elétrica</p>
                    </div>
                    <div class="campo-assinatura">
                        <div class="linha-para-assinar"></div>
                        <p class="titulo-assinatura">Coordenador de Mecânica</p>
                    </div>
                </section>
                <footer class="acoes">
                    <button id="botao-imprimir-op" class="btn-primario">Imprimir Ordem</button>
                </footer>
            </div>
        `;

        resultadoContainer.innerHTML = resultadoHtml;

        const botaoImprimir = document.getElementById('botao-imprimir-op');
        if (botaoImprimir) {
            botaoImprimir.addEventListener('click', () => {
                window.print();
            });
        }
    }
    // --- EVENT LISTENER E EXECUÇÃO ---
    if (selectOpBusca) {
        selectOpBusca.addEventListener('change', buscarOpSelecionada);
    }
    carregarListaDeOps();
});