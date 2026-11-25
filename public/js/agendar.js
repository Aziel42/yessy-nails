/**
 * ================================================================
 * YESSY NAILS — JavaScript para Reservas de Citas (agendar.html)
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    loadServicesSelect();
    checkCotizadorParams();
    initPaymentMethodCards();
    initAppointmentForm();
});

let loadedServices = [];
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
                            <option value="${s.id}" data-price="${s.precio_base}" data-name="${escapeHTML(s.nombre)}">
                                ${escapeHTML(s.nombre)} — $${parseFloat(s.precio_base).toFixed(2)} MXN (${s.duracion_minutos} min)
                            </option>
                        `).join('')}
                    </optgroup>
                `).join('');

            // Si había un servicio preseleccionado por cotizador, aplicarlo ahora
            applyPreselectedService();
        }
    } catch (error) {
        console.warn('ℹ️ Usando catálogo estático de servicios:', error.message);
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

    // Si viene del portafolio con un diseño de referencia, rellenar las notas
    if (params.has('notas_diseno')) {
        const notasInput = document.getElementById('notas_diseno');
        if (notasInput && !notasInput.value) {
            notasInput.value = params.get('notas_diseno');
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
}

/* ----------------------------------------------------------------
   4. TARJETAS DE MÉTODO DE PAGO
   ---------------------------------------------------------------- */
function initPaymentMethodCards() {
    const labels = document.querySelectorAll('.payment-radio-label:not(.disabled)');
    labels.forEach(label => {
        label.addEventListener('click', () => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio && !radio.disabled) {
                radio.checked = true;
            }
        });
    });
}

/* ----------------------------------------------------------------
   5. ENVÍO DE FORMULARIO A POST /api/citas Y CONFIRMACIÓN
   ---------------------------------------------------------------- */
function initAppointmentForm() {
    const form = document.getElementById('appointment-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-submit-booking');
        const alertBox = document.getElementById('booking-alert');
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

        // Determinar total estimado
        let totalEstimado = activeQuoteTotal;
        if (!totalEstimado && selectServicio.selectedOptions[0]) {
            totalEstimado = parseFloat(selectServicio.selectedOptions[0].getAttribute('data-price')) || 500.00;
        }

        const folioTransferencia = form.folio_transferencia
            ? form.folio_transferencia.value.trim()
            : (document.getElementById('folio_transferencia')
                ? document.getElementById('folio_transferencia').value.trim()
                : '');

        const payload = {
            nombre_cliente: nombreCliente,
            telefono_cliente: telefonoCliente,
            correo_cliente: correoCliente,   // campo principal que usa el controlador
            email: correoCliente,            // alias por compatibilidad
            servicio_id: servicioId,
            fecha_cita: fechaCita,
            hora_cita: horaCita,
            notas_diseno: notasDiseno,
            total_estimado: totalEstimado,
            metodo_pago: metodoPago,
            anticipo_requerido: 50,
            folio_transferencia: folioTransferencia || null
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

                showConfirmationView(result.data, servicioNombre);
                // Limpiar sessionStorage de presupuesto
                sessionStorage.removeItem('yessy_presupuesto');
            } else {
                showAlert(result.message || 'No se pudo agendar la cita. Por favor intenta otro horario.', 'error');
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

/**
 * Muestra la vista de confirmación visual con resumen de reserva y botón WhatsApp
 */
function showConfirmationView(cita, servicioNombre) {
    const formCard = document.getElementById('booking-form-card');
    const confirmView = document.getElementById('confirmation-view');

    if (formCard) formCard.style.display = 'none';
    if (confirmView) {
        confirmView.style.display = 'block';
        confirmView.scrollIntoView({ behavior: 'smooth' });
    }

    // Llenar datos en el comprobante visual
    document.getElementById('conf-folio').textContent = `#${cita.id}`;
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
    document.getElementById('conf-fecha').textContent = `${formatDate(cita.fecha_cita)} a las ${formatTime(cita.hora_cita)}`;
    document.getElementById('conf-total').textContent = `$${parseFloat(cita.total_estimado || 0).toFixed(2)} MXN`;

    const metodoTexto = cita.metodo_pago === 'transferencia' 
        ? 'Transferencia bancaria previa' 
        : 'Pago en sucursal (Efectivo)';
    document.getElementById('conf-metodo').textContent = metodoTexto;

    // Configurar botón opcional de comprobante por WhatsApp a Yessica
    const waBtn = document.getElementById('btn-send-whatsapp-voucher');
    if (waBtn) {
        const waText = 
`¡Hola Yessica! Acabo de registrar mi cita en Yessy Nails 💅✨

📌 *Folio de Reserva:* #${cita.id}
👤 *Cliente:* ${cita.nombre_cliente}
📱 *WhatsApp:* ${cita.telefono_cliente}
💅 *Servicio:* ${servicioNombre}
📅 *Fecha:* ${formatDate(cita.fecha_cita)}
🕐 *Hora:* ${formatTime(cita.hora_cita)}
💳 *Método de Pago:* ${metodoTexto}
💵 *Total Estimado:* $${parseFloat(cita.total_estimado || 0).toFixed(2)} MXN
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
