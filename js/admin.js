/* ========================================
   JB Acessórios - Admin Panel JS (Firebase)
   ======================================== */

// ---- FIRESTORE HELPERS ----
async function fsGetAll(colecao) {
    try {
        const snap = await db.collection(colecao).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error(`[Firestore] Erro ao buscar ${colecao}:`, e);
        return [];
    }
}

async function fsAdd(colecao, data) {
    const ref = await db.collection(colecao).add({ ...data, criadoEm: Date.now() });
    return { id: ref.id, ...data };
}

async function fsUpdate(colecao, id, data) {
    await db.collection(colecao).doc(id).update({ ...data, atualizadoEm: Date.now() });
}

async function fsDelete(colecao, id) {
    await db.collection(colecao).doc(id).delete();
}

async function fsGetConfig() {
    try {
        const doc = await db.collection('config').doc('site').get();
        return doc.exists ? doc.data() : {};
    } catch { return {}; }
}

async function fsSetConfig(data) {
    await db.collection('config').doc('site').set(data, { merge: true });
}

// ---- CACHE ----
let _cache = { produtos: null, colecoes: null, depoimentos: null };
function clearCache(key) { if (key) _cache[key] = null; else _cache = { produtos: null, colecoes: null, depoimentos: null }; }

async function getProdutos()    { if (!_cache.produtos)    _cache.produtos    = await fsGetAll('produtos');    return _cache.produtos    || []; }
async function getColecoes()    { if (!_cache.colecoes)    _cache.colecoes    = await fsGetAll('colecoes');    return _cache.colecoes    || []; }
async function getDepoimentos() { if (!_cache.depoimentos) _cache.depoimentos = await fsGetAll('depoimentos'); return _cache.depoimentos || []; }

// ---- UI HELPERS ----
function setBtnLoading(btn, loading, label) {
    btn.disabled    = loading;
    btn.textContent = loading ? 'Salvando...' : label;
}

// ---- FIREBASE STORAGE UPLOAD ----
async function uploadImagem(file) {
    const ext  = file.name.split('.').pop().toLowerCase();
    const nome = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const ref  = storage.ref(`produtos/${nome}`);

    const progress = document.getElementById('imgUploadProgress');
    const bar      = document.getElementById('imgProgressBar');
    const text     = document.getElementById('imgProgressText');
    if (progress) progress.style.display = 'flex';

    return new Promise((resolve, reject) => {
        const task    = ref.put(file);
        const timeout = setTimeout(() => {
            task.cancel();
            if (progress) progress.style.display = 'none';
            if (bar) bar.style.width = '0';
            reject(new Error('timeout'));
        }, 20000);

        task.on('state_changed',
            snap => {
                const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                if (bar)  bar.style.width  = pct + '%';
                if (text) text.textContent = `Enviando ${pct}%...`;
            },
            err => {
                clearTimeout(timeout);
                if (progress) progress.style.display = 'none';
                if (bar) bar.style.width = '0';
                reject(err);
            },
            async () => {
                clearTimeout(timeout);
                const url = await task.snapshot.ref.getDownloadURL();
                if (progress) progress.style.display = 'none';
                if (bar) bar.style.width = '0';
                resolve(url);
            }
        );
    });
}

// ---- LOGIN ----
const loginForm   = document.getElementById('loginForm');
const loginError  = document.getElementById('loginError');
const loginScreen = document.getElementById('loginScreen');
const adminLayout = document.getElementById('adminLayout');

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn     = loginForm.querySelector('[type=submit]');
    const usuario = document.getElementById('loginUser').value.trim();
    const senha   = document.getElementById('loginPass').value;
    const email   = usuario.includes('@') ? usuario : ADMIN_EMAIL;
    btn.disabled    = true;
    btn.textContent = 'Entrando...';
    loginError.classList.remove('show');
    try {
        await auth.signInWithEmailAndPassword(email, senha);
    } catch (err) {
        let msg = 'Usuário ou senha incorretos.';
        if (err.code === 'auth/too-many-requests')       msg = 'Muitas tentativas. Aguarde um momento.';
        if (err.code === 'auth/network-request-failed')  msg = 'Sem conexão. Verifique sua internet.';
        loginError.textContent = msg;
        loginError.classList.add('show');
        btn.disabled    = false;
        btn.textContent = 'ENTRAR';
    }
});

function forceLogout() {
    adminLayout.style.display = 'none';
    loginScreen.style.display = 'flex';
    const btn = loginForm.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.textContent = 'ENTRAR'; }
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

document.getElementById('btnLogout').addEventListener('click', async () => { await auth.signOut(); });

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
const labels     = { dashboard:'Dashboard', produtos:'Produtos', colecoes:'Coleções', depoimentos:'Depoimentos', configuracoes:'Configurações' };

function navigateTo(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    if (nav) nav.classList.add('active');
    breadcrumb.textContent = labels[pageId] || pageId;
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
            }, 60);
        }
    }
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ---- DASHBOARD ----
async function renderDashboard() {
    const [produtos, colecoes, depoimentos] = await Promise.all([getProdutos(), getColecoes(), getDepoimentos()]);
    document.getElementById('statProdutos').textContent    = produtos.filter(p => p.status !== 'inativo').length;
    document.getElementById('statColecoes').textContent    = colecoes.length;
    document.getElementById('statDepoimentos').textContent = depoimentos.length;
    document.getElementById('statContatos').textContent    = '—';
    const tbody = document.querySelector('#dashProdutosTable tbody');
    const last5 = [...produtos].reverse().slice(0, 5);
    tbody.innerHTML = last5.length
        ? last5.map(p => `
            <tr>
                <td><strong>${p.nome}</strong></td>
                <td>${p.preco}</td>
                <td>${p.colecao || '—'}</td>
                <td><span class="status-badge ${p.status === 'ativo' ? 'ativo' : 'inativo'}">${p.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
            </tr>`).join('')
        : '<tr><td colspan="4" style="color:#aaa;text-align:center;padding:20px">Sem produtos cadastrados</td></tr>';
}

// ---- PRODUTOS ----
let _produtosFiltro = '';

async function renderProdutos(filter) {
    if (filter !== undefined) _produtosFiltro = filter;
    const tbody = document.getElementById('produtosBody');
    const empty = document.getElementById('produtosEmpty');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando produtos...</td></tr>';
    empty.style.display = 'none';
    const todos    = await getProdutos();
    const produtos = todos.filter(p => !_produtosFiltro || p.nome.toLowerCase().includes(_produtosFiltro.toLowerCase()));
    if (!produtos.length) {
        tbody.innerHTML = '';
        empty.textContent = _produtosFiltro ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto cadastrado ainda.';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    tbody.innerHTML = produtos.map(p => `
        <tr>
            <td>
                ${p.imagem ? `<img src="${p.imagem}" class="img-thumb" onerror="this.style.display='none'" alt="">` : ''}
                <strong>${p.nome}</strong>
            </td>
            <td>${p.colecao || '—'}</td>
            <td>${p.preco}</td>
            <td>${p.descricao ? p.descricao.slice(0, 45) + '…' : '—'}</td>
            <td><span class="status-badge ${p.status === 'ativo' ? 'ativo' : 'inativo'}">${p.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit"   onclick="editProduto('${p.id}')">Editar</button>
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
    if (cols.length) {
        select.innerHTML = '<option value="">Selecione...</option>' + cols.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    } else {
        select.innerHTML = '<option value="">(nenhuma coleção cadastrada)</option>';
    }
    if (id) {
        const p = (await getProdutos()).find(x => x.id === id);
        if (!p) return;
        title.textContent = 'Editar Produto';
        document.getElementById('produtoId').value        = p.id;
        document.getElementById('produtoNome').value      = p.nome;
        document.getElementById('produtoPreco').value     = p.preco;
        document.getElementById('produtoDescricao').value = p.descricao || '';
        document.getElementById('produtoImagem').value     = p.imagem || '';
        document.getElementById('produtoStatus').value     = p.status || 'ativo';
        document.getElementById('produtoImagemFile').value = '';
        select.value = p.colecao || '';
        updateImagePreview(p.imagem || '');
    } else {
        title.textContent = 'Novo Produto';
        form.reset();
        document.getElementById('produtoId').value    = '';
        document.getElementById('produtoImagem').value = '';
        document.getElementById('produtoImagemFile').value = '';
        document.getElementById('produtoImagemUrl').value  = '';
        updateImagePreview('');
    }
    document.getElementById('urlFallbackGroup').style.display = 'none';
    modal.classList.add('open');
}

function updateImagePreview(url) {
    const prev        = document.getElementById('produtoImagemPreview');
    const placeholder = document.getElementById('imgUploadPlaceholder');
    if (!prev) return;
    if (url && url.trim()) {
        prev.src              = url.trim();
        prev.style.display    = 'block';
        if (placeholder) placeholder.style.display = 'none';
        prev.onerror = () => {
            prev.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        };
    } else {
        prev.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }
}

document.getElementById('imgUploadArea').addEventListener('click', () => {
    document.getElementById('produtoImagemFile').click();
});

document.getElementById('produtoImagemFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('Imagem muito grande. Use até 5MB.');
        e.target.value = '';
        return;
    }
    document.getElementById('produtoImagemUrl').value = '';
    const reader = new FileReader();
    reader.onload = ev => updateImagePreview(ev.target.result);
    reader.readAsDataURL(file);
});

document.getElementById('btnToggleUrl').addEventListener('click', () => {
    const group = document.getElementById('urlFallbackGroup');
    group.style.display = group.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('produtoImagemUrl').addEventListener('input', e => {
    const url = e.target.value.trim();
    document.getElementById('produtoImagem').value = url;
    document.getElementById('produtoImagemFile').value = '';
    updateImagePreview(url);
});

document.getElementById('formProduto').addEventListener('submit', async e => {
    e.preventDefault();
    const btn       = e.target.querySelector('[type=submit]');
    const id        = document.getElementById('produtoId').value;
    const fileInput = document.getElementById('produtoImagemFile');
    btn.disabled = true;
    try {
        let imagemUrl = document.getElementById('produtoImagem').value.trim()
                     || document.getElementById('produtoImagemUrl').value.trim();

        if (fileInput.files[0]) {
            btn.textContent = 'Enviando imagem...';
            try {
                imagemUrl = await uploadImagem(fileInput.files[0]);
            } catch (uploadErr) {
                console.error('Upload falhou:', uploadErr);
                setBtnLoading(btn, false, 'Salvar Produto');
                document.getElementById('urlFallbackGroup').style.display = 'block';
                showToast('Upload falhou. Ative o Firebase Storage ou cole uma URL abaixo.');
                return;
            }
        }

        btn.textContent = 'Salvando...';
        const data = {
            nome:      document.getElementById('produtoNome').value.trim(),
            preco:     document.getElementById('produtoPreco').value.trim(),
            colecao:   document.getElementById('produtoColecao').value,
            descricao: document.getElementById('produtoDescricao').value.trim(),
            imagem:    imagemUrl,
            status:    document.getElementById('produtoStatus').value,
        };
        if (id) { await fsUpdate('produtos', id, data); showToast('Produto atualizado!', 'gold'); }
        else    { await fsAdd('produtos', data);         showToast('Produto adicionado!', 'gold'); }
        clearCache('produtos');
        closeModal('modalProduto');
        await renderProdutos();
        await renderDashboard();
    } catch (err) {
        console.error(err);
        showToast('Erro ao salvar produto. Verifique a conexão.');
    } finally {
        setBtnLoading(btn, false, 'Salvar Produto');
    }
});

function editProduto(id) { openModalProduto(id); }

async function deleteProduto(id) {
    if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return;
    try {
        await fsDelete('produtos', id);
        clearCache('produtos');
        await renderProdutos();
        await renderDashboard();
        showToast('Produto excluído.');
    } catch {
        showToast('Erro ao excluir produto.');
    }
}

// ---- COLEÇÕES ----
async function renderColecoes() {
    const grid  = document.getElementById('colecoesGrid');
    const empty = document.getElementById('colecoesEmpty');
    grid.innerHTML = '<p class="loading-row">Carregando...</p>';
    empty.style.display = 'none';
    const colecoes = await getColecoes();
    if (!colecoes.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = colecoes.map(c => `
        <div class="collection-admin-card">
            ${c.imagem ? `<img src="${c.imagem}" class="col-thumb" onerror="this.style.display='none'" alt="">` : ''}
            <h4>${c.nome}</h4>
            <p>${c.descricao || 'Sem descrição'}</p>
            <div class="card-actions">
                <button class="btn-edit"   onclick="editColecao('${c.id}')">Editar</button>
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
        document.getElementById('colecaoImagem').value     = c.imagem || '';
        document.getElementById('colecaoImagemFile').value = '';
        document.getElementById('colecaoImagemUrl').value  = '';
        updateImagePreviewColecao(c.imagem || '');
    } else {
        title.textContent = 'Nova Coleção';
        form.reset();
        document.getElementById('colecaoId').value    = '';
        document.getElementById('colecaoImagem').value = '';
        document.getElementById('colecaoImagemFile').value = '';
        document.getElementById('colecaoImagemUrl').value  = '';
        updateImagePreviewColecao('');
    }
    document.getElementById('urlFallbackGroupColecao').style.display = 'none';
    modal.classList.add('open');
}

function updateImagePreviewColecao(url) {
    const prev        = document.getElementById('colecaoImagemPreview');
    const placeholder = document.getElementById('imgUploadPlaceholderColecao');
    if (!prev) return;
    if (url && url.trim()) {
        prev.src              = url.trim();
        prev.style.display    = 'block';
        if (placeholder) placeholder.style.display = 'none';
        prev.onerror = () => {
            prev.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
        };
    } else {
        prev.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    }
}

document.getElementById('imgUploadAreaColecao').addEventListener('click', () => {
    document.getElementById('colecaoImagemFile').click();
});

document.getElementById('colecaoImagemFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast('Imagem muito grande. Use até 5MB.');
        e.target.value = '';
        return;
    }
    document.getElementById('colecaoImagemUrl').value = '';
    const reader = new FileReader();
    reader.onload = ev => updateImagePreviewColecao(ev.target.result);
    reader.readAsDataURL(file);
});

document.getElementById('btnToggleUrlColecao').addEventListener('click', () => {
    const group = document.getElementById('urlFallbackGroupColecao');
    group.style.display = group.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('colecaoImagemUrl').addEventListener('input', e => {
    const url = e.target.value.trim();
    document.getElementById('colecaoImagem').value = url;
    document.getElementById('colecaoImagemFile').value = '';
    updateImagePreviewColecao(url);
});

document.getElementById('formColecao').addEventListener('submit', async e => {
    e.preventDefault();
    const btn       = e.target.querySelector('[type=submit]');
    const id        = document.getElementById('colecaoId').value;
    const fileInput = document.getElementById('colecaoImagemFile');
    btn.disabled = true;
    try {
        let imagemUrl = document.getElementById('colecaoImagem').value.trim()
                     || document.getElementById('colecaoImagemUrl').value.trim();

        if (fileInput.files[0]) {
            btn.textContent = 'Enviando imagem...';
            try {
                imagemUrl = await uploadImagem(fileInput.files[0]);
            } catch (uploadErr) {
                console.error('Upload falhou:', uploadErr);
                setBtnLoading(btn, false, 'Salvar Coleção');
                document.getElementById('urlFallbackGroupColecao').style.display = 'block';
                showToast('Upload falhou. Ative o Firebase Storage ou cole uma URL abaixo.');
                return;
            }
        }

        btn.textContent = 'Salvando...';
        const data = {
            nome:      document.getElementById('colecaoNome').value.trim(),
            descricao: document.getElementById('colecaoDescricao').value.trim(),
            imagem:    imagemUrl,
        };
        if (id) { await fsUpdate('colecoes', id, data); showToast('Coleção atualizada!', 'gold'); }
        else    { await fsAdd('colecoes', data);         showToast('Coleção adicionada!', 'gold'); }
        clearCache('colecoes');
        closeModal('modalColecao');
        await renderColecoes();
        await renderDashboard();
    } catch {
        showToast('Erro ao salvar coleção. Verifique a conexão.');
    } finally {
        setBtnLoading(btn, false, 'Salvar Coleção');
    }
});

function editColecao(id) { openModalColecao(id); }

async function deleteColecao(id) {
    if (!confirm('Excluir esta coleção?')) return;
    try {
        await fsDelete('colecoes', id);
        clearCache('colecoes');
        await renderColecoes();
        await renderDashboard();
        showToast('Coleção excluída.');
    } catch {
        showToast('Erro ao excluir coleção.');
    }
}

// ---- DEPOIMENTOS ----
async function renderDepoimentos() {
    const grid  = document.getElementById('depoimentosGrid');
    const empty = document.getElementById('depoimentosEmpty');
    grid.innerHTML = '<p class="loading-row">Carregando...</p>';
    empty.style.display = 'none';
    const deps = await getDepoimentos();
    if (!deps.length) { grid.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    grid.innerHTML = deps.map(d => `
        <div class="testimonial-admin-card">
            <div class="stars">${'★'.repeat(d.estrelas || 5)}${'☆'.repeat(5 - (d.estrelas || 5))}</div>
            <p>"${d.texto}"</p>
            <h4>${d.nome}</h4>
            <div class="card-actions">
                <button class="btn-edit"   onclick="editDepoimento('${d.id}')">Editar</button>
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
    const btn = e.target.querySelector('[type=submit]');
    const id  = document.getElementById('depoimentoId').value;
    const data = {
        nome:     document.getElementById('depoimentoNome').value.trim(),
        texto:    document.getElementById('depoimentoTexto').value.trim(),
        estrelas: parseInt(document.getElementById('depoimentoEstrelas').value),
    };
    setBtnLoading(btn, true, 'Salvar Depoimento');
    try {
        if (id) { await fsUpdate('depoimentos', id, data); showToast('Depoimento atualizado!', 'gold'); }
        else    { await fsAdd('depoimentos', data);         showToast('Depoimento adicionado!', 'gold'); }
        clearCache('depoimentos');
        closeModal('modalDepoimento');
        await renderDepoimentos();
        await renderDashboard();
    } catch {
        showToast('Erro ao salvar depoimento. Verifique a conexão.');
    } finally {
        setBtnLoading(btn, false, 'Salvar Depoimento');
    }
});

function editDepoimento(id) { openModalDepoimento(id); }

async function deleteDepoimento(id) {
    if (!confirm('Excluir este depoimento?')) return;
    try {
        await fsDelete('depoimentos', id);
        clearCache('depoimentos');
        await renderDepoimentos();
        await renderDashboard();
        showToast('Depoimento excluído.');
    } catch {
        showToast('Erro ao excluir depoimento.');
    }
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
    const btn = e.target.querySelector('[type=submit]');
    setBtnLoading(btn, true, 'Salvar Configurações');
    try {
        await fsSetConfig({
            nomeLoja:  document.getElementById('cfgNomeLoja').value.trim(),
            whatsapp:  document.getElementById('cfgWhatsapp').value.trim(),
            instagram: document.getElementById('cfgInstagram').value.trim(),
            endereco:  document.getElementById('cfgEndereco').value.trim(),
            telefone:  document.getElementById('cfgTelefone').value.trim(),
        });
        showToast('Configurações salvas!', 'gold');
    } catch { showToast('Erro ao salvar configurações.'); }
    finally  { setBtnLoading(btn, false, 'Salvar Configurações'); }
});

document.getElementById('configHeroForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    setBtnLoading(btn, true, 'Salvar Hero');
    try {
        await fsSetConfig({
            heroTag:       document.getElementById('cfgHeroTag').value.trim(),
            heroTitulo:    document.getElementById('cfgHeroTitulo').value.trim(),
            heroSubtitulo: document.getElementById('cfgHeroSubtitulo').value.trim(),
        });
        showToast('Hero section salva!', 'gold');
    } catch { showToast('Erro ao salvar hero.'); }
    finally  { setBtnLoading(btn, false, 'Salvar Hero'); }
});

document.getElementById('configSenhaForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nova = document.getElementById('cfgNovaSenha').value;
    const conf = document.getElementById('cfgConfSenha').value;
    const msg  = document.getElementById('senhaMsg');
    if (nova.length < 6) { msg.textContent = 'A senha deve ter ao menos 6 caracteres.'; msg.className = 'form-msg error'; return; }
    if (nova !== conf)   { msg.textContent = 'As senhas não coincidem.';                msg.className = 'form-msg error'; return; }
    const btn = e.target.querySelector('[type=submit]');
    setBtnLoading(btn, true, 'Alterar Senha');
    try {
        await auth.currentUser.updatePassword(nova);
        msg.textContent = 'Senha alterada com sucesso!';
        msg.className   = 'form-msg success';
        document.getElementById('configSenhaForm').reset();
        setTimeout(() => { msg.className = 'form-msg'; }, 3000);
    } catch {
        msg.textContent = 'Erro ao alterar senha. Faça login novamente.';
        msg.className   = 'form-msg error';
    } finally {
        setBtnLoading(btn, false, 'Alterar Senha');
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
    setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ---- INIT ----
async function initAdmin() {
    navigateTo('dashboard');
}
