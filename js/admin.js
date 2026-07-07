/* ========================================
   JB Acessórios - Admin Panel JS (Firebase)
   ======================================== */

// ---- FIRESTORE HELPERS ----
async function fsGetAll(colecao) {
    const snap = await db.collection(colecao).orderBy('__name__').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsAdd(colecao, data) {
    const ref = await db.collection(colecao).add(data);
    return { id: ref.id, ...data };
}

async function fsUpdate(colecao, id, data) {
    await db.collection(colecao).doc(id).update(data);
}

async function fsDelete(colecao, id) {
    await db.collection(colecao).doc(id).delete();
}

async function fsGetConfig() {
    const doc = await db.collection('config').doc('site').get();
    return doc.exists ? doc.data() : {};
}

async function fsSetConfig(data) {
    await db.collection('config').doc('site').set(data, { merge: true });
}

// ---- CACHED DATA ----
let _cache = { produtos: null, colecoes: null, depoimentos: null };
function clearCache() { _cache = { produtos: null, colecoes: null, depoimentos: null }; }

async function getProdutos()    { if (!_cache.produtos)    _cache.produtos    = await fsGetAll('produtos');    return _cache.produtos    || []; }
async function getColecoes()    { if (!_cache.colecoes)    _cache.colecoes    = await fsGetAll('colecoes');    return _cache.colecoes    || []; }
async function getDepoimentos() { if (!_cache.depoimentos) _cache.depoimentos = await fsGetAll('depoimentos'); return _cache.depoimentos || []; }

// ---- LOGIN ----
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const loginScreen = document.getElementById('loginScreen');
const adminLayout = document.getElementById('adminLayout');

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const usuario = document.getElementById('loginUser').value.trim();
    const senha   = document.getElementById('loginPass').value;
    // Mapeia usuario para email ("admin" → ADMIN_EMAIL definido em firebase-config.js)
    const email = usuario.includes('@') ? usuario : ADMIN_EMAIL;
    try {
        await auth.signInWithEmailAndPassword(email, senha);
        // onAuthStateChanged vai cuidar do resto
    } catch {
        loginError.classList.add('show');
    }
});

function forceLogout() {
    adminLayout.style.display = 'none';
    loginScreen.style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

document.getElementById('btnLogout').addEventListener('click', async () => {
    await auth.signOut();
});

// Observa mudanças de autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.style.display = 'none';
        adminLayout.style.display = 'flex';
        loginError.classList.remove('show');
        initAdmin();
    } else {
        forceLogout();
    }
});

// ---- NAVIGATION ----
const navItems   = document.querySelectorAll('.nav-item');
const pages      = document.querySelectorAll('.page');
const breadcrumb = document.getElementById('breadcrumb');

function navigateTo(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');
    breadcrumb.textContent = { dashboard:'Dashboard', produtos:'Produtos', colecoes:'Coleções', depoimentos:'Depoimentos', configuracoes:'Configurações' }[pageId] || pageId;
    if (pageId === 'dashboard')     renderDashboard();
    if (pageId === 'produtos')      renderProdutos();
    if (pageId === 'colecoes')      renderColecoes();
    if (pageId === 'depoimentos')   renderDepoimentos();
    if (pageId === 'configuracoes') renderConfiguracoes();
    document.getElementById('sidebar').classList.remove('open');
}

navItems.forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

document.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn && !btn.classList.contains('nav-item')) {
        e.preventDefault();
        const page = btn.dataset.page, action = btn.dataset.action;
        navigateTo(page);
        if (action === 'novo' || action === 'nova') {
            setTimeout(() => {
                if (page === 'produtos')    openModalProduto();
                if (page === 'colecoes')    openModalColecao();
                if (page === 'depoimentos') openModalDepoimento();
            }, 50);
        }
    }
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ---- DASHBOARD ----
async function renderDashboard() {
    const [produtos, colecoes, depoimentos] = await Promise.all([getProdutos(), getColecoes(), getDepoimentos()]);
    document.getElementById('statProdutos').textContent    = produtos.length;
    document.getElementById('statColecoes').textContent    = colecoes.length;
    document.getElementById('statDepoimentos').textContent = depoimentos.length;
    document.getElementById('statContatos').textContent    = '—';
    const tbody = document.querySelector('#dashProdutosTable tbody');
    const last5 = produtos.slice(-5).reverse();
    tbody.innerHTML = last5.length
        ? last5.map(p => `<tr><td>${p.nome}</td><td>${p.preco}</td><td>${p.colecao || '—'}</td></tr>`).join('')
        : '<tr><td colspan="3" style="color:#aaa;text-align:center;padding:20px">Sem produtos</td></tr>';
}

// ---- PRODUTOS ----
let _produtosFiltro = '';

async function renderProdutos(filter) {
    if (filter !== undefined) _produtosFiltro = filter;
    const todos    = await getProdutos();
    const produtos = todos.filter(p => !_produtosFiltro || p.nome.toLowerCase().includes(_produtosFiltro.toLowerCase()));
    const tbody    = document.getElementById('produtosBody');
    const empty    = document.getElementById('produtosEmpty');
    if (!produtos.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = produtos.map(p => `
        <tr>
            <td><strong>${p.nome}</strong></td>
            <td>${p.colecao || '—'}</td>
            <td>${p.preco}</td>
            <td>${p.descricao ? p.descricao.slice(0,50) + '...' : '—'}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editProduto('${p.id}')">Editar</button>
                    <button class="btn-delete" onclick="deleteProduto('${p.id}')">Excluir</button>
                </div>
            </td>
        </tr>`).join('');
}

document.getElementById('searchProdutos').addEventListener('input', e => renderProdutos(e.target.value));
document.getElementById('btnNovoProduto').addEventListener('click', () => openModalProduto());

async function openModalProduto(id = null) {
    const modal  = document.getElementById('modalProduto');
    const title  = document.getElementById('modalProdutoTitle');
    const form   = document.getElementById('formProduto');
    const select = document.getElementById('produtoColecao');
    const cols   = await getColecoes();
    select.innerHTML = '<option value="">Selecione...</option>' + cols.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    if (id) {
        const p = (await getProdutos()).find(x => x.id === id);
        if (!p) return;
        title.textContent = 'Editar Produto';
        document.getElementById('produtoId').value        = p.id;
        document.getElementById('produtoNome').value      = p.nome;
        document.getElementById('produtoPreco').value     = p.preco;
        document.getElementById('produtoDescricao').value = p.descricao || '';
        document.getElementById('produtoImagem').value    = p.imagem || '';
        document.getElementById('produtoStatus').value    = p.status || 'ativo';
        select.value = p.colecao || '';
    } else {
        title.textContent = 'Novo Produto';
        form.reset();
        document.getElementById('produtoId').value = '';
    }
    modal.classList.add('open');
}

document.getElementById('formProduto').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('produtoId').value;
    const data = {
        nome:      document.getElementById('produtoNome').value.trim(),
        preco:     document.getElementById('produtoPreco').value.trim(),
        colecao:   document.getElementById('produtoColecao').value,
        descricao: document.getElementById('produtoDescricao').value.trim(),
        imagem:    document.getElementById('produtoImagem').value.trim(),
        status:    document.getElementById('produtoStatus').value,
    };
    if (id) { await fsUpdate('produtos', id, data); showToast('Produto atualizado!', 'gold'); }
    else    { await fsAdd('produtos', data);          showToast('Produto adicionado!', 'gold'); }
    _cache.produtos = null;
    closeModal('modalProduto');
    await renderProdutos();
    await renderDashboard();
});

function editProduto(id) { openModalProduto(id); }
async function deleteProduto(id) {
    if (!confirm('Excluir este produto?')) return;
    await fsDelete('produtos', id);
    _cache.produtos = null;
    await renderProdutos();
    await renderDashboard();
    showToast('Produto excluído.');
}

// ---- COLEÇÕES ----
async function renderColecoes() {
    const colecoes = await getColecoes();
    const grid     = document.getElementById('colecoesGrid');
    const empty    = document.getElementById('colecoesEmpty');
    if (!colecoes.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = colecoes.map(c => `
        <div class="collection-admin-card">
            <h4>${c.nome}</h4>
            <p>${c.descricao || 'Sem descrição'}</p>
            <div class="card-actions">
                <button class="btn-edit" onclick="editColecao('${c.id}')">Editar</button>
                <button class="btn-delete" onclick="deleteColecao('${c.id}')">Excluir</button>
            </div>
        </div>`).join('');
}

document.getElementById('btnNovaColecao').addEventListener('click', () => openModalColecao());

async function openModalColecao(id = null) {
    const modal = document.getElementById('modalColecao');
    const title = document.getElementById('modalColecaoTitle');
    const form  = document.getElementById('formColecao');
    if (id) {
        const c = (await getColecoes()).find(x => String(x.id) === String(id));
        if (!c) return;
        title.textContent = 'Editar Coleção';
        document.getElementById('colecaoId').value        = c.id;
        document.getElementById('colecaoNome').value      = c.nome;
        document.getElementById('colecaoDescricao').value = c.descricao || '';
        document.getElementById('colecaoImagem').value    = c.imagem || '';
    } else {
        title.textContent = 'Nova Coleção';
        form.reset();
        document.getElementById('colecaoId').value = '';
    }
    modal.classList.add('open');
}

document.getElementById('formColecao').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('colecaoId').value;
    const data = {
        nome:      document.getElementById('colecaoNome').value.trim(),
        descricao: document.getElementById('colecaoDescricao').value.trim(),
        imagem:    document.getElementById('colecaoImagem').value.trim(),
    };
    if (id) { await fsUpdate('colecoes', id, data); showToast('Coleção atualizada!', 'gold'); }
    else    { await fsAdd('colecoes', data);          showToast('Coleção adicionada!', 'gold'); }
    _cache.colecoes = null;
    closeModal('modalColecao');
    await renderColecoes();
    await renderDashboard();
});

function editColecao(id) { openModalColecao(id); }
async function deleteColecao(id) {
    if (!confirm('Excluir esta coleção?')) return;
    await fsDelete('colecoes', id);
    _cache.colecoes = null;
    await renderColecoes();
    await renderDashboard();
    showToast('Coleção excluída.');
}

// ---- DEPOIMENTOS ----
async function renderDepoimentos() {
    const deps  = await getDepoimentos();
    const grid  = document.getElementById('depoimentosGrid');
    const empty = document.getElementById('depoimentosEmpty');
    if (!deps.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = deps.map(d => `
        <div class="testimonial-admin-card">
            <div class="stars">${'★'.repeat(d.estrelas || 5)}</div>
            <p>"${d.texto}"</p>
            <h4>${d.nome}</h4>
            <div class="card-actions">
                <button class="btn-edit" onclick="editDepoimento('${d.id}')">Editar</button>
                <button class="btn-delete" onclick="deleteDepoimento('${d.id}')">Excluir</button>
            </div>
        </div>`).join('');
}

document.getElementById('btnNovoDepoimento').addEventListener('click', () => openModalDepoimento());

async function openModalDepoimento(id = null) {
    const modal = document.getElementById('modalDepoimento');
    const title = document.getElementById('modalDepoimentoTitle');
    const form  = document.getElementById('formDepoimento');
    if (id) {
        const d = (await getDepoimentos()).find(x => x.id === id);
        if (!d) return;
        title.textContent = 'Editar Depoimento';
        document.getElementById('depoimentoId').value       = d.id;
        document.getElementById('depoimentoNome').value     = d.nome;
        document.getElementById('depoimentoTexto').value    = d.texto;
        document.getElementById('depoimentoEstrelas').value = d.estrelas || 5;
    } else {
        title.textContent = 'Novo Depoimento';
        form.reset();
        document.getElementById('depoimentoId').value = '';
    }
    modal.classList.add('open');
}

document.getElementById('formDepoimento').addEventListener('submit', async e => {
    e.preventDefault();
    const id   = document.getElementById('depoimentoId').value;
    const data = {
        nome:     document.getElementById('depoimentoNome').value.trim(),
        texto:    document.getElementById('depoimentoTexto').value.trim(),
        estrelas: parseInt(document.getElementById('depoimentoEstrelas').value),
    };
    if (id) { await fsUpdate('depoimentos', id, data); showToast('Depoimento atualizado!', 'gold'); }
    else    { await fsAdd('depoimentos', data);          showToast('Depoimento adicionado!', 'gold'); }
    _cache.depoimentos = null;
    closeModal('modalDepoimento');
    await renderDepoimentos();
    await renderDashboard();
});

function editDepoimento(id) { openModalDepoimento(id); }
async function deleteDepoimento(id) {
    if (!confirm('Excluir este depoimento?')) return;
    await fsDelete('depoimentos', id);
    _cache.depoimentos = null;
    await renderDepoimentos();
    await renderDashboard();
    showToast('Depoimento excluído.');
}

// ---- CONFIGURAÇÕES ----
async function renderConfiguracoes() {
    const cfg = await fsGetConfig() || {};
    document.getElementById('cfgNomeLoja').value      = cfg.nomeLoja      || 'JB Acessórios';
    document.getElementById('cfgWhatsapp').value      = cfg.whatsapp      || '5543991864750';
    document.getElementById('cfgInstagram').value     = cfg.instagram     || '@jbacessorios_jb';
    document.getElementById('cfgEndereco').value      = cfg.endereco      || 'Ribeirão Claro - PR';
    document.getElementById('cfgTelefone').value      = cfg.telefone      || '(43) 99186-4750';
    document.getElementById('cfgHeroTag').value       = cfg.heroTag       || 'SEMIJOIAS PREMIUM E PRATA 925';
    document.getElementById('cfgHeroTitulo').value    = cfg.heroTitulo    || 'Sua beleza merece brilho em cada *detalhe*';
    document.getElementById('cfgHeroSubtitulo').value = cfg.heroSubtitulo || 'Semijoias selecionadas para mulheres que valorizam estilo, qualidade e sofisticação.';
}

document.getElementById('configLojaForm').addEventListener('submit', async e => {
    e.preventDefault();
    await fsSetConfig({
        nomeLoja:  document.getElementById('cfgNomeLoja').value.trim(),
        whatsapp:  document.getElementById('cfgWhatsapp').value.trim(),
        instagram: document.getElementById('cfgInstagram').value.trim(),
        endereco:  document.getElementById('cfgEndereco').value.trim(),
        telefone:  document.getElementById('cfgTelefone').value.trim(),
    });
    showToast('Configurações salvas!', 'gold');
});

document.getElementById('configHeroForm').addEventListener('submit', async e => {
    e.preventDefault();
    await fsSetConfig({
        heroTag:       document.getElementById('cfgHeroTag').value.trim(),
        heroTitulo:    document.getElementById('cfgHeroTitulo').value.trim(),
        heroSubtitulo: document.getElementById('cfgHeroSubtitulo').value.trim(),
    });
    showToast('Hero section salva!', 'gold');
});

document.getElementById('configSenhaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nova = document.getElementById('cfgNovaSenha').value;
    const conf = document.getElementById('cfgConfSenha').value;
    const msg  = document.getElementById('senhaMsg');
    if (nova.length < 6) { msg.textContent = 'A senha deve ter ao menos 6 caracteres.'; msg.className = 'form-msg error'; return; }
    if (nova !== conf)   { msg.textContent = 'As senhas não coincidem.';                msg.className = 'form-msg error'; return; }
    try {
        await auth.currentUser.updatePassword(nova);
        msg.textContent = 'Senha alterada com sucesso!';
        msg.className = 'form-msg success';
        document.getElementById('configSenhaForm').reset();
        setTimeout(() => { msg.className = 'form-msg'; }, 3000);
    } catch {
        msg.textContent = 'Erro ao alterar senha. Faça login novamente.';
        msg.className = 'form-msg error';
    }
});

// ---- MODALS ----
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-close, .btn-secondary[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
});

// ---- TOAST ----
function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className   = 'toast show' + (type ? ' ' + type : '');
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ---- INIT ----
async function initAdmin() {
    navigateTo('dashboard');
}
