/* =====================================================
   JB Acessórios - Conteúdo Dinâmico (Firebase)
   Carrega produtos, coleções, depoimentos e config
   do Firestore e atualiza o index.html em tempo real.
   Fallback: mantém conteúdo estático se Firestore vazio.
   ===================================================== */

// ---- HERO / CONFIG ----
async function loadConfig() {
    try {
        const doc = await db.collection('config').doc('site').get();
        if (!doc.exists) return;
        const cfg = doc.data();

        const tagEl = document.querySelector('.hero-tag');
        const h1    = document.querySelector('.hero-left h1');
        const subEl = document.querySelector('.hero-left > p');

        if (cfg.heroTag && tagEl)
            tagEl.textContent = cfg.heroTag;

        if (cfg.heroTitulo && h1)
            h1.innerHTML = cfg.heroTitulo.replace(/\*(.*?)\*/g, '<em class="highlight">$1</em>');

        if (cfg.heroSubtitulo && subEl)
            subEl.textContent = cfg.heroSubtitulo;

        if (cfg.whatsapp) {
            const wa = cfg.whatsapp.replace(/\D/g, '');
            document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
                link.href = link.href.replace(/wa\.me\/\d+/, `wa.me/${wa}`);
            });
        }
    } catch (e) {
        console.warn('[site.js] config:', e.message);
    }
}

// ---- COLEÇÕES ----
async function loadColecoes() {
    try {
        const snap = await db.collection('colecoes').get();
        if (snap.empty) return;

        const colecoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const grid = document.querySelector('.categories-grid');
        if (!grid) return;

        grid.innerHTML = colecoes.map((c, i) => {
            const fallbackImg = [
                'assets/img/collection-earrings.svg',
                'assets/img/collection-necklaces.svg',
                'assets/img/collection-bracelets.svg',
                'assets/img/collection-rings.svg',
                'assets/img/collection-sets.svg'
            ][i % 5];
            const imgSrc = c.imagem || fallbackImg;
            return `
            <article class="category-card reveal">
                <img src="${imgSrc}" alt="${c.nome} JB Acessórios"
                     onerror="this.src='${fallbackImg}'">
                <div class="category-content">
                    <h3>${c.nome}</h3>
                    <a href="catalogo.html?colecao=${encodeURIComponent(c.nome)}" class="category-link">Ver</a>
                </div>
            </article>`;
        }).join('');

        observeReveal(grid.querySelectorAll('.reveal'));

        // Também atualiza o menu lateral do footer com as coleções reais
        const footerCols = document.querySelector('.footer-links:nth-child(3)');
        if (footerCols) {
            footerCols.innerHTML = '<h3>Coleções</h3>' +
                colecoes.map(c =>
                    `<a href="catalogo.html?colecao=${encodeURIComponent(c.nome)}">${c.nome}</a>`
                ).join('');
        }
    } catch (e) {
        console.warn('[site.js] coleções:', e.message);
    }
}

// ---- PRODUTOS EM DESTAQUE ----
async function loadProdutos() {
    try {
        const snap = await db.collection('produtos').get();
        if (snap.empty) return;

        const ativos = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.status !== 'inativo' && p.destaque === true)
            .slice(0, 8);

        if (!ativos.length) return;

        const grid = document.querySelector('.catalog-grid');
        if (!grid) return;

        const fallbacks = ['assets/img/product-01.svg','assets/img/product-02.svg',
                           'assets/img/product-03.svg','assets/img/product-04.svg'];

        grid.innerHTML = ativos.map((p, i) => {
            const fb  = fallbacks[i % fallbacks.length];
            const img = p.imagem || fb;
            return `
            <article class="product-card reveal" data-product="${p.nome}">
                <div class="product-image">
                    <img src="${img}" alt="${p.nome}" onerror="this.src='${fb}'">
                </div>
                <div class="product-info">
                    <h3>${p.nome}</h3>
                    ${p.descricao ? `<p>${p.descricao}</p>` : ''}
                    <strong>${p.preco}</strong>
                    <button class="btn btn-outline product-whatsapp" type="button">Tenho Interesse</button>
                </div>
            </article>`;
        }).join('');

        grid.querySelectorAll('.product-whatsapp').forEach(btn => {
            btn.addEventListener('click', () => {
                const nome = btn.closest('.product-card')?.dataset.product || 'uma peça';
                const msg  = `Olá, vim pelo site da JB Acessórios e tenho interesse no produto: ${nome}. Poderia me passar mais informações?`;
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
            });
        });

        observeReveal(grid.querySelectorAll('.reveal'));
    } catch (e) {
        console.warn('[site.js] produtos:', e.message);
    }
}

// ---- DEPOIMENTOS ----
async function loadDepoimentos() {
    try {
        const snap = await db.collection('depoimentos').get();
        if (snap.empty) return;

        const deps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const grid = document.querySelector('.testimonials-grid');
        if (!grid) return;

        grid.innerHTML = deps.map(d => `
            <article class="testimonial-card">
                <div class="stars">${'★'.repeat(d.estrelas || 5)}</div>
                <p>"${d.texto}"</p>
                <h3>${d.nome}</h3>
            </article>`).join('');

        grid.classList.add('reveal');
        observeReveal([grid]);
    } catch (e) {
        console.warn('[site.js] depoimentos:', e.message);
    }
}

// ---- REVEAL HELPER ----
function observeReveal(elements) {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    Array.from(elements).forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i % 6, 5) * 70}ms`;
        obs.observe(el);
    });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadColecoes();
    loadProdutos();
    loadDepoimentos();
});
