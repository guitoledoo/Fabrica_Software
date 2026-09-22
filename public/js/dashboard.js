// public/js/dashboard.js

// Carrega o resumo da API e popula todos os elementos da página
async function carregarDashboard() {
  try {
    const resposta = await fetchAutenticado(`${API_BASE}/api/dashboard`);
    const dados = await resposta.json();

    // ===== Cards de resumo =====
    document.getElementById('total-ativos').textContent = dados.totalAtivos;
    document.getElementById('total-agencias').textContent = dados.totalAgencias;

    // porStatus é um array tipo [{status: 'Em Uso', total: 3}, ...]
    // Transformamos em objeto para facilitar a busca
    const statusMap = {};
    dados.porStatus.forEach(item => {
      statusMap[item.status] = item.total;
    });

    document.getElementById('total-em-uso').textContent = statusMap['Em Uso'] || 0;
    document.getElementById('total-em-estoque').textContent = statusMap['Em Estoque'] || 0;
    document.getElementById('total-manutencao').textContent = statusMap['Manutenção'] || 0;

    // ===== Tabela de garantias vencendo =====
    const tbodyGarantias = document.querySelector('#tabela-garantias tbody');
    tbodyGarantias.innerHTML = '';

    if (dados.garantiasVencendo.length === 0) {
      tbodyGarantias.innerHTML = '<tr><td colspan="3" class="sem-dados">Nenhuma garantia vencendo nos próximos 90 dias ✅</td></tr>';
    } else {
      dados.garantiasVencendo.forEach(ativo => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${ativo.id}</td>
          <td>${ativo.marca} ${ativo.modelo}</td>
          <td>${formatarData(ativo.fim_garantia).split(' ')[0]}</td>
        `;
        tbodyGarantias.appendChild(linha);
      });
    }

    // ===== Tabela de estoque em alerta =====
    const tbodyEstoque = document.querySelector('#tabela-estoque tbody');
    tbodyEstoque.innerHTML = '';

    if (dados.estoqueAlerta.length === 0) {
      tbodyEstoque.innerHTML = '<tr><td colspan="3" class="sem-dados">Estoque saudável ✅</td></tr>';
    } else {
      dados.estoqueAlerta.forEach(item => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${item.descricao}</td>
          <td class="valor-alerta">${item.saldo}</td>
          <td>${item.minimo}</td>
        `;
        tbodyEstoque.appendChild(linha);
      });
    }

    // ===== Últimas atividades =====
    const tbodyAtividades = document.querySelector('#tabela-atividades tbody');
    tbodyAtividades.innerHTML = '';

    if (dados.ultimasAtividades.length === 0) {
      tbodyAtividades.innerHTML = '<tr><td colspan="5" class="sem-dados">Nenhuma atividade registrada</td></tr>';
    } else {
      dados.ultimasAtividades.forEach(reg => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${formatarData(reg.data_hora)}</td>
          <td>${reg.ativo_id}</td>
          <td><span class="badge badge-${reg.tipo.toLowerCase()}">${reg.tipo}</span></td>
          <td>${reg.descricao}</td>
          <td>${reg.usuario_email}</td>
        `;
        tbodyAtividades.appendChild(linha);
      });
    }

  } catch (erro) {
    console.error('Erro ao carregar dashboard:', erro);
  }
}

// Executa ao abrir a página
carregarDashboard();