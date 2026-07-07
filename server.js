const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = 3000;

// ---- SETUP ----
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ---- SESSIONS (in-memory) ----
const sessions = new Map();

// ---- FILE HELPERS ----
function readData(file) {
    const fp = path.join(DATA_DIR, file);
    if (!fs.existsSync(fp)) return null;
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch { return null; }
}

function writeData(file, data) {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
}

function genId() {
    return crypto.randomBytes(12).toString('hex');
}

// ---- DEFAULT DATA (criada na primeira execução) ----
function initDefaultData() {
    if (!readData('config.json')) {
        writeData('config.json', {
            adminSenha: 'jb2026',
            nomeLoja:   'JB Acessórios',
            whatsapp:   '554399186475',
            instagram:  '@jbacessorios_jb',
            endereco:   'Ribeirão Claro - PR',
            telefone:   '(43) 99186-4750',
            heroTag:    'SEMIJOIAS PREMIUM E PRATA 925',
            heroTitulo: 'Sua beleza merece brilho em cada *detalhe*',
            heroSubtitulo: 'Semijoias selecionadas para mulheres que valorizam estilo, qualidade e sofisticação.'
        });
    }

    if (!readData('colecoes.json')) {
        writeData('colecoes.json', [
            { id: 1, nome: 'Brincos',    descricao: 'Brincos delicados e sofisticados', imagem: '' },
            { id: 2, nome: 'Colares',    descricao: 'Colares em prata e semijoia',      imagem: '' },
            { id: 3, nome: 'Pulseiras',  descricao: 'Pulseiras banhadas e ajustáveis',  imagem: '' },
            { id: 4, nome: 'Anéis',      descricao: 'Anéis elegantes e modernos',       imagem: '' },
            { id: 5, nome: 'Conjuntos',  descricao: 'Conjuntos completos com curadoria',imagem: '' }
        ]);
    }

    if (!readData('produtos.json')) {
        writeData('produtos.json', [
            { id: genId(), nome: 'Brinco Aurora Dourado',   preco: 'R$ 89,90',  colecao: 'Brincos',   descricao: 'Brinco delicado com acabamento dourado.',    imagem: 'assets/img/product-01.svg', status: 'ativo' },
            { id: genId(), nome: 'Colar Lumière Prata 925', preco: 'R$ 149,90', colecao: 'Colares',   descricao: 'Colar em prata 925 com pingente refinado.',   imagem: 'assets/img/product-02.svg', status: 'ativo' },
            { id: genId(), nome: 'Pulseira Elegance Gold',  preco: 'R$ 129,90', colecao: 'Pulseiras', descricao: 'Pulseira banhada a ouro 18k, ajustável.',      imagem: 'assets/img/product-03.svg', status: 'ativo' },
            { id: genId(), nome: 'Anel Essenza Cristal',    preco: 'R$ 119,90', colecao: 'Anéis',     descricao: 'Traços delicados com presença luminosa.',      imagem: 'assets/img/product-04.svg', status: 'ativo' },
            { id: genId(), nome: 'Conjunto Serenity',       preco: 'R$ 249,90', colecao: 'Conjuntos', descricao: 'Conjunto brinco + colar com pedras naturais.', imagem: 'assets/img/product-05.svg', status: 'ativo' },
            { id: genId(), nome: 'Brinco Pérola Clássica',  preco: 'R$ 79,90',  colecao: 'Brincos',   descricao: 'Brinco com pérola sintética e base prateada.',imagem: 'assets/img/product-06.svg', status: 'ativo' },
            { id: genId(), nome: 'Colar Infinity Prata',    preco: 'R$ 139,90', colecao: 'Colares',   descricao: 'Símbolo infinito em prata 925 pura.',          imagem: 'assets/img/product-07.svg', status: 'ativo' },
            { id: genId(), nome: 'Pulseira Charm Rosé',     preco: 'R$ 99,90',  colecao: 'Pulseiras', descricao: 'Pulseira rosé com detalhes em zircônia.',      imagem: 'assets/img/product-08.svg', status: 'ativo' }
        ]);
    }

    if (!readData('depoimentos.json')) {
        writeData('depoimentos.json', [
            { id: genId(), nome: 'Marina Alves',    texto: 'Amei as peças! Qualidade incrível e atendimento super atencioso.',     estrelas: 5 },
            { id: genId(), nome: 'Camila Rodrigues',texto: 'O colar que comprei é lindo e não manchou nada. Recomendo muito!',      estrelas: 5 },
            { id: genId(), nome: 'Fernanda Costa',  texto: 'Loja encantadora, peças sofisticadas e preço justo. Voltarei sempre.',  estrelas: 5 }
        ]);
    }
}

initDefaultData();

// ---- AUTH MIDDLEWARE ----
function auth(req, res, next) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    next();
}

// ---- ROUTES: AUTH ----
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body || {};
    const cfg = readData('config.json') || {};
    if (usuario === 'admin' && senha === (cfg.adminSenha || 'jb2026')) {
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { usuario, at: Date.now() });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }
});

app.post('/api/logout', auth, (req, res) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    sessions.delete(token);
    res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => {
    res.json({ usuario: 'admin' });
});

// ---- ROUTES: PRODUTOS ----
app.get('/api/produtos', (req, res) => {
    res.json(readData('produtos.json') || []);
});

app.post('/api/produtos', auth, (req, res) => {
    const list = readData('produtos.json') || [];
    const item = { ...req.body, id: genId() };
    list.push(item);
    writeData('produtos.json', list);
    res.json(item);
});

app.put('/api/produtos/:id', auth, (req, res) => {
    let list = readData('produtos.json') || [];
    const idx = list.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
    list[idx] = { ...list[idx], ...req.body, id: req.params.id };
    writeData('produtos.json', list);
    res.json(list[idx]);
});

app.delete('/api/produtos/:id', auth, (req, res) => {
    let list = readData('produtos.json') || [];
    list = list.filter(p => p.id !== req.params.id);
    writeData('produtos.json', list);
    res.json({ ok: true });
});

// ---- ROUTES: COLEÇÕES ----
app.get('/api/colecoes', (req, res) => {
    res.json(readData('colecoes.json') || []);
});

app.post('/api/colecoes', auth, (req, res) => {
    const list = readData('colecoes.json') || [];
    const item = { ...req.body, id: Date.now() };
    list.push(item);
    writeData('colecoes.json', list);
    res.json(item);
});

app.put('/api/colecoes/:id', auth, (req, res) => {
    let list = readData('colecoes.json') || [];
    const id  = parseInt(req.params.id) || req.params.id;
    const idx = list.findIndex(c => c.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
    list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
    writeData('colecoes.json', list);
    res.json(list[idx]);
});

app.delete('/api/colecoes/:id', auth, (req, res) => {
    const id  = parseInt(req.params.id) || req.params.id;
    let list  = readData('colecoes.json') || [];
    list = list.filter(c => c.id != id);
    writeData('colecoes.json', list);
    res.json({ ok: true });
});

// ---- ROUTES: DEPOIMENTOS ----
app.get('/api/depoimentos', (req, res) => {
    res.json(readData('depoimentos.json') || []);
});

app.post('/api/depoimentos', auth, (req, res) => {
    const list = readData('depoimentos.json') || [];
    const item = { ...req.body, id: genId() };
    list.push(item);
    writeData('depoimentos.json', list);
    res.json(item);
});

app.put('/api/depoimentos/:id', auth, (req, res) => {
    let list = readData('depoimentos.json') || [];
    const idx = list.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Não encontrado' });
    list[idx] = { ...list[idx], ...req.body, id: req.params.id };
    writeData('depoimentos.json', list);
    res.json(list[idx]);
});

app.delete('/api/depoimentos/:id', auth, (req, res) => {
    let list = readData('depoimentos.json') || [];
    list = list.filter(d => d.id !== req.params.id);
    writeData('depoimentos.json', list);
    res.json({ ok: true });
});

// ---- ROUTES: CONFIG ----
app.get('/api/config', auth, (req, res) => {
    res.json(readData('config.json') || {});
});

app.put('/api/config', auth, (req, res) => {
    const atual = readData('config.json') || {};
    const novo  = { ...atual, ...req.body };
    writeData('config.json', novo);
    res.json(novo);
});

app.put('/api/config/senha', auth, (req, res) => {
    const { novaSenha } = req.body || {};
    if (!novaSenha || novaSenha.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
    }
    const cfg = readData('config.json') || {};
    cfg.adminSenha = novaSenha;
    writeData('config.json', cfg);
    res.json({ ok: true });
});

// ---- ROUTES: SITE PUBLIC ----
app.get('/api/site/produtos', (req, res) => {
    const todos = readData('produtos.json') || [];
    res.json(todos.filter(p => p.status !== 'inativo'));
});

app.get('/api/site/depoimentos', (req, res) => {
    res.json(readData('depoimentos.json') || []);
});

app.get('/api/site/colecoes', (req, res) => {
    res.json(readData('colecoes.json') || []);
});

// ---- START ----
app.listen(PORT, () => {
    console.log(`\n✨ JB Acessórios rodando em http://localhost:${PORT}`);
    console.log(`   Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`   Login: admin / jb2026\n`);
});
