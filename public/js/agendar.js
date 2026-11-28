/**
 * ================================================================
 * YESSY NAILS — JavaScript para Reservas de Citas (agendar.html)
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.YESSY_AUTH) {
        window.YESSY_AUTH.autoFillForm('#appointment-form');
    }
    initDatePicker();
    initWizardSteps();
    loadServicesSelect();
    loadMaterialsConfigurator();
    checkCotizadorParams();
    initPaymentMethodCards();
    initAppointmentForm();
});

let loadedServices = [];
let loadedMaterials = [];
let selectedMaterialIds = [];
let activeMaterialCategory = 'todos';
let whatsappPhone = '5215587431290';
let activeQuoteTotal = null;

/* ----------------------------------------------------------------
   1. INICIALIZAR SELECTOR DE FECHAS
   ---------------------------------------------------------------- */
function initDatePicker() {
    const fechaInput = document.getElementById('fecha_cita');
    if (!fechaInput) return;

    // Fecha mínima: mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split('T')[0];

    // Fecha máxima: 60 días en adelante
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    fechaInput.min = minDateStr;
    fechaInput.max = maxDateStr;
    fechaInput.value = minDateStr;

    // Verificar si el día elegido es domingo
    fechaInput.addEventListener('change', () => {
        const selected = new Date(`${fechaInput.value}T12:00:00`);
        if (selected.getDay() === 0) { // 0 = Domingo
            alert('Los domingos el salón permanece cerrado. Por favor elige un día de lunes a sábado.');
            tomorrow.setDate(tomorrow.getDate() + (tomorrow.getDay() === 0 ? 1 : 0));
            fechaInput.value = tomorrow.toISOString().split('T')[0];
        }
    });
}

/* ----------------------------------------------------------------
   2. CARGAR SERVICIOS DESDE GET /api/servicios
   ---------------------------------------------------------------- */
async function loadServicesSelect() {
    const select = document.getElementById('servicio_id');
    if (!select) return;

    try {
        // Cargar teléfono de WhatsApp de config
        fetchWhatsappConfig();

        const response = await fetch('/api/servicios');
        if (!response.ok) throw new Error('Error al consultar servicios');

        const json = await response.json();
        loadedServices = json.data || [];

        if (loadedServices.length > 0) {
            // Agrupar por categoría
            const grouped = {};
            loadedServices.forEach(s => {
                if (!grouped[s.categoria]) grouped[s.categoria] = [];
                grouped[s.categoria].push(s);
            });

            select.innerHTML = '<option value="" disabled selected>-- Selecciona un servicio --</option>' +
                Object.keys(grouped).map(cat => `
                    <optgroup label="${escapeHTML(cat)}">
                        ${grouped[cat].map(s => `
                            <option value="${s.id}" data-price="${s.precio_base}" data-duration="${s.duracion_minutos}" data-name="${escapeHTML(s.nombre)}">
                                ${escapeHTML(s.nombre)} — $${parseFloat(s.precio_base).toFixed(2)} MXN (${s.duracion_minutos} min)
                            </option>
                        `).join('')}
                    </optgroup>
                `).join('');

            renderServicesCards();
            select.addEventListener('change', () => {
                syncServiceSelectionUI();
            });

            // Si había un servicio preseleccionado por cotizador, aplicarlo ahora
            applyPreselectedService();
        }
    } catch (error) {
        console.warn('ℹ️ Usando catálogo estático de servicios:', error.message);
    }
}

/* ----------------------------------------------------------------
   2B. ASISTENTE EN 2 PASOS Y CONFIGURADOR DE MATERIALES
   ---------------------------------------------------------------- */
function initWizardSteps() {
    const btnNext = document.getElementById('btn-next-step-2');
    const btnBack = document.getElementById('btn-back-step-1');

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const select = document.getElementById('servicio_id');
            if (!select || !select.value) {
                showAlert('Por favor selecciona un servicio base en el Paso 1 para continuar.', 'error');
                return;
            }
            const alertBox = document.getElementById('booking-alert');
            if (alertBox) alertBox.style.display = 'none';
            goToWizardStep(2);
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => goToWizardStep(1));
    }

    // Filtros de categoría de materiales
    document.querySelectorAll('#materials-filter-bar .mat-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#materials-filter-bar .mat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeMaterialCategory = btn.dataset.cat || 'todos';
            renderMaterialsGrid();
        });
    });
}

function goToWizardStep(step) {
    const step1 = document.getElementById('booking-step-1');
    const step2 = document.getElementById('booking-step-2');
    const pill1 = document.getElementById('wizard-step-1-pill');
    const pill2 = document.getElementById('wizard-step-2-pill');

    if (step === 2) {
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        if (pill1) { pill1.classList.remove('active'); pill1.classList.add('completed'); }
        if (pill2) { pill2.classList.add('active'); }
        updateStep2Summary();
    } else {
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        if (pill1) { pill1.classList.add('active'); pill1.classList.remove('completed'); }
        if (pill2) { pill2.classList.remove('active'); }
    }
    const formCard = document.getElementById('booking-form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderServicesCards() {
    const grid = document.getElementById('services-cards-grid');
    const select = document.getElementById('servicio_id');
    if (!grid || !loadedServices.length) return;

    const currentVal = select ? select.value : '';
    grid.innerHTML = loadedServices.map(s => `
        <button type="button" class="service-pick-card ${String(s.id) === String(currentVal) ? 'selected' : ''}" data-service-id="${s.id}">
            <div>
                <div class="service-pick-cat">${escapeHTML(s.categoria)}</div>
                <h4 class="service-pick-title">${escapeHTML(s.nombre)}</h4>
            </div>
            <div class="service-pick-meta">
                <span>⏱️ ${s.duracion_minutos} min</span>
                <span class="service-pick-price">$${parseFloat(s.precio_base).toFixed(2)} MXN</span>
            </div>
        </button>
    `).join('');

    grid.querySelectorAll('.service-pick-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.getAttribute('data-service-id');
            if (select) {
                select.value = id;
            }
            syncServiceSelectionUI();
        });
    });
}

function syncServiceSelectionUI() {
    const select = document.getElementById('servicio_id');
    const selectedId = select ? select.value : '';
    const service = loadedServices.find(s => String(s.id) === String(selectedId));

    document.querySelectorAll('.service-pick-card').forEach(card => {
        card.classList.toggle('selected', card.getAttribute('data-service-id') === String(selectedId));
    });

    const summaryBox = document.getElementById('step1-service-summary');
    const nameEl = document.getElementById('step1-summary-name');
    const durEl = document.getElementById('step1-summary-duration');
    const priceEl = document.getElementById('step1-summary-price');

    if (service && summaryBox) {
        summaryBox.style.display = 'flex';
        if (nameEl) nameEl.textContent = service.nombre;
        if (durEl) durEl.textContent = `⏱️ Duración estimada: ${service.duracion_minutos} minutos`;
        if (priceEl) priceEl.textContent = `$${parseFloat(service.precio_base).toFixed(2)} MXN`;
    } else if (summaryBox) {
        summaryBox.style.display = 'none';
    }

    updateStep2Summary();
}

async function loadMaterialsConfigurator() {
    const grid = document.getElementById('materials-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/materiales');
        if (!res.ok) throw new Error('Error al cargar inventario');
        const json = await res.json();
        loadedMaterials = json.data || [];

        // Limpiar seleccionados que ya no estén disponibles
        selectedMaterialIds = selectedMaterialIds.filter(id => {
            const mat = loadedMaterials.find(m => m.id === id);
            return mat && Number(mat.stock_actual) > 0;
        });

        renderStockBanner();
        renderMaterialsGrid();
        updateStep2Summary();
    } catch (e) {
        grid.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">No se pudo cargar el catálogo de materiales en este momento.</p>';
    }
}

function renderStockBanner() {
    const banner = document.getElementById('stock-info-banner');
    if (!banner) return;

    const outItems = loadedMaterials.filter(m => Number(m.stock_actual) <= 0);
    const lowItems = loadedMaterials.filter(m => Number(m.stock_actual) > 0 && Number(m.stock_actual) <= Number(m.stock_minimo));

    if (!outItems.length && !lowItems.length) {
        banner.style.display = 'none';
        return;
    }

    const parts = [];
    if (outItems.length) {
        parts.push(`<strong>Agotados (${outItems.length}):</strong> ${outItems.map(m => escapeHTML(m.nombre)).join(', ')} (bloqueados temporalmente).`);
    }
    if (lowItems.length) {
        parts.push(`<strong>Últimas unidades (${lowItems.length}):</strong> ${lowItems.map(m => escapeHTML(m.nombre)).join(', ')}.`);
    }
    banner.innerHTML = `⚠️ <strong>Aviso de Inventario en Vivo:</strong> ${parts.join(' ')}`;
    banner.style.display = 'block';
}

function renderMaterialsGrid() {
    const grid = document.getElementById('materials-grid');
    if (!grid) return;

    const filtered = activeMaterialCategory === 'todos'
        ? loadedMaterials
        : loadedMaterials.filter(m => m.categoria === activeMaterialCategory);

    if (!filtered.length) {
        grid.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">No hay materiales en esta categoría.</p>';
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const stock = Number(m.stock_actual);
        const minStock = Number(m.stock_minimo);
        const isOut = stock <= 0;
        const isLow = !isOut && stock <= minStock;
        const isSelected = selectedMaterialIds.includes(m.id);

        const badgeClass = isOut ? 'out' : (isLow ? 'low' : 'ok');
        const badgeText = isOut ? 'Agotado' : (isLow ? 'Últimas unidades' : 'Disponible');
        const extraPrice = Number(m.precio_extra || 0);
        const priceText = extraPrice > 0 ? `+$${extraPrice.toFixed(2)} MXN` : 'Incluido';

        return `
            <button type="button"
                    class="material-card ${isOut ? 'is-out' : ''} ${isSelected ? 'selected' : ''}"
                    data-material-id="${m.id}"
                    ${isOut ? 'disabled aria-disabled="true"' : ''}>
                <div class="material-card-top">
                    <span class="material-swatch" style="background-color: ${escapeHTML(m.color_hex || '#D4A5A5')};"></span>
                    <div>
                        <div class="material-name">${escapeHTML(m.nombre)}</div>
                        <div style="font-size: 0.74rem; color: var(--color-text-muted);">${escapeHTML(m.categoria)}</div>
                    </div>
                </div>
                <div class="material-meta-row">
                    <span class="stock-badge ${badgeClass}">${badgeText}</span>
                    <strong style="color: var(--color-accent-dark);">${priceText}</strong>
                </div>
            </button>
        `;
    }).join('');

    grid.querySelectorAll('.material-card:not(.is-out)').forEach(card => {
        card.addEventListener('click', () => {
            const id = Number(card.getAttribute('data-material-id'));
            if (selectedMaterialIds.includes(id)) {
                selectedMaterialIds = selectedMaterialIds.filter(x => x !== id);
            } else {
                selectedMaterialIds.push(id);
            }
            renderMaterialsGrid();
            updateStep2Summary();
        });
    });
}

function getCalculatedTotal() {
    const select = document.getElementById('servicio_id');
    let base = activeQuoteTotal;
    if (!base && select && select.selectedOptions[0]) {
        base = parseFloat(select.selectedOptions[0].getAttribute('data-price')) || 0;
    }
    const extras = selectedMaterialIds.reduce((sum, id) => {
        const m = loadedMaterials.find(x => x.id === id);
        return sum + (m ? Number(m.precio_extra || 0) : 0);
    }, 0);
    return (Number(base || 0) + extras);
}

function updateStep2Summary() {
    const select = document.getElementById('servicio_id');
    const opt = select && select.selectedOptions[0];
    const serviceNameEl = document.getElementById('step2-service-name');
    const matCountEl = document.getElementById('step2-materials-count');
    const totalEl = document.getElementById('step2-total-estimado');

    if (serviceNameEl) {
        serviceNameEl.textContent = (opt && opt.getAttribute('data-name')) || 'Servicio seleccionado';
    }
    if (matCountEl) {
        matCountEl.textContent = `(${selectedMaterialIds.length} material${selectedMaterialIds.length === 1 ? '' : 'es'} extra)`;
    }
    if (totalEl) {
        totalEl.textContent = `$${getCalculatedTotal().toFixed(2)} MXN`;
    }
}

/**
 * Obtiene el teléfono de WhatsApp desde /api/config
 */
async function fetchWhatsappConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const json = await res.json();
            if (json.data && json.data.telefono_whatsapp) {
                whatsappPhone = json.data.telefono_whatsapp.replace(/[^0-9]/g, '');
            }
        }
    } catch (e) {
        // Fallback predeterminado
    }
}

/* ----------------------------------------------------------------
   3. AUTO-RELLENAR DATOS SI VIENE DEL COTIZADOR O DEL PORTAFOLIO
   ---------------------------------------------------------------- */
function checkCotizadorParams() {
    const params = new URLSearchParams(window.location.search);

    // Si viene del portafolio con un diseño de referencia (?diseno=... o ?notas_diseno=...), rellenar las notas
    const disenoParam = params.get('diseno');
    if (disenoParam && disenoParam.trim()) {
        const notasInput = document.getElementById('notas_diseno');
        if (notasInput && !notasInput.value) {
            notasInput.value = `Diseño elegido del portafolio: ${disenoParam.trim()}`;
        }
        return; // No seguir buscando parámetros de cotizador
    }

    if (params.has('notas_diseno')) {
        const notasInput = document.getElementById('notas_diseno');
        const rawNotas = (params.get('notas_diseno') || '').trim();
        if (notasInput && !notasInput.value && rawNotas) {
            notasInput.value = rawNotas.startsWith('Diseño')
                ? rawNotas
                : `Diseño elegido del portafolio: ${rawNotas}`;
        }
        return; // No seguir buscando parámetros de cotizador
    }

    let quoteData = null;

    // Intentar leer desde URL
    if (params.has('servicio_nombre') && params.has('total_estimado')) {
        quoteData = {
            servicioId: params.get('servicio_id'),
            servicioNombre: params.get('servicio_nombre'),
            largo: params.get('largo_nombre'),
            retiro: params.get('retiro'),
            extras: params.get('extras'),
            total: params.get('total_estimado')
        };
    } else {
        // Intentar leer desde sessionStorage
        const saved = sessionStorage.getItem('yessy_presupuesto');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                quoteData = {
                    servicioId: parsed.serviceId,
                    servicioNombre: parsed.serviceName,
                    largo: parsed.lengthName,
                    retiro: parsed.hasRemoval ? '1' : '0',
                    extras: parsed.extras ? parsed.extras.map(e => e.name).join(', ') : '',
                    total: parsed.calculatedTotal ? parsed.calculatedTotal.toFixed(2) : null
                };
            } catch (e) {}
        }
    }

    if (quoteData && quoteData.total) {
        activeQuoteTotal = parseFloat(quoteData.total);
        window._pendingServiceId = quoteData.servicioId;

        // Mostrar caja de presupuesto preseleccionado
        const budgetBox = document.getElementById('budget-box');
        const budgetTitle = document.getElementById('budget-service-title');
        const budgetDetails = document.getElementById('budget-details');
        const budgetTotal = document.getElementById('budget-total');
        const notasInput = document.getElementById('notas_diseno');

        if (budgetBox) budgetBox.style.display = 'flex';
        if (budgetTitle) budgetTitle.textContent = quoteData.servicioNombre;
        if (budgetTotal) budgetTotal.textContent = `$${parseFloat(quoteData.total).toFixed(2)} MXN`;

        const detailsParts = [];
        if (quoteData.largo) detailsParts.push(`Largo: ${quoteData.largo}`);
        if (quoteData.retiro === '1') detailsParts.push('Con retiro de material previo');
        if (quoteData.extras) detailsParts.push(`Extras: ${quoteData.extras}`);

        if (budgetDetails) budgetDetails.textContent = detailsParts.join(' • ');

        // Rellenar notas de diseño
        if (notasInput && !notasInput.value) {
            notasInput.value = `[Presupuesto Cotizador]\n${detailsParts.join('\n')}\nTotal Estimado: $${quoteData.total} MXN`;
        }

        applyPreselectedService();
    }
}

function applyPreselectedService() {
    const select = document.getElementById('servicio_id');
    if (select && window._pendingServiceId) {
        select.value = window._pendingServiceId;
    }
    syncServiceSelectionUI();
}

/* ----------------------------------------------------------------
   4. TARJETAS DE MÉTODO DE PAGO Y PANELES DINÁMICOS
   ---------------------------------------------------------------- */
let speiDataLoaded = false;
let speiModalConfirmed = false;

function onPaymentChange() {
    const checked = document.querySelector('input[name="metodo_pago"]:checked');
    const val = checked ? checked.value : 'efectivo';
    speiModalConfirmed = false;

    const panelSucursal = document.getElementById('panel-sucursal');
    const panelSpei     = document.getElementById('panel-spei');
    const panelTarjeta  = document.getElementById('panel-tarjeta');

    if (panelSucursal) panelSucursal.style.display = val === 'efectivo'      ? 'block' : 'none';
    if (panelSpei)     panelSpei.style.display     = val === 'transferencia' ? 'block' : 'none';
    if (panelTarjeta)  panelTarjeta.style.display  = (val === 'mercadopago' || val === 'pasarela_futura') ? 'block' : 'none';

    if (val === 'transferencia' && !speiDataLoaded) {
        loadSpeiData();
    }
}

async function loadSpeiData() {
    const loadingEl = document.getElementById('spei-loading');
    const infoEl    = document.getElementById('spei-info');
    try {
        const res = await fetch('/api/configuracion');
        const json = await res.json();
        const cfg = json.data || {};
        const banco   = cfg.banco_transferencia   || 'Banco no configurado';
        const titular = cfg.titular_transferencia || 'Titular no configurado';
        const clabe   = cfg.clabe_transferencia   || '—';

        if (loadingEl) loadingEl.style.display = 'none';
        if (infoEl)    infoEl.style.display    = 'block';
        const bancoEl   = document.getElementById('spei-banco');
        const titularEl = document.getElementById('spei-titular');
        const clabeEl   = document.getElementById('spei-clabe');
        if (bancoEl)   bancoEl.textContent   = banco;
        if (titularEl) titularEl.textContent = titular;
        if (clabeEl)   clabeEl.textContent   = clabe;

        const mBanco   = document.getElementById('spei-modal-banco');
        const mTitular = document.getElementById('spei-modal-titular');
        const mClabe   = document.getElementById('spei-modal-clabe');
        if (mBanco)   mBanco.textContent   = banco;
        if (mTitular) mTitular.textContent = titular;
        if (mClabe)   mClabe.textContent   = clabe;

        speiDataLoaded = true;
    } catch (e) {
        if (loadingEl) {
            loadingEl.textContent = 'No se pudieron cargar los datos bancarios. Escríbenos por WhatsApp.';
        }
    }
}

async function openSpeiModal() {
    if (!speiDataLoaded) {
        await loadSpeiData();
    }
    const overlay = document.getElementById('spei-modal-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function closeSpeiModal() {
    const overlay = document.getElementById('spei-modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function validateCardFields() {
    const num  = (document.getElementById('card-number')?.value || '').replace(/\s/g, '');
    const name = (document.getElementById('card-name')?.value || '').trim();
    const exp  = (document.getElementById('card-exp')?.value || '').trim();
    const cvv  = (document.getElementById('card-cvv')?.value || '').trim();

    if (!/^\d{16}$/.test(num)) {
        return { valid: false, message: 'El número de tarjeta debe tener exactamente 16 dígitos.' };
    }
    if (name.length < 3) {
        return { valid: false, message: 'Ingresa el nombre completo del titular de la tarjeta.' };
    }
    const expMatch = exp.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!expMatch) {
        return { valid: false, message: 'La fecha de expiración debe tener formato MM/AA válido.' };
    }
    const expMonth = parseInt(expMatch[1], 10);
    const expYear  = 2000 + parseInt(expMatch[2], 10);
    const now = new Date();
    if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < (now.getMonth() + 1))) {
        return { valid: false, message: 'La tarjeta ingresada está vencida.' };
    }
    if (!/^\d{3}$/.test(cvv)) {
        return { valid: false, message: 'El CVV debe tener exactamente 3 dígitos.' };
    }

    return { valid: true, last4: num.slice(-4) };
}

window.copyClabe = function copyClabe(sourceId = 'spei-clabe', btnEl = null) {
    const clabe = document.getElementById(sourceId)?.textContent;
    if (clabe && clabe !== '—') {
        navigator.clipboard.writeText(clabe).then(() => {
            const btn = btnEl || document.getElementById('btn-copy-clabe');
            if (btn) {
                btn.textContent = '✅ Copiado';
                setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
            }
        }).catch(() => { alert('CLABE: ' + clabe); });
    }
};

window.formatCardNumber = function formatCardNumber(input) {
    const v = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = v.replace(/(.{4})/g, '$1 ').trim();
};

window.formatCardExp = function formatCardExp(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
    input.value = v;
};

window.updateCardVisual = function updateCardVisual() {
    const num  = (document.getElementById('card-number')?.value || '').replace(/\s/g, '').padEnd(16, '•');
    const name = (document.getElementById('card-name')?.value || '').toUpperCase() || 'NOMBRE TITULAR';
    const exp  = document.getElementById('card-exp')?.value || 'MM/AA';

    let formatted = '';
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += num[i] || '•';
    }

    const numDisp  = document.getElementById('card-number-display');
    const nameDisp = document.getElementById('card-name-display');
    const expDisp  = document.getElementById('card-exp-display');
    if (numDisp)  numDisp.textContent  = formatted;
    if (nameDisp) nameDisp.textContent = name.substring(0, 22);
    if (expDisp)  expDisp.textContent  = exp;
};

window.simulateCardAuth = function simulateCardAuth() {
    const resultBox = document.getElementById('card-auth-result');
    const btn = document.getElementById('btn-authorize-card');
    const check = validateCardFields();

    if (!check.valid) {
        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.style.background = '#FFEBEE';
            resultBox.style.color = '#C62828';
            resultBox.style.border = '1px solid #FFCDD2';
            resultBox.textContent = `⚠️ ${check.message}`;
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Procesando...';
    }
    if (resultBox) resultBox.style.display = 'none';

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔒 Autorizar Anticipo de $50 MXN (Prueba)';
        }
        if (resultBox) {
            resultBox.style.display = 'block';
            resultBox.style.background = '#E8F5E9';
            resultBox.style.color = '#2E7D32';
            resultBox.style.border = '1px solid #A5D6A7';
            resultBox.innerHTML = `✅ <strong>Autorización simulada aprobada.</strong> Anticipo de $50 MXN registrado (terminación ****${check.last4}) en modo prueba. No se realizó ningún cargo real.`;
        }
    }, 900);
};

function initPaymentMethodCards() {
    const radios = document.querySelectorAll('input[name="metodo_pago"]');
    radios.forEach(radio => {
        radio.addEventListener('change', onPaymentChange);
    });

    const labels = document.querySelectorAll('.payment-radio-label:not(.disabled)');
    labels.forEach(label => {
        label.addEventListener('click', () => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio && !radio.disabled) {
                if (!radio.checked) {
                    radio.checked = true;
                }
                onPaymentChange();
            }
        });
    });

    // Estado inicial según la opción marcada por defecto
    onPaymentChange();
}

/* ----------------------------------------------------------------
   5. ENVÍO DE FORMULARIO A POST /api/citas Y CONFIRMACIÓN
   ---------------------------------------------------------------- */
function initAppointmentForm() {
    const form = document.getElementById('appointment-form');
    if (!form) return;

    const btnAcceptSpei = document.getElementById('btn-accept-spei');
    const btnCancelSpei = document.getElementById('btn-cancel-spei');
    const speiOverlay   = document.getElementById('spei-modal-overlay');

    if (btnAcceptSpei) {
        btnAcceptSpei.addEventListener('click', () => {
            speiModalConfirmed = true;
            closeSpeiModal();
            form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    }
    if (btnCancelSpei) {
        btnCancelSpei.addEventListener('click', closeSpeiModal);
    }
    if (speiOverlay) {
        speiOverlay.addEventListener('click', (ev) => {
            if (ev.target === speiOverlay) closeSpeiModal();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-submit-booking');
        const selectServicio = document.getElementById('servicio_id');

        // Validaciones
        const nombreCliente = form.nombre_cliente.value.trim();
        const telefonoCliente = form.telefono_cliente.value.trim();
        const correoCliente = (document.getElementById('correo')?.value || '').trim();
        const servicioId = parseInt(form.servicio_id.value);
        const fechaCita = form.fecha_cita.value;
        const horaCita = form.hora_cita.value;
        const notasDiseno = form.notas_diseno.value.trim();
        const metodoPago = form.metodo_pago ? form.metodo_pago.value : 'efectivo';

        if (!nombreCliente || !telefonoCliente || !correoCliente || !servicioId || !fechaCita || !horaCita) {
            showAlert('Por favor llena todos los campos obligatorios (*), incluyendo tu correo electrónico.', 'error');
            return;
        }

        // Si eligió Transferencia SPEI y aún no confirmó el modal de datos bancarios, mostrarlo primero
        if (metodoPago === 'transferencia' && !speiModalConfirmed) {
            await openSpeiModal();
            return;
        }

        // Determinar total estimado (incluyendo extras de materiales)
        let totalEstimado = getCalculatedTotal();
        if (!totalEstimado && selectServicio.selectedOptions[0]) {
            totalEstimado = parseFloat(selectServicio.selectedOptions[0].getAttribute('data-price')) || 500.00;
        }

        const selectedMaterialsNames = selectedMaterialIds
            .map(id => loadedMaterials.find(m => m.id === id))
            .filter(Boolean)
            .map(m => m.nombre);

        let folioTransferencia = null;
        let anticipoRequerido = 50;

        if (metodoPago === 'efectivo') {
            anticipoRequerido = 0;
            folioTransferencia = null;
        } else if (metodoPago === 'transferencia') {
            const rawFolio = document.getElementById('folio_transferencia')?.value.trim() || '';
            folioTransferencia = rawFolio || null;
        } else if (metodoPago === 'mercadopago') {
            anticipoRequerido = 50;
            folioTransferencia = null;
        } else if (metodoPago === 'pasarela_futura') {
            const cardCheck = validateCardFields();
            if (!cardCheck.valid) {
                showAlert(cardCheck.message, 'error');
                return;
            }
            folioTransferencia = `TARJETA-****${cardCheck.last4}`;
        }

        const payload = {
            nombre_cliente: nombreCliente,
            telefono_cliente: telefonoCliente,
            correo_cliente: correoCliente,   // campo principal que usa el controlador
            email: correoCliente,            // alias por compatibilidad
            servicio_id: servicioId,
            fecha_cita: fechaCita,
            hora_cita: horaCita,
            notas_diseno: notasDiseno,
            materiales_ids: selectedMaterialIds,
            materiales_seleccionados: selectedMaterialsNames,
            total_estimado: totalEstimado,
            metodo_pago: metodoPago,
            anticipo_requerido: anticipoRequerido,
            folio_transferencia: folioTransferencia
        };

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>⏳</span> Verificando disponibilidad y guardando...';

        try {
            const res = await fetch('/api/citas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success && result.data) {
                // Obtener nombre del servicio
                const optSelected = selectServicio.selectedOptions[0];
                const servicioNombre = optSelected ? optSelected.getAttribute('data-name') : 'Servicio en Salón';

                // Limpiar sessionStorage de presupuesto
                sessionStorage.removeItem('yessy_presupuesto');

                if (metodoPago === 'mercadopago') {
                    await handleMercadoPagoCitaFlow(result.data, servicioNombre);
                } else {
                    showConfirmationView(result.data, servicioNombre);
                }
            } else {
                showAlert(result.message || 'No se pudo agendar la cita. Por favor intenta otro horario.', 'error');
                if (res.status === 409) {
                    loadMaterialsConfigurator();
                }
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Confirmar y Solicitar Cita 💅';
            }
        } catch (error) {
            showAlert('Error de conexión con el servidor. Intenta de nuevo en unos momentos.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = 'Confirmar y Solicitar Cita 💅';
        }
    });
}

function showAlert(message, type = 'error') {
    const alertBox = document.getElementById('booking-alert');
    if (!alertBox) return;

    alertBox.style.display = 'block';
    if (type === 'error') {
        alertBox.style.background = '#FFEBEE';
        alertBox.style.color = '#C62828';
        alertBox.style.border = '1px solid #FFCDD2';
    } else {
        alertBox.style.background = '#E8F5E9';
        alertBox.style.color = '#2E7D32';
        alertBox.style.border = '1px solid #A5D6A7';
    }
    alertBox.innerHTML = `<strong>Aviso:</strong> ${escapeHTML(message)}`;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

let lastConfirmedCita = null;

async function handleMercadoPagoCitaFlow(cita, servicioNombre) {
    try {
        const prefRes = await fetch('/api/pagos/crear-preferencia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tipo: 'cita',
                referencia_id: cita.id,
                folio: cita.folio,
                titulo: `Anticipo Cita Yessy Nails - ${servicioNombre}`,
                monto: 50,
                correo_cliente: cita.correo_cliente,
                nombre_cliente: cita.nombre_cliente
            })
        });
        const prefJson = await prefRes.json();
        const pref = prefJson.data || {};

        if (!pref.sandbox_simulado && (pref.sandbox_init_point || pref.init_point)) {
            window.open(pref.sandbox_init_point || pref.init_point, '_blank', 'noopener');
        }

        openMpSandboxModal(cita, servicioNombre, 50);
    } catch (err) {
        showConfirmationView(cita, servicioNombre);
    }
}

function openMpSandboxModal(cita, servicioNombre, monto) {
    const modal = document.getElementById('mp-sandbox-modal');
    if (!modal) {
        showConfirmationView(cita, servicioNombre);
        return;
    }

    document.getElementById('mp-modal-folio').textContent = cita.folio || `#${cita.id}`;
    document.getElementById('mp-modal-titulo').textContent = `Anticipo Cita — ${servicioNombre}`;
    document.getElementById('mp-modal-monto').textContent = `$${Number(monto).toFixed(2)} MXN`;
    modal.style.display = 'flex';

    const btnConfirm = document.getElementById('btn-mp-confirm');
    const btnCancel  = document.getElementById('btn-mp-cancel');

    btnConfirm.onclick = async () => {
        btnConfirm.disabled = true;
        btnConfirm.textContent = '⏳ Confirmando pago...';
        try {
            const confRes = await fetch('/api/pagos/confirmar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'cita', id: cita.id, folio: cita.folio })
            });
            const confJson = await confRes.json();
            const finalCita = confJson.success && confJson.data ? { ...cita, ...confJson.data } : { ...cita, pago_estado: 'pagado', estado_pago: 'pagado' };
            modal.style.display = 'none';
            showConfirmationView(finalCita, servicioNombre);
        } catch (e) {
            modal.style.display = 'none';
            showConfirmationView(cita, servicioNombre);
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = '✅ Aprobar Pago (Sandbox)';
        }
    };

    btnCancel.onclick = () => {
        modal.style.display = 'none';
        showConfirmationView(cita, servicioNombre);
    };
}

window.downloadAppointmentQrPass = function downloadAppointmentQrPass() {
    if (!lastConfirmedCita || !lastConfirmedCita.codigo_qr) return;
    const link = document.createElement('a');
    link.href = lastConfirmedCita.codigo_qr;
    link.download = `Pase-${lastConfirmedCita.folio || 'YessyNails'}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
};

/**
 * Muestra la vista de confirmación visual con Pase Digital y Código QR
 */
function showConfirmationView(cita, servicioNombre) {
    lastConfirmedCita = cita;
    const formCard = document.getElementById('booking-form-card');
    const confirmView = document.getElementById('confirmation-view');

    if (formCard) formCard.style.display = 'none';
    if (confirmView) {
        confirmView.style.display = 'block';
        confirmView.scrollIntoView({ behavior: 'smooth' });
    }

    const folioDisplay = cita.folio || `#${cita.id}`;
    const isPaid = cita.pago_estado === 'pagado' || cita.estado_pago === 'pagado';

    // Código QR
    const qrImg = document.getElementById('conf-qr-img');
    const folioBadge = document.getElementById('conf-folio-badge');
    const pagoBadge = document.getElementById('conf-pago-badge');
    if (qrImg && cita.codigo_qr) {
        qrImg.src = cita.codigo_qr;
        qrImg.style.display = 'block';
    }
    if (folioBadge) folioBadge.textContent = folioDisplay;
    if (pagoBadge) {
        pagoBadge.textContent = isPaid ? '✅ PAGADO' : '⏳ PAGO PENDIENTE';
        pagoBadge.style.background = isPaid ? '#E8F5E9' : '#FFF3E0';
        pagoBadge.style.color = isPaid ? '#2E7D32' : '#E65100';
    }

    // Llenar datos en el comprobante visual
    document.getElementById('conf-folio').textContent = folioDisplay;
    document.getElementById('conf-nombre').textContent = cita.nombre_cliente;
    document.getElementById('conf-telefono').textContent = cita.telefono_cliente;

    // Mostrar correo si está disponible
    const confCorreoRow = document.getElementById('conf-correo-row');
    const confCorreo = document.getElementById('conf-correo');
    if (cita.correo_cliente && confCorreo && confCorreoRow) {
        confCorreo.textContent = cita.correo_cliente;
        confCorreoRow.style.display = 'flex';
    }

    document.getElementById('conf-servicio').textContent = servicioNombre;

    const matRow = document.getElementById('conf-materiales-row');
    const matEl = document.getElementById('conf-materiales');
    if (Array.isArray(cita.materiales_seleccionados) && cita.materiales_seleccionados.length > 0 && matRow && matEl) {
        matEl.textContent = cita.materiales_seleccionados.join(', ');
        matRow.style.display = 'flex';
    }

    document.getElementById('conf-fecha').textContent = `${formatDate(cita.fecha_cita)} a las ${formatTime(cita.hora_cita)}`;
    document.getElementById('conf-total').textContent = `$${parseFloat(cita.monto_total ?? cita.total_estimado ?? 0).toFixed(2)} MXN`;

    const metodoTexto = cita.metodo_pago === 'transferencia'
        ? 'Transferencia SPEI ($50 anticipo)'
        : cita.metodo_pago === 'pasarela_futura'
            ? 'Pago en Línea — Mercado Pago Sandbox ($50 anticipo)'
            : 'Pago en sucursal (100% efectivo — Sin anticipo)';
    document.getElementById('conf-metodo').textContent = metodoTexto;

    // Configurar botón opcional de comprobante por WhatsApp a Yessica
    const waBtn = document.getElementById('btn-send-whatsapp-voucher');
    if (waBtn) {
        const waText = 
`¡Hola Yessica! Acabo de registrar mi cita en Yessy Nails 💅✨

📌 *Folio de Reserva:* ${folioDisplay}
👤 *Cliente:* ${cita.nombre_cliente}
📱 *WhatsApp:* ${cita.telefono_cliente}
💅 *Servicio:* ${servicioNombre}
📅 *Fecha:* ${formatDate(cita.fecha_cita)}
🕐 *Hora:* ${formatTime(cita.hora_cita)}
💳 *Método de Pago:* ${metodoTexto} (${isPaid ? 'PAGADO' : 'PENDIENTE'})
💵 *Total Estimado:* $${parseFloat(cita.monto_total ?? cita.total_estimado ?? 0).toFixed(2)} MXN
📝 *Notas / Referencia:* ${cita.notas_diseno || 'Sin notas adicionales'}

¿Me confirmas la disponibilidad para mi cita, por favor? Muchas gracias 🥰`;

        waBtn.href = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(waText)}`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return dateStr;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0]);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
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
