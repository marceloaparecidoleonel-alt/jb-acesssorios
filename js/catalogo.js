/* ========================================
   JB Acessórios - Catálogo Page JS
   ======================================== */

const WA_NUMBER = '5543991864750';

// ---- PRODUTOS PADRÃO (fallback) ----
const PRODUTOS_DEFAULT = [];

// ---- STATE ----
let filtroAtivo = 'todos';
let buscaAtiva  = '';
let todosProdutos = [];
let todasColecoes = [];

// ---- INIT ----
async function init() {
    mostrarSkeleton();
    [todosProdutos, todasColecoes] = await Promise.all([carregarProdutos(), carregarColecoes()]);
    renderFiltros();
    verificarURL();
    renderProdutos();
}

async function carregarProdutos() {
    try {
        if (typeof db !== 'undefined') {
            const snap = await db.collection('produtos')
                .where('status', '!=', 'inativo')
                .get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        }
    } catch { /* fallback */ }
    return PRODUTOS_DEFAULT;
}

async function carregarColecoes() {
    try {
        if (typeof db !== 'undefined') {
            const snap = await db.collection('colecoes').get();
            if (!snap.empty) {
                return snap.docs.map(d => d.data().nome);
            }
        }
    } catch { /* fallback */ }
    return ['Brincos', 'Colares', 'Pulseiras', 'Anéis', 'Conjuntos'];
}

// ---- SKELETON ----
function mostrarSkeleton() {
    const grid = document.getElementById('catalogGrid');
    grid.innerHTML = Array(8).fill('').map(() => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line w40"></div>
                <div class="skeleton-line w80"></div>
                <div class="skeleton-line w60"></div>
            </div>
        </div>`).join('');
}

// ---- FILTROS ----
function renderFiltros() {
    const colecoes   = todasColecoes.length ? todasColecoes : [...new Set(todosProdutos.map(p => p.colecao).filter(Boolean))];
    const container  = document.getElementById('catalogFilters');
    const todosBtn   = `<button class="filter-btn active" data-filter="todos" onclick="setFiltro('todos', this)">Todos</button>`;
    const botoesCol  = colecoes.map(c =>
        `<button class="filter-btn" data-filter="${c}" onclick="setFiltro('${c}', this)">${c}</button>`
    ).join('');
    container.innerHTML = todosBtn + botoesCol;
}

function setFiltro(filtro, btn) {
    filtroAtivo = filtro;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderProdutos();
}

// ---- URL PARAM ----
function verificarURL() {
    const params  = new URLSearchParams(window.location.search);
    const colecao = params.get('colecao');
    if (colecao) {
        filtroAtivo = colecao;
        const btn = document.querySelector(`[data-filter="${colecao}"]`);
        if (btn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    }
}

// ---- RENDER ----
function renderProdutos() {
    const grid  = document.getElementById('catalogGrid');
    const empty = document.getElementById('catalogEmpty');
    const count = document.getElementById('catalogCount');

    let filtrados = todosProdutos;

    if (filtroAtivo !== 'todos') {
        filtrados = filtrados.filter(p => p.colecao === filtroAtivo);
    }

    if (buscaAtiva.trim()) {
        const q = buscaAtiva.toLowerCase();
        filtrados = filtrados.filter(p =>
            p.nome.toLowerCase().includes(q) ||
            (p.descricao && p.descricao.toLowerCase().includes(q)) ||
            (p.colecao && p.colecao.toLowerCase().includes(q))
        );
    }

    count.textContent = `${filtrados.length} produto${filtrados.length !== 1 ? 's' : ''}`;

    if (!filtrados.length) {
        grid.innerHTML = '';
        empty.style.display  = 'block';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = filtrados.map((p, i) => criarCard(p, i)).join('');
}

function criarCard(p, index) {
    const imagem   = p.imagem || 'assets/img/product-01.svg';
    const msg      = encodeURIComponent(`Olá! Vi o produto *${p.nome}* (${p.preco}) no catálogo da JB Acessórios e tenho interesse. Pode me ajudar?`);
    const waLink   = `https://wa.me/${WA_NUMBER}?text=${msg}`;
    const delay    = (index % 8) * 0.05;

    return `
        <article class="cat-product-card" style="animation-delay:${delay}s">
            <div class="cat-product-image">
                <img src="${imagem}" alt="${p.nome}" loading="lazy" onerror="this.src='assets/img/product-01.svg'">
                ${p.colecao ? `<span class="cat-product-badge">${p.colecao}</span>` : ''}
            </div>
            <div class="cat-product-info">
                ${p.colecao ? `<span class="cat-product-collection">${p.colecao}</span>` : ''}
                <h3 class="cat-product-name">${p.nome}</h3>
                <p class="cat-product-desc">${p.descricao || ''}</p>
                <div class="cat-product-footer">
                    <span class="cat-product-price">${p.preco}</span>
                    <a href="${waLink}" class="cat-product-btn" target="_blank" rel="noopener">Tenho Interesse</a>
                </div>
            </div>
        </article>`;
}

// ---- SEARCH ----
document.getElementById('catalogSearch').addEventListener('input', e => {
    buscaAtiva = e.target.value;
    renderProdutos();
});

// ---- RESET ----
function resetFiltros() {
    buscaAtiva  = '';
    filtroAtivo = 'todos';
    document.getElementById('catalogSearch').value = '';
    document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    renderProdutos();
}

// ---- START ----
init();
