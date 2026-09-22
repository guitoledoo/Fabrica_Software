// public/js/historico.js

let paginaAtual = 1;
const LIMITE = 25;
let totalRegistros = 0;

async function carregarHistorico() {
  const resposta = await fetchAutenticado(
    `${API_BASE}/api/historico?pagina=${paginaAtual}&limite=${LIMITE}`
  );
  const dados = await resposta.json();
  totalRegistros = dados.total;

  const tbody = document.querySelector('#tabela-historico tbody');
  tbody.innerHTML = '';

  if (dados.registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="sem-dados">Nenhum registro no histórico</td></tr>';
  } else {
    dados.registros.forEach(reg => {
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td>${formatarData(reg.data_hora)}</td>
        <td><strong>${reg.ativo_id}</strong></td>
        <td>${reg.marca ? `${reg.marca} ${reg.modelo || ''}` : '—'}</td>
        <td><span class="badge badge-${reg.tipo.toLowerCase()}">${reg.tipo}</span></td>
        <td>${reg.descricao}</td>
        <td>${reg.usuario_email}</td>
      `;
      tbody.appendChild(linha);
    });
  }

  // Controles de paginação
  const totalPaginas = Math.ceil(totalRegistros / LIMITE) || 1;
  document.getElementById('info-pagina').textContent = `Página ${paginaAtual} de ${totalPaginas} (${totalRegistros} registros)`;
  document.getElementById('btn-anterior').disabled = paginaAtual <= 1;
  document.getElementById('btn-proximo').disabled = paginaAtual >= totalPaginas;
}

document.getElementById('btn-anterior').addEventListener('click', () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    carregarHistorico();
  }
});

document.getElementById('btn-proximo').addEventListener('click', () => {
  const totalPaginas = Math.ceil(totalRegistros / LIMITE) || 1;
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    carregarHistorico();
  }
});

carregarHistorico();