const WHATSAPP_NUMBER = "5543991864750";

const selectors = {
    header: document.getElementById("header"),
    menuToggle: document.getElementById("menuToggle"),
    navMenu: document.getElementById("navMenu"),
    navLinks: document.querySelectorAll(".nav-link"),
    revealItems: document.querySelectorAll(".reveal"),
    heroBg: document.querySelector(".hero-bg"),
    productButtons: document.querySelectorAll(".product-whatsapp")
};

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
    bindScrollEvents();
    setActiveLink();
}

document.addEventListener("DOMContentLoaded", init);
