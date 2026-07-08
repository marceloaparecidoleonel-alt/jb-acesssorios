const WHATSAPP_NUMBER = "5543991864750";

const selectors = {
    header: document.getElementById("header"),
    menuToggle: document.getElementById("menuToggle"),
    navMenu: document.getElementById("navMenu"),
    navLinks: document.querySelectorAll(".nav-link"),
    revealItems: document.querySelectorAll(".reveal"),
    heroBg: document.querySelector(".hero-bg"),
    productButtons: document.querySelectorAll(".product-whatsapp"),
    topbarItem: document.getElementById("topbarItem"),
    topbarText: document.getElementById("topbarText")
};

const topbarItems = [
    { icon: 'location', text: 'Loja Física em Ribeirão Claro - PR' },
    { icon: 'gem', text: 'Prata 925 • Semijoias Premium' },
    { icon: 'phone', text: '(43) 99186-4750' },
    { icon: 'instagram', text: '@jbacessorios_jb' }
];

let currentTopbarIndex = 0;

const topbarIcons = {
    location: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    gem: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"></path></svg>`,
    phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    instagram: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`
};

function rotateTopbar() {
    if (!selectors.topbarItem || !selectors.topbarText) return;

    selectors.topbarItem.classList.remove('animate');

    setTimeout(() => {
        currentTopbarIndex = (currentTopbarIndex + 1) % topbarItems.length;
        const item = topbarItems[currentTopbarIndex];

        selectors.topbarItem.querySelector('.topbar-icon').innerHTML = topbarIcons[item.icon];
        selectors.topbarText.textContent = item.text;

        selectors.topbarItem.classList.add('animate');
    }, 100);
}

function initTopbarRotation() {
    if (!selectors.topbarItem) return;
    selectors.topbarItem.classList.add('animate');
    setInterval(rotateTopbar, 4000);
}

function buildWhatsAppUrl(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function handleHeaderScroll() {
    if (!selectors.header) return;
    selectors.header.classList.toggle("scrolled", window.scrollY > 36);
}

function handleHeroParallax() {
    if (!selectors.heroBg) return;
    const offset = Math.min(window.scrollY * 0.16, 90);
    selectors.heroBg.style.setProperty("--parallax", `${offset}px`);
}

function toggleMenu(forceClose = false) {
    if (!selectors.menuToggle || !selectors.navMenu) return;
    const shouldOpen = forceClose ? false : !selectors.navMenu.classList.contains("active");

    selectors.navMenu.classList.toggle("active", shouldOpen);
    selectors.menuToggle.classList.toggle("active", shouldOpen);
    selectors.menuToggle.setAttribute("aria-expanded", String(shouldOpen));
    document.body.classList.toggle("menu-open", shouldOpen);
}

function initNavigation() {
    if (selectors.menuToggle) {
        selectors.menuToggle.addEventListener("click", () => toggleMenu());
    }

    selectors.navLinks.forEach((link) => {
        link.addEventListener("click", () => toggleMenu(true));
    });
}

function initReveal() {
    if (!selectors.revealItems.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.14,
        rootMargin: "0px 0px -70px 0px"
    });

    selectors.revealItems.forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
        observer.observe(item);
    });
}

function setActiveLink() {
    const sections = Array.from(selectors.navLinks)
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    const currentSection = sections.find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= 130 && rect.bottom >= 130;
    });

    selectors.navLinks.forEach((link) => {
        link.classList.toggle("active", currentSection && link.getAttribute("href") === `#${currentSection.id}`);
    });
}

function openProductWhatsApp(button) {
    const card = button.closest(".product-card");
    const product = card?.dataset.product || "uma peça do catálogo";
    const message = `Olá, vim pelo site da JB Acessórios e tenho interesse no produto: ${product}. Poderia me passar mais informações?`;
    window.open(buildWhatsAppUrl(message), "_blank", "noopener");
}

function initProductActions() {
    selectors.productButtons.forEach((button) => {
        button.addEventListener("click", () => openProductWhatsApp(button));
    });
}

function bindScrollEvents() {
    let ticking = false;

    window.addEventListener("scroll", () => {
        if (ticking) return;

        window.requestAnimationFrame(() => {
            handleHeaderScroll();
            handleHeroParallax();
            setActiveLink();
            ticking = false;
        });

        ticking = true;
    }, { passive: true });
}

function init() {
    handleHeaderScroll();
    handleHeroParallax();
    initNavigation();
    initReveal();
    initProductActions();
    initTopbarRotation();
    bindScrollEvents();
    setActiveLink();
}

document.addEventListener("DOMContentLoaded", init);
