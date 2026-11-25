/**
 * ================================================================
 * YESSY NAILS — JavaScript para Portafolio & Modal Interactivo
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initPortfolioFilters();
    loadPortfolioData();
    initPortfolioModal();
});

let allPortfolioItems = [];
let currentFilter = 'todos';
let whatsappPhone = '5215587431290'; // Teléfono por defecto si config no ha respondido

/* ----------------------------------------------------------------
   1. CARGA DE PORTAFOLIO (GET /api/portafolio)
   ---------------------------------------------------------------- */
async function loadPortfolioData() {
    const container = document.getElementById('portfolio-interactive-grid');
    if (!container) return;

    try {
        // Cargar teléfono real desde /api/config si está disponible
        fetchSitePhone();

        const response = await fetch('/api/portafolio');
        if (!response.ok) throw new Error('Error al cargar datos del portafolio');

        const json = await response.json();
        allPortfolioItems = json.data || [];

        renderPortfolioGrid(allPortfolioItems, 'todos');
    } catch (error) {
        console.warn('ℹ️ Usando respaldo de portafolio:', error.message);
    }
}

/**
 * Obtiene el teléfono de WhatsApp de la configuración
 */
async function fetchSitePhone() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.telefono_whatsapp) {
                whatsappPhone = data.data.telefono_whatsapp.replace(/[^0-9]/g, '');
            }
        }
    } catch (e) {
        // Fallback predeterminado
    }
}

/**
 * Renderiza los elementos del portafolio aplicando el filtro activo
 */
function renderPortfolioGrid(items, filterStyle = 'todos') {
    const container = document.getElementById('portfolio-interactive-grid');
    if (!container) return;

    const filtered = filterStyle === 'todos'
        ? items
        : items.filter(item => item.estilo.toLowerCase() === filterStyle.toLowerCase());

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--color-text-muted);">
                <p style="font-size: 1.1rem;">No hay diseños registrados bajo el estilo <strong>"${escapeHTML(filterStyle)}"</strong>.</p>
                <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="document.querySelector('.portfolio-filter-btn[data-style=todos]').click()">
                    Ver todos los diseños
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => `
        <article class="portfolio-card portfolio-card-item" data-id="${item.id}">
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
                <div style="margin-top: auto; padding-top: 1rem; display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 0.8rem; color: var(--color-accent-dark); font-weight: 600;">Ver detalles y pedir diseño →</span>
                </div>
            </div>
        </article>
    `).join('');

    attachCardClickListeners();
}

/* ----------------------------------------------------------------
   2. FILTROS DINÁMICOS POR ESTILO (SIN RECARGA DE PÁGINA)
   ---------------------------------------------------------------- */
function initPortfolioFilters() {
    const filterButtons = document.querySelectorAll('.portfolio-filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-style');
            renderPortfolioGrid(allPortfolioItems, currentFilter);
        });
    });
}

/* ----------------------------------------------------------------
   3. MODAL DE DETALLE CON BOTÓN DE WHATSAPP PRELLENADO
   ---------------------------------------------------------------- */
function initPortfolioModal() {
    const overlay = document.getElementById('portfolio-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    if (!overlay) return;

    // Cerrar con botón X
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Cerrar al dar click fuera del diálogo
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal();
        }
    });
}

function attachCardClickListeners() {
    const cards = document.querySelectorAll('.portfolio-card-item');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.getAttribute('data-id'));
            const item = allPortfolioItems.find(p => p.id === id);
            if (item) {
                openModal(item);
            }
        });
    });
}

/**
 * Abre el modal y llena sus datos dinámicos
 */
function openModal(item) {
    const overlay = document.getElementById('portfolio-modal');
    const modalImg = document.getElementById('modal-img');
    const modalBadge = document.getElementById('modal-badge');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalDate = document.getElementById('modal-date');
    const modalWaBtn = document.getElementById('modal-wa-btn');

    if (!overlay) return;

    // Llenar datos
    if (modalImg) {
        modalImg.src = item.imagen_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1000&q=80';
        modalImg.alt = item.titulo;
    }
    if (modalBadge) modalBadge.textContent = item.estilo;
    if (modalTitle) modalTitle.textContent = item.titulo;
    if (modalDesc) modalDesc.textContent = item.descripcion;

    if (modalDate && item.fecha_creacion) {
        const dateObj = new Date(item.fecha_creacion);
        const formattedDate = dateObj.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        modalDate.textContent = `Creación de autor • ${formattedDate}`;
    }

    // Enlace de WhatsApp con mensaje prellenado sobre este diseño específico
    if (modalWaBtn) {
        const textMessage = `Hola Yessica, me encantó el diseño "${item.titulo}" de tu portafolio (Estilo: ${item.estilo}). ¿Tienes disponibilidad para hacerme un set similar en Yessy Nails? 💅✨`;
        const waLink = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(textMessage)}`;
        modalWaBtn.href = waLink;
    }

    // Mostrar modal con animación y bloquear scroll
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('portfolio-modal');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
