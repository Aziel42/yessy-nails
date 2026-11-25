/**
 * ================================================================
 * YESSY NAILS — JavaScript para Servicios y Cotizador Rápido
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initCategoryTabs();
    loadAllServices();
    initCotizador();
});

let allServices = [];

/* ----------------------------------------------------------------
   1. CARGA DE SERVICIOS POR CATEGORÍA (GET /api/servicios)
   ---------------------------------------------------------------- */
async function loadAllServices() {
    const container = document.getElementById('services-catalog-container');
    if (!container) return;

    try {
        const response = await fetch('/api/servicios');
        if (!response.ok) throw new Error('Error al obtener servicios');
        
        const json = await response.json();
        allServices = json.data || [];

        renderServicesByCategory(allServices, 'todos');
        populateCotizadorBaseServices(allServices);
    } catch (error) {
        console.warn('ℹ️ Usando servicios estáticos de respaldo:', error.message);
    }
}

/**
 * Renderiza los servicios agrupados o filtrados por categoría
 */
function renderServicesByCategory(servicios, filterCategory = 'todos') {
    const container = document.getElementById('services-catalog-container');
    if (!container) return;

    const filtered = filterCategory === 'todos' 
        ? servicios 
        : servicios.filter(s => s.categoria.toLowerCase() === filterCategory.toLowerCase());

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted);">
                <p>No se encontraron servicios en esta categoría.</p>
            </div>
        `;
        return;
    }

    // Si es "todos", agrupamos por categoría
    if (filterCategory === 'todos') {
        const categoriesOrder = ['Acrílico', 'Pedicure/Spa', 'Cejas'];
        const grouped = {};

        categoriesOrder.forEach(cat => {
            const items = servicios.filter(s => s.categoria === cat);
            if (items.length > 0) grouped[cat] = items;
        });

        // Incluir cualquier otra categoría si existiera
        servicios.forEach(s => {
            if (!grouped[s.categoria]) {
                grouped[s.categoria] = servicios.filter(item => item.categoria === s.categoria);
            }
        });

        container.innerHTML = Object.keys(grouped).map(categoryName => `
            <div class="category-group" id="cat-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
                <div class="category-title-wrap">
                    <h3>${escapeHTML(categoryName)}</h3>
                    <span class="category-count">${grouped[categoryName].length} opciones</span>
                </div>
                <div class="services-grid">
                    ${grouped[categoryName].map(s => renderServiceCardHTML(s)).join('')}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `
            <div class="services-grid">
                ${filtered.map(s => renderServiceCardHTML(s)).join('')}
            </div>
        `;
    }

    attachQuoteButtonListeners();
}

/**
 * Genera el HTML para cada tarjeta individual de servicio
 */
function renderServiceCardHTML(servicio) {
    return `
        <article class="service-card" data-service-id="${servicio.id}">
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
                <button type="button" 
                        class="btn btn-secondary btn-sm btn-cotizar-este" 
                        data-service-id="${servicio.id}" 
                        data-service-name="${escapeHTML(servicio.nombre)}" 
                        data-service-price="${servicio.precio_base}">
                    Cotizar ✨
                </button>
            </div>
        </article>
    `;
}

/* ----------------------------------------------------------------
   2. TABS DE FILTRO POR CATEGORÍA
   ---------------------------------------------------------------- */
function initCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const category = tab.getAttribute('data-category');
            renderServicesByCategory(allServices, category);
        });
    });
}

/**
 * Vincula botones de tarjetas para pre-seleccionar en el Cotizador
 */
function attachQuoteButtonListeners() {
    const quoteButtons = document.querySelectorAll('.btn-cotizar-este');
    quoteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const serviceId = btn.getAttribute('data-service-id');
            const radio = document.querySelector(`input[name="base_service"][value="${serviceId}"]`);
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change'));
            }

            // Scroll suave hacia el cotizador
            const cotizadorSec = document.getElementById('cotizador');
            if (cotizadorSec) {
                cotizadorSec.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/* ----------------------------------------------------------------
   3. COTIZADOR RÁPIDO DE DISEÑO INTERACTIVO
   ---------------------------------------------------------------- */
const COTIZADOR_STATE = {
    serviceId: 1,
    serviceName: 'Uñas Acrílicas (Promo del Mes)',
    basePrice: 250.00,
    lengthNumber: 1,
    lengthName: 'Corto (#1)',
    lengthCost: 0.00,
    hasRemoval: false,
    removalCost: 150.00,
    extras: []
};

function initCotizador() {
    const form = document.getElementById('cotizador-form');
    if (!form) return;

    // Listener para Servicio Base
    form.addEventListener('change', (e) => {
        if (e.target.name === 'base_service') {
            const label = e.target.closest('.service-radio-label');
            COTIZADOR_STATE.serviceId = parseInt(e.target.value);
            COTIZADOR_STATE.serviceName = label.getAttribute('data-name');
            COTIZADOR_STATE.basePrice = parseFloat(label.getAttribute('data-price'));
            updateCotizadorSummary();
        }

        // Listener para Largo de Uña (#1 a #5)
        if (e.target.name === 'nail_length') {
            const lengthChip = e.target.closest('.length-chip-label');
            COTIZADOR_STATE.lengthNumber = parseInt(e.target.value);
            COTIZADOR_STATE.lengthName = lengthChip.getAttribute('data-name');
            COTIZADOR_STATE.lengthCost = parseFloat(lengthChip.getAttribute('data-cost'));
            updateCotizadorSummary();
        }

        // Listener para Retiro
        if (e.target.name === 'extra_retiro') {
            COTIZADOR_STATE.hasRemoval = e.target.checked;
            updateCotizadorSummary();
        }

        // Listener para Extras de diseño
        if (e.target.classList.contains('extra-design-check')) {
            recalculateExtras();
            updateCotizadorSummary();
        }
    });

    // Botón Agendar con este presupuesto
    const btnAgendar = document.getElementById('btn-agendar-presupuesto');
    if (btnAgendar) {
        btnAgendar.addEventListener('click', handleAgendarPresupuesto);
    }

    updateCotizadorSummary();
}

/**
 * Llena las opciones base del cotizador con los servicios cargados de la API
 */
function populateCotizadorBaseServices(servicios) {
    const container = document.getElementById('base-services-options');
    if (!container || !servicios || servicios.length === 0) return;

    // Seleccionamos los servicios de aplicación de uñas para el cotizador
    const NAIL_APP_CATEGORIES = ['Acrílico', 'Gelish', 'Soft Gel', 'Polygel'];
    const aplicables = servicios.filter(s => NAIL_APP_CATEGORIES.includes(s.categoria));
    if (aplicables.length === 0) return;

    container.innerHTML = aplicables.map((s, index) => `
        <label class="service-radio-label" 
               data-id="${s.id}" 
               data-name="${escapeHTML(s.nombre)}" 
               data-price="${s.precio_base}">
            <input type="radio" 
                   name="base_service" 
                   value="${s.id}" 
                   ${index === 0 ? 'checked' : ''}>
            <div class="service-radio-card">
                <strong>${escapeHTML(s.nombre)}</strong>
                <span>${escapeHTML(s.categoria)} • ${s.duracion_minutos} min</span>
                <span class="radio-price">$${parseFloat(s.precio_base).toFixed(2)} MXN</span>
            </div>
        </label>
    `).join('');

    // Ajustar estado inicial con el primer servicio
    COTIZADOR_STATE.serviceId = aplicables[0].id;
    COTIZADOR_STATE.serviceName = aplicables[0].nombre;
    COTIZADOR_STATE.basePrice = parseFloat(aplicables[0].precio_base);
    updateCotizadorSummary();
}

/**
 * Recalcula lista de extras seleccionados
 */
function recalculateExtras() {
    const checkboxes = document.querySelectorAll('.extra-design-check:checked');
    COTIZADOR_STATE.extras = Array.from(checkboxes).map(cb => ({
        id: cb.value,
        name: cb.getAttribute('data-name'),
        cost: parseFloat(cb.getAttribute('data-cost'))
    }));
}

/**
 * Actualiza la tarjeta de desglose y total en tiempo real
 */
function updateCotizadorSummary() {
    const serviceNameEl = document.getElementById('sum-service-name');
    const serviceCostEl = document.getElementById('sum-service-cost');
    const lengthNameEl = document.getElementById('sum-length-name');
    const lengthCostEl = document.getElementById('sum-length-cost');
    const removalRowEl = document.getElementById('sum-removal-row');
    const removalCostEl = document.getElementById('sum-removal-cost');
    const extrasListEl = document.getElementById('sum-extras-list');
    const totalEl = document.getElementById('sum-total-amount');

    if (!totalEl) return;

    let total = COTIZADOR_STATE.basePrice + COTIZADOR_STATE.lengthCost;

    // Servicio Base
    if (serviceNameEl) serviceNameEl.textContent = COTIZADOR_STATE.serviceName;
    if (serviceCostEl) serviceCostEl.textContent = `$${COTIZADOR_STATE.basePrice.toFixed(2)}`;

    // Largo
    if (lengthNameEl) lengthNameEl.textContent = `Largo ${COTIZADOR_STATE.lengthName}`;
    if (lengthCostEl) lengthCostEl.textContent = COTIZADOR_STATE.lengthCost > 0 
        ? `+$${COTIZADOR_STATE.lengthCost.toFixed(2)}` 
        : '$0.00';

    // Retiro
    if (removalRowEl) {
        if (COTIZADOR_STATE.hasRemoval) {
            removalRowEl.style.display = 'flex';
            if (removalCostEl) removalCostEl.textContent = `+$${COTIZADOR_STATE.removalCost.toFixed(2)}`;
            total += COTIZADOR_STATE.removalCost;
        } else {
            removalRowEl.style.display = 'none';
        }
    }

    // Extras
    if (extrasListEl) {
        if (COTIZADOR_STATE.extras.length > 0) {
            extrasListEl.innerHTML = COTIZADOR_STATE.extras.map(ex => {
                total += ex.cost;
                return `
                    <div class="summary-row">
                        <span>• ${escapeHTML(ex.name)}</span>
                        <span>+$${ex.cost.toFixed(2)}</span>
                    </div>
                `;
            }).join('');
        } else {
            extrasListEl.innerHTML = '';
        }
    }

    // Total general
    totalEl.textContent = `$${total.toFixed(2)}`;
    COTIZADOR_STATE.calculatedTotal = total;
}

/**
 * Redirige a agendar.html con todos los parámetros preseleccionados
 */
function handleAgendarPresupuesto() {
    const params = new URLSearchParams();
    params.set('servicio_id', COTIZADOR_STATE.serviceId);
    params.set('servicio_nombre', COTIZADOR_STATE.serviceName);
    params.set('largo', COTIZADOR_STATE.lengthNumber);
    params.set('largo_nombre', COTIZADOR_STATE.lengthName);
    params.set('retiro', COTIZADOR_STATE.hasRemoval ? '1' : '0');
    
    if (COTIZADOR_STATE.extras.length > 0) {
        params.set('extras', COTIZADOR_STATE.extras.map(e => e.name).join(', '));
    }
    params.set('total_estimado', COTIZADOR_STATE.calculatedTotal.toFixed(2));

    // Guardar también en sessionStorage para redundancia limpia
    sessionStorage.setItem('yessy_presupuesto', JSON.stringify({
        ...COTIZADOR_STATE,
        timestamp: new Date().toISOString()
    }));

    window.location.href = `agendar.html?${params.toString()}`;
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
