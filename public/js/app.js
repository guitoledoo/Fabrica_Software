const API_BASE = 'http://localhost:3001';

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login.html';
}

async function fetchAutenticado(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      ...opcoes.headers
    }
  });

  if (resposta.status === 401) {
    localStorage.clear();
    window.location.href = '/login.html';
    throw new Error('Sessão expirada');
  }

  return resposta;
}

const usuarioSalvo = JSON.parse(localStorage.getItem('usuario') || '{}');

const spanNome = document.getElementById('usuario-nome');
if (spanNome && usuarioSalvo.nome) {
  spanNome.textContent = `${usuarioSalvo.nome} (${usuarioSalvo.nivel})`;
}

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });
}

function formatarData(dataISO) {
  if (!dataISO) return '-';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Apenas UX: o bloqueio real de escrita está no backend (403)
if (usuarioSalvo.nivel !== 'Admin') {
  document.addEventListener('DOMContentLoaded', () => {
    const btnNovo = document.getElementById('btn-novo') || document.getElementById('btn-movimentacao');
    if (btnNovo) btnNovo.style.display = 'none';

    document.querySelectorAll('.acoes-tabela').forEach(el => el.style.display = 'none');

    const linkUsuarios = document.querySelector('a[href="/usuarios.html"]');
    if (linkUsuarios) linkUsuarios.style.display = 'none';
  });
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-fundo')) {
    e.target.classList.remove('aberto');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-fundo.aberto').forEach(m => m.classList.remove('aberto'));
  }
});