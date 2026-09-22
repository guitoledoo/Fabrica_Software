// public/js/login.js

// Se o usuário já está logado (token válido), vai direto pro painel
if (localStorage.getItem('token')) {
  window.location.href = '/index.html';
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  const erroDiv = document.getElementById('erro-login');

  erroDiv.style.display = 'none';

  try {
    const resposta = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      erroDiv.textContent = dados.erro || 'Erro ao fazer login';
      erroDiv.style.display = 'block';
      return;
    }

    // Salva o token e os dados do usuário no localStorage
    // O localStorage persiste mesmo fechando o navegador
    localStorage.setItem('token', dados.token);
    localStorage.setItem('usuario', JSON.stringify(dados.usuario));

    // Redireciona para o painel principal
    window.location.href = '/index.html';

  } catch (erro) {
    erroDiv.textContent = 'Erro de conexão com o servidor. A API está rodando?';
    erroDiv.style.display = 'block';
  }
});