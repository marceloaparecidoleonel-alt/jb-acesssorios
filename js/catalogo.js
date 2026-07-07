/* ========================================
   JB Acessórios - Catálogo Page JS
   ======================================== */

const WA_NUMBER = '554399186475';

// ---- PRODUTOS PADRÃO (fallback) ----
const PRODUTOS_DEFAULT = [
    { id: 'p1', nome: 'Brinco Aurora Dourado',    preco: 'R$ 89,90',  colecao: 'Brincos',    descricao: 'Brinco delicado com acabamento dourado.',    imagem: 'assets/img/product-01.svg', status: 'ativo' },
    { id: 'p2', nome: 'Colar Lumière Prata 925',  preco: 'R$ 149,90', colecao: 'Colares',    descricao: 'Colar em prata 925 com pingente refinado.',   imagem: 'assets/img/product-02.svg', status: 'ativo' },
    { id: 'p3', nome: 'Pulseira Elegance Gold',   preco: 'R$ 129,90', colecao: 'Pulseiras',  descricao: 'Pulseira banhada a ouro 18k, ajustável.',      imagem: 'assets/img/product-03.svg', status: 'ativo' },
    { id: 'p4', nome: 'Anel Essenza Cristal',     preco: 'R$ 119,90', colecao: 'Anéis',      descricao: 'Traços delicados com presença luminosa.',      imagem: 'assets/img/product-04.svg', status: 'ativo' },
    { id: 'p5', nome: 'Conjunto Serenity',        preco: 'R$ 249,90', colecao: 'Conjuntos',  descricao: 'Conjunto brinco + colar com pedras naturais.', imagem: 'assets/img/product-05.svg', status: 'ativo' },
    { id: 'p6', nome: 'Brinco Perola Clássica',   preco: 'R$ 79,90',  colecao: 'Brincos',    descricao: 'Brinco com pérola sintética e base prateada.', imagem: 'assets/img/product-06.svg', status: 'ativo' },
    { id: 'p7', nome: 'Colar Infinity Prata',     preco: 'R$ 139,90', colecao: 'Colares',    descricao: 'Símbolo infinito em prata 925 pura.',          imagem: 'assets/img/product-07.svg', status: 'ativo' },
    { id: 'p8', nome: 'Pulseira Charm Rosé',      preco: 'R$ 99,90',  colecao: 'Pulseiras',  descricao: 'Pulseira rosé com detalhes em zircônia.',      imagem: 'assets/img/product-08.svg', status: 'ativo' },
];

// ---- STATE ----
let filtroAtivo = 'todos';
let buscaAtiva  = '';
let todosProdutos = [];

// ---- INIT ----
async function init() {
    mostrarSkeleton();
    todosProdutos = await carregarProdutos();
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
    const colecoes   = [...new Set(todosProdutos.map(p => p.colecao).filter(Boolean))];
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
