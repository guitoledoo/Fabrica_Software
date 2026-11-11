// public/js/login.js

const API_LOGIN = 'http://localhost:3001';

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
    const resposta = await fetch(`${API_LOGIN}/api/auth/login`, {
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

    // ===== Opção A: senha temporária ativa → troca obrigatória =====
    // O token NÃO é salvo: sem ele no localStorage, o auto-redirect
    // acima impede qualquer acesso ao sistema até a senha ser trocada
    if (dados.usuario.troca_obrigatoria) {
      abrirTrocaObrigatoria(dados.token, dados.usuario);
      return;
    }

    localStorage.setItem('token', dados.token);
    localStorage.setItem('usuario', JSON.stringify(dados.usuario));
    window.location.href = '/index.html';

  } catch (erro) {
    erroDiv.textContent = 'Erro de conexão com o servidor. A API está rodando?';
    erroDiv.style.display = 'block';
  }
});

// ============================================================
//  TROCA OBRIGATÓRIA (Opção A)
//  Overlay injetado via JS — não depende de HTML/CSS da página,
//  basta substituir este arquivo
// ============================================================
function abrirTrocaObrigatoria(token, usuario) {
  if (document.getElementById('troca-fundo')) return;

  const estilo = document.createElement('style');
  estilo.textContent = `
    #troca-fundo { position:fixed; inset:0; background:rgba(15,23,42,.6); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
    .troca-caixa { background:#fff; border-radius:12px; padding:28px; width:min(420px,100%); box-shadow:0 20px 60px rgba(0,0,0,.35); }
    .troca-titulo { margin:0 0 4px; font-size:1.15rem; color:#1e293b; }
    .troca-sub { margin:0 0 18px; color:#64748b; font-size:.88rem; line-height:1.4; }
    .troca-label { display:block; font-size:.8rem; font-weight:600; color:#475569; margin:10px 0 4px; }
    .troca-input { width:100%; box-sizing:border-box; padding:10px 12px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:.95rem; }
    .troca-input:focus { outline:none; border-color:#2563eb; }
    .troca-erro { display:none; color:#dc2626; font-size:.82rem; margin:10px 0 0; }
    .troca-regras { color:#94a3b8; font-size:.75rem; margin:8px 0 0; }
    .troca-botoes { display:flex; gap:10px; margin-top:20px; }
    .troca-btn-principal { flex:1; padding:11px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer; font-size:.95rem; }
    .troca-btn-principal:hover { background:#1d4ed8; }
    .troca-btn-principal:disabled { opacity:.6; cursor:wait; }
    .troca-btn-secundario { padding:11px 14px; background:transparent; color:#64748b; border:1.5px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:.9rem; }
  `;
  document.head.appendChild(estilo);

  const fundo = document.createElement('div');
  fundo.id = 'troca-fundo';
  fundo.innerHTML = `
    <div class="troca-caixa">
      <h2 class="troca-titulo">Defina sua nova senha</h2>
      <p class="troca-sub">Olá, <strong>${usuario.nome}</strong> — sua senha atual é temporária, gerada pelo administrador. Crie uma senha pessoal para acessar o sistema.</p>

      <label class="troca-label" for="troca-nova">Nova senha</label>
      <input class="troca-input" type="password" id="troca-nova" autocomplete="new-password">

      <label class="troca-label" for="troca-confirmar">Confirmar nova senha</label>
      <input class="troca-input" type="password" id="troca-confirmar" autocomplete="new-password">

      <p class="troca-erro" id="troca-erro"></p>
      <p class="troca-regras">Mínimo de 8 caracteres, com letra maiúscula, minúscula e número.</p>

      <div class="troca-botoes">
        <button class="troca-btn-secundario" id="troca-voltar" type="button">Voltar ao login</button>
        <button class="troca-btn-principal" id="troca-salvar" type="button">Salvar e entrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(fundo);

  document.getElementById('troca-voltar').addEventListener('click', () => location.reload());

  document.getElementById('troca-salvar').addEventListener('click', async () => {
    const erroDiv = document.getElementById('troca-erro');
    erroDiv.style.display = 'none';

    const nova = document.getElementById('troca-nova').value;
    const conf = document.getElementById('troca-confirmar').value;

    // Validação espelhando exatamente a regra do backend
    if (nova.length < 8 || !/[A-Z]/.test(nova) || !/[a-z]/.test(nova) || !/[0-9]/.test(nova)) {
      erroDiv.textContent = 'A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula e número.';
      erroDiv.style.display = 'block';
      return;
    }
    if (nova !== conf) {
      erroDiv.textContent = 'As senhas não coincidem.';
      erroDiv.style.display = 'block';
      return;
    }

    const botao = document.getElementById('troca-salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    try {
      const resposta = await fetch(`${API_LOGIN}/api/auth/trocar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ novaSenha: nova })
      });

      const dadosResposta = await resposta.json();

      if (!resposta.ok) {
        erroDiv.textContent = dadosResposta.erro || 'Erro ao trocar a senha';
        erroDiv.style.display = 'block';
        botao.disabled = false;
        botao.textContent = 'Salvar e entrar';
        return;
      }

      // Troca concluída → agora sim o acesso é liberado
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify({ ...usuario, troca_obrigatoria: false }));
      window.location.href = '/index.html';

    } catch (erro) {
      erroDiv.textContent = 'Erro de conexão com o servidor. A API está rodando?';
      erroDiv.style.display = 'block';
      botao.disabled = false;
      botao.textContent = 'Salvar e entrar';
    }
  });
}