document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENTOS E CONFIGURAÇÃO ---
    const corpoTabela = document.getElementById('tabela-corpo');
    const botaoImprimir = document.getElementById('imprimirPagina'); // Pega o botão
    const urlApi = 'https://script.google.com/macros/s/AKfycbzCLJyPh0RYo1yOb4gcw6eegtfzlq2H_L9GktFQXyos13Bxz57bvXGTtWGa_Ens3Wqnzg/exec';

    /**
     * Preenche o cabeçalho com os dados vindos da URL.
     */
    function preencherCabecalhoComDadosDaURL() {
        const params = new URLSearchParams(window.location.search);
        const mapeamentoCampos = {
            'numero': 'display-numero', 'data-pedido': 'display-data-pedido',
            'data-emissao': 'display-data-emissao', 'quantidade': 'display-quantidade', 
            'produto': 'display-produto', 'prioridade': 'display-prioridade', 
            'sequencia': 'display-sequencia', 'roteiro': 'display-roteiro', 'revisao': 'display-revisao'
        };
        for (const [paramNome, elementoId] of Object.entries(mapeamentoCampos)) {
            const elemento = document.getElementById(elementoId);
            const valor = params.get(paramNome);
            if (elemento && valor) {
                if (elementoId.includes('data')) {
                    const dataObj = new Date(valor + 'T00:00:00');
                    elemento.textContent = dataObj.toLocaleDateString('pt-BR');
                } else {
                    elemento.textContent = valor;
                }
            }
        }
    }

    /**
     * Busca as operações filtradas na planilha e as exibe na tabela.
     */
    async function carregarDadosDaPlanilha() {
        corpoTabela.innerHTML = '<tr><td colspan="8">Carregando operações...</td></tr>';
        const params = new URLSearchParams(window.location.search);
        const produto = params.get('produto');
        const sequencia = params.get('sequencia');
        const roteiro = params.get('roteiro');
        if (!produto || !sequencia || !roteiro) {
            corpoTabela.innerHTML = '<tr><td colspan="8">Faltam parâmetros. Volte ao formulário.</td></tr>';
            return;
        }
        try {
            const urlParaOrdem = `${urlApi}?action=getOperacoes&produto=${encodeURIComponent(produto)}&sequencia=${encodeURIComponent(sequencia)}&roteiro=${encodeURIComponent(roteiro)}`;
            const resposta = await fetch(urlParaOrdem);
            if (!resposta.ok) {
                const erroServidor = await resposta.json().catch(() => ({ mensagem: 'Resposta inválida.' }));
                throw new Error(erroServidor.mensagem || `Erro de rede: ${resposta.statusText}`);
            }
            const dadosDaPlanilha = await resposta.json();
            corpoTabela.innerHTML = '';
            if (dadosDaPlanilha.length === 0) {
                corpoTabela.innerHTML = '<tr><td colspan="8">Nenhuma operação encontrada.</td></tr>';
                return;
            }
            dadosDaPlanilha.forEach((linha) => {
                const [dadoOrdem, dadoOperacao, dadoSetorMaquina, dadoTempoEstimado, dadoResponsavel] = linha;
                const novaLinha = document.createElement('tr');
                novaLinha.innerHTML = `
                    <td>${dadoOrdem || ''}</td><td>${dadoOperacao || ''}</td>      
                    <td>${dadoSetorMaquina || ''}</td><td>${dadoTempoEstimado || ''}</td>
                    <td>${dadoResponsavel || ''}</td><td></td><td></td><td></td>
                `;
                corpoTabela.appendChild(novaLinha);
            });
        } catch (erro) {
            console.error('Falha:', erro);
            corpoTabela.innerHTML = `<tr><td colspan="8">Erro: ${erro.message}</td></tr>`;
        }
    }

    // --- EXECUÇÃO INICIAL E EVENTOS ---

    // Adiciona a funcionalidade de clique ao botão de imprimir
    if (botaoImprimir) {
        botaoImprimir.addEventListener('click', () => {
            window.print();
        });
    }

    preencherCabecalhoComDadosDaURL();
    carregarDadosDaPlanilha();
});