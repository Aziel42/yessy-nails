/**
 * ================================================================
 * YESSY NAILS — JavaScript Principal (Frontend)
 * Salón de uñas de Yessica Marlen Calderón Luna
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollHeader();
    initSoundToggle();
    initAuthNav();
    initScrollReveal();
    loadSiteConfig();
    loadFeaturedServices();
    loadRecentPortfolio();
    loadFaqs();
    initLocationMap();
});

/* ----------------------------------------------------------------
   1. NAVEGACIÓN Y MENÚ HAMBURGUESA RESPONSIVO
   ---------------------------------------------------------------- */
function initNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const navLinks = document.querySelectorAll('.nav-link');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isOpen = mainNav.classList.toggle('open');
            menuToggle.classList.toggle('active', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('open');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }
}

/* ----------------------------------------------------------------
   2. EFECTO HEADER AL HACER SCROLL
   ---------------------------------------------------------------- */
function initScrollHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

/* ----------------------------------------------------------------
   3. CARGA DINÁMICA DE CONFIGURACIÓN DEL SITIO (GET /api/config)
   ---------------------------------------------------------------- */
async function loadSiteConfig() {
    const heroTitleEl = document.getElementById('hero-title');
    const heroSubtitleEl = document.getElementById('hero-subtitle');
    const heroSectionEl = document.getElementById('hero-section');
    const addressTextEls = document.querySelectorAll('.dyn-address');
    const scheduleTextEls = document.querySelectorAll('.dyn-schedule');
    const whatsappLinkEls = document.querySelectorAll('.dyn-whatsapp-link');
    const bioTextEl = document.getElementById('dyn-bio');
    const yearsExpEl = document.getElementById('dyn-years-exp');

    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Respuesta no exitosa al cargar config');
        
        const json = await response.json();
        const config = json.data;

        if (config) {
            // Hero Title & Subtitle
            if (heroTitleEl && config.titulo_banner) {
                heroTitleEl.innerHTML = `${config.titulo_banner} <span>Nails</span> ✨`;
            }
            if (heroSubtitleEl && config.subtitulo_banner) {
                heroSubtitleEl.textContent = config.subtitulo_banner;
            }

            // Hero Background image
            if (heroSectionEl && config.imagen_banner_url) {
                heroSectionEl.style.backgroundImage = `url('${config.imagen_banner_url}')`;
            }

            // Dirección
            if (config.direccion_texto) {
                addressTextEls.forEach(el => el.textContent = config.direccion_texto);
            }

            // Horario
            if (config.horario_atencion) {
                scheduleTextEls.forEach(el => el.textContent = config.horario_atencion);
            }

            // WhatsApp link y teléfono
            if (config.telefono_whatsapp) {
                const cleanPhone = config.telefono_whatsapp.replace(/[^0-9]/g, '');
                const waUrl = `https://wa.me/${cleanPhone}?text=Hola%20Yessica,%20me%20gustaría%20agendar%20una%20cita%20en%20Yessy%20Nails%20💅`;
                whatsappLinkEls.forEach(el => {
                    el.href = waUrl;
                    if (el.classList.contains('dyn-phone-text')) {
                        el.textContent = config.telefono_whatsapp;
                    }
                });
            }

            // Bio y Experiencia
            if (bioTextEl && config.bio_yessica) {
                bioTextEl.textContent = config.bio_yessica;
            }
            if (yearsExpEl && config.anos_experiencia) {
                yearsExpEl.textContent = `${config.anos_experiencia}+ Años`;
            }

            // Bloque de promoción del mes (editable desde /admin)
            const promoSection = document.getElementById('promo-section');
            const promoTitleEl = document.getElementById('promo-title');
            const promoTextEl = document.getElementById('promo-text');
            if (promoSection && (config.promo_mes_titulo || config.promo_mes_texto)) {
                if (promoTitleEl && config.promo_mes_titulo) promoTitleEl.textContent = config.promo_mes_titulo;
                if (promoTextEl && config.promo_mes_texto) promoTextEl.textContent = config.promo_mes_texto;
            } else if (promoSection && !config.promo_mes_titulo && !config.promo_mes_texto) {
                promoSection.style.display = 'none';
            }
        }
    } catch (error) {
        console.warn('ℹ️ Usando valores predeterminados para el Hero y Configuración:', error.message);
    }
}

/* ----------------------------------------------------------------
   4. CARGA DE SERVICIOS ESTRELLA (GET /api/servicios)
   ---------------------------------------------------------------- */
async function loadFeaturedServices() {
    const container = document.getElementById('featured-services-container');
    if (!container) return;

    try {
        const response = await fetch('/api/servicios');
        if (!response.ok) throw new Error('Error al consultar servicios');
        
        const json = await response.json();
        const servicios = json.data;

        if (servicios && servicios.length > 0) {
            // Tomamos los primeros 6 como servicios destacados
            const destacados = servicios.slice(0, 6);
            
            container.innerHTML = destacados.map(servicio => `
                <article class="service-card">
                    <div>
                        <div class="service-header">
                            <span class="service-badge">${escapeHTML(servicio.categoria)}</span>
                            <span class="service-duration">⏱️ ${servicio.duracion_minutos} min</span>
                        </div>
                        <h3 class="service-title">${escapeHTML(servicio.nombre)}</h3>
                        <p class="service-desc">${escapeHTML(servicio.descripcion)}</p>
                    </div>
                    <div class="service-footer">
                        <div class="service-price">
                            <span class="service-price-label">Precio base</span>
                            <span class="service-price-amount">$${parseFloat(servicio.precio_base).toFixed(2)} MXN</span>
                        </div>
                        <a href="#contacto" class="btn btn-secondary btn-sm">Agendar</a>
                    </div>
                </article>
            `).join('');
        }
    } catch (error) {
        console.warn('ℹ️ Carga fallback de servicios estrella:', error.message);
    }
}

/* ----------------------------------------------------------------
   5. CARGA DE 3 TRABAJOS RECIENTES DEL PORTAFOLIO (GET /api/portafolio)
   ---------------------------------------------------------------- */
async function loadRecentPortfolio() {
    const container = document.getElementById('recent-portfolio-container');
    if (!container) return;

    try {
        const response = await fetch('/api/portafolio');
        if (!response.ok) throw new Error('Error al consultar portafolio');

        const json = await response.json();
        const portfolio = json.data;

        if (portfolio && portfolio.length > 0) {
            // Mostrar los primeros 3 trabajos
            const recientes = portfolio.slice(0, 3);

            container.innerHTML = recientes.map(item => `
                <article class="portfolio-card">
                    <div class="portfolio-img-wrap">
                        <img src="${item.imagen_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80'}" 
                             alt="${escapeHTML(item.titulo)}" 
                             class="portfolio-img"
                             loading="lazy"
                             onerror="this.src='https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80'">
                        <span class="portfolio-badge">${escapeHTML(item.estilo)}</span>
                    </div>
                    <div class="portfolio-info">
                        <h3 class="portfolio-title">${escapeHTML(item.titulo)}</h3>
                        <p class="portfolio-desc">${escapeHTML(item.descripcion)}</p>
                    </div>
                </article>
            `).join('');
        }
    } catch (error) {
        console.warn('ℹ️ Carga fallback de portafolio:', error.message);
    }
}

/* ----------------------------------------------------------------
   6. MAPA INTERACTIVO (Leaflet + OpenStreetMap + Nominatim)
   ---------------------------------------------------------------- */
const YESSY_DEFAULT_COORDS = { lat: 19.5855, lng: -99.0195 };

async function initLocationMap() {
    const mapEl = document.getElementById('dyn-map');
    if (!mapEl || typeof L === 'undefined') return;

    let lat = YESSY_DEFAULT_COORDS.lat;
    let lng = YESSY_DEFAULT_COORDS.lng;
    let direccion = '';

    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const json = await res.json();
            const cfg = json.data || {};
            if (cfg.latitud != null && !isNaN(parseFloat(cfg.latitud))) lat = parseFloat(cfg.latitud);
            if (cfg.longitud != null && !isNaN(parseFloat(cfg.longitud))) lng = parseFloat(cfg.longitud);
            direccion = cfg.direccion_texto || '';
        }
    } catch (e) {
        // Usa coordenadas por defecto
    }

    const map = L.map(mapEl).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const popupHtml = `<strong>Yessy Nails</strong><br>${escapeHTML(direccion || 'Las Américas, Ecatepec de Morelos')}`;
    const marker = L.marker([lat, lng]).addTo(map).bindPopup(popupHtml).openPopup();

    window.yessyMap = map;
    window.yessyMarker = marker;

    initLocationSearch(map, marker);
}

function initLocationSearch(map, marker) {
    const input = document.getElementById('dyn-map-search');
    const btn = document.getElementById('dyn-map-search-btn');
    if (!input || !btn) return;

    const doSearch = async () => {
        const query = input.value.trim();
        if (!query) return;

        btn.disabled = true;
        const originalLabel = btn.textContent;
        btn.textContent = 'Buscando...';

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const results = await res.json();

            if (results && results.length > 0) {
                const { lat, lon, display_name } = results[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);
                map.setView([newLat, newLng], 16);
                marker.setLatLng([newLat, newLng]).bindPopup(`<strong>Resultado</strong><br>${escapeHTML(display_name)}`).openPopup();
            } else {
                alert('No se encontró la dirección. Intenta con una búsqueda más específica.');
            }
        } catch (e) {
            alert('No se pudo buscar la dirección en este momento.');
        } finally {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
        }
    });
}

/* ----------------------------------------------------------------
   7. UTILIDAD DE SANITIZACIÓN HTML
   ---------------------------------------------------------------- */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ----------------------------------------------------------------
   8. BOTÓN DE SILENCIAR / ACTIVAR SONIDOS
   ---------------------------------------------------------------- */
function initSoundToggle() {
    const headerCta = document.querySelector('.header-cta');
    let btn = document.getElementById('sound-toggle');

    if (!btn && headerCta) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'sound-toggle';
        btn.className = 'sound-toggle-btn';
        headerCta.prepend(btn);
    }
    if (!btn) return;

    const syncIcon = () => {
        const enabled = window.YESSY_SOUNDS ? window.YESSY_SOUNDS.isEnabled() : true;
        btn.textContent = enabled ? '🔊' : '🔇';
        btn.setAttribute('aria-label', enabled ? 'Silenciar sonidos' : 'Activar sonidos');
        btn.title = enabled ? 'Silenciar sonidos' : 'Activar sonidos';
    };

    syncIcon();

    if (!btn.dataset.soundBound) {
        btn.dataset.soundBound = '1';
        btn.addEventListener('click', () => {
            if (window.YESSY_SOUNDS && typeof window.YESSY_SOUNDS.toggle === 'function') {
                window.YESSY_SOUNDS.toggle();
            }
        });
    }
}

/* ----------------------------------------------------------------
   9. ESTADO DE SESIÓN EN BARRA DE NAVEGACIÓN
   ---------------------------------------------------------------- */
function initAuthNav() {
    const headerCta = document.querySelector('.header-cta');
    let container = document.getElementById('auth-nav-container');

    if (!container && headerCta) {
        container = document.createElement('span');
        container.id = 'auth-nav-container';
        container.className = 'auth-nav-container';
        const ctaLink = headerCta.querySelector('a.btn-primary');
        if (ctaLink) {
            headerCta.insertBefore(container, ctaLink);
        } else {
            headerCta.appendChild(container);
        }
    }
    if (!container) return;

    const session = window.YESSY_AUTH ? window.YESSY_AUTH.getSession() : null;
    if (session && session.user && session.user.email) {
        const displayName = (typeof window.YESSY_AUTH.getDisplayName === 'function')
            ? window.YESSY_AUTH.getDisplayName()
            : session.user.email.split('@')[0];
        container.innerHTML = `
            <span class="auth-user-email" title="${escapeHTML(session.user.email)}">👤 ${escapeHTML(displayName)}</span>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-nav-logout">Salir</button>
        `;
        const logoutBtn = document.getElementById('btn-nav-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.YESSY_AUTH) window.YESSY_AUTH.logout();
            });
        }
    } else {
        container.innerHTML = `<a href="login.html" class="btn btn-secondary btn-sm" id="btn-nav-login">Entrar</a>`;
    }
}

/* ----------------------------------------------------------------
   10. ANIMACIONES SUAVES AL HACER SCROLL (.reveal)
   ---------------------------------------------------------------- */
function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
        elements.forEach(el => el.classList.add('active'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    elements.forEach(el => observer.observe(el));
}

/* ----------------------------------------------------------------
   11. ACORDEÓN DE PREGUNTAS FRECUENTES (GET /api/faqs)
   ---------------------------------------------------------------- */
async function loadFaqs() {
    const container = document.getElementById('faq-accordion-container');
    if (!container) return;

    try {
        const res = await fetch('/api/faqs');
        if (!res.ok) throw new Error('Error al cargar preguntas frecuentes');
        const json = await res.json();
        const faqs = json.data || [];

        if (!faqs.length) {
            container.innerHTML = '<p class="faq-loading">Por el momento no hay preguntas frecuentes publicadas.</p>';
            return;
        }

        container.innerHTML = faqs.map((faq, idx) => `
            <div class="faq-item" data-faq-index="${idx}">
                <button type="button" class="faq-question" aria-expanded="false">
                    <span>${escapeHTML(faq.pregunta)}</span>
                    <span class="faq-icon" aria-hidden="true">+</span>
                </button>
                <div class="faq-answer">
                    <div class="faq-answer-inner">${escapeHTML(faq.respuesta)}</div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.faq-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const isOpen = item.classList.toggle('open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
        });
    } catch (error) {
        console.warn('ℹ️ No se pudieron cargar las FAQs:', error.message);
        container.innerHTML = '<p class="faq-loading">No se pudieron cargar las preguntas frecuentes en este momento.</p>';
    }
}
