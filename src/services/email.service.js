// ================================================================
// YESSY NAILS — Servicio de Correos Electrónicos
// ----------------------------------------------------------------
// Estrategia de envío (en orden de prioridad):
//   1. API HTTP de Brevo  → usa BREVO_API_KEY + EMAIL_FROM (NO usa
//      puertos SMTP, por lo que funciona en la nube aunque SMTP esté
//      bloqueado).
//   2. Nodemailer (opcional) → si existen EMAIL_USER + EMAIL_PASS.
//   3. Sin configuración   → sólo se registra un log en consola.
//
// Si no hay variables configuradas, NADA se rompe: el envío se
// resuelve como "no enviado" y el flujo continúa con normalidad.
// ================================================================

import 'dotenv/config';

// ── Variables de entorno ────────────────────────────────────────
const BREVO_API_KEY   = (process.env.BREVO_API_KEY || '').trim();
const EMAIL_FROM      = (process.env.EMAIL_FROM || '').trim();
const EMAIL_FROM_NAME = (process.env.EMAIL_FROM_NAME || 'Yessy Nails').trim();
const EMAIL_REPLY_TO  = (process.env.EMAIL_REPLY_TO || EMAIL_FROM).trim();
const ADMIN_EMAIL     = (process.env.ADMIN_EMAIL || EMAIL_FROM).trim();
const EMAIL_USER      = (process.env.EMAIL_USER || '').trim();
const EMAIL_PASS      = (process.env.EMAIL_PASS || '').trim();

/**
 * Indica si hay alguna vía de envío configurada.
 */
export function isEmailConfigured() {
    return (Boolean(BREVO_API_KEY && EMAIL_FROM)) || (Boolean(EMAIL_USER && EMAIL_PASS));
}

/**
 * Devuelve el correo del administrador configurado (para avisos internos).
 */
export function getAdminEmail() {
    return ADMIN_EMAIL || null;
}

// ── Plantilla base con identidad de Yessy Nails ─────────────────
function wrapEmail(title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FBF7F4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#4A3F3F;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#F3E1E6 0%,#F7EDE2 100%);border-radius:16px 16px 0 0;padding:28px;text-align:center;">
      <div style="font-size:30px;">💅</div>
      <h1 style="margin:8px 0 0;font-size:22px;color:#7A4E5A;">Yessy Nails</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#8A7A76;">Yessica Marlen Calderón Luna • Ecatepec de Morelos</p>
    </div>
    <div style="background:#FFFFFF;padding:28px;border:1px solid #EFE3E0;border-top:none;border-radius:0 0 16px 16px;">
      <h2 style="margin:0 0 16px;font-size:19px;color:#4A3F3F;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-size:12px;color:#A99C97;margin-top:16px;">
      Este correo fue enviado automáticamente por Yessy Nails. Si tienes dudas escríbenos por WhatsApp.
    </p>
  </div>
</body>
</html>`;
}

function money(value) {
    return `$${parseFloat(value || 0).toFixed(2)} MXN`;
}

function formatDateMx(fecha) {
    if (!fecha) return '';
    const parts = String(fecha).split('-');
    if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return String(fecha);
}

// ================================================================
// ENVÍO
// ================================================================

/**
 * Envía un correo. Nunca lanza excepción: devuelve { sent, provider, reason }.
 * @param {object} opts { to, subject, html, text, replyTo }
 */
export async function sendEmail({ to, subject, html, text }) {
    const recipient = (to || '').trim();

    if (!recipient) {
        return { sent: false, reason: 'sin destinatario' };
    }

    const fromEmail = EMAIL_FROM || EMAIL_USER;

    // 1) Sin configuración → sólo log
    if (!isEmailConfigured() || !fromEmail) {
        console.log(`✉️  [email] (no configurado) → "${subject}" para ${recipient}`);
        return { sent: false, reason: 'correo no configurado' };
    }

    // 2) Brevo (HTTP API)
    if (BREVO_API_KEY && EMAIL_FROM) {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
                    to: [{ email: recipient }],
                    subject,
                    htmlContent: html,
                    textContent: text || undefined,
                    replyTo: EMAIL_REPLY_TO ? { email: EMAIL_REPLY_TO } : undefined
                })
            });

            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                console.warn(`✉️  [email] Brevo respondió ${res.status}: ${detail}`);
                return { sent: false, provider: 'brevo', reason: `HTTP ${res.status}` };
            }
            console.log(`✉️  [email] enviado vía Brevo → ${recipient}`);
            return { sent: true, provider: 'brevo' };
        } catch (err) {
            console.warn('✉️  [email] Error con Brevo:', err.message);
            // continúa al respaldo de Nodemailer si está disponible
        }
    }

    // 3) Respaldo opcional con Nodemailer (importación dinámica)
    if (EMAIL_USER && EMAIL_PASS) {
        try {
            const nodemailer = await import('nodemailer');
            const transport = nodemailer.default.createTransport({
                service: 'gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS }
            });
            await transport.sendMail({
                from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
                to: recipient,
                subject,
                html,
                text: text || undefined
            });
            console.log(`✉️  [email] enviado vía Nodemailer → ${recipient}`);
            return { sent: true, provider: 'nodemailer' };
        } catch (err) {
            console.warn('✉️  [email] Error con Nodemailer:', err.message);
            return { sent: false, provider: 'nodemailer', reason: err.message };
        }
    }

    return { sent: false, reason: 'sin proveedor disponible' };
}

// ================================================================
// PLANTILLAS DE CORREO
// ================================================================

export function buildAppointmentClientEmail(cita, servicioNombre) {
    const body = `
      <p>¡Hola <strong>${cita.nombre_cliente}</strong>! 💕</p>
      <p>Recibimos tu solicitud de cita en Yessy Nails. Aquí está el resumen:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr><td style="padding:6px 0;color:#8A7A76;">Folio:</td><td style="padding:6px 0;text-align:right;font-weight:700;">#${cita.id}</td></tr>
        <tr><td style="padding:6px 0;color:#8A7A76;">Servicio:</td><td style="padding:6px 0;text-align:right;">${servicioNombre || 'Servicio en salón'}</td></tr>
        <tr><td style="padding:6px 0;color:#8A7A76;">Fecha:</td><td style="padding:6px 0;text-align:right;">${formatDateMx(cita.fecha_cita)}</td></tr>
        <tr><td style="padding:6px 0;color:#8A7A76;">Hora:</td><td style="padding:6px 0;text-align:right;">${cita.hora_cita}</td></tr>
        <tr><td style="padding:6px 0;color:#8A7A76;">Total estimado:</td><td style="padding:6px 0;text-align:right;font-weight:700;">${money(cita.total_estimado)}</td></tr>
        <tr><td style="padding:6px 0;color:#8A7A76;">Anticipo para apartar:</td><td style="padding:6px 0;text-align:right;font-weight:700;">$50.00 MXN</td></tr>
      </table>
      <p style="background:#FFF6E9;border:1px solid #F1D9A8;border-radius:10px;padding:12px;font-size:13px;">
        📌 <strong>Importante:</strong> tu cita queda <strong>pendiente</strong> hasta confirmar el anticipo de $50 MXN (transferencia SPEI) o hasta que Yessica te confirme. El resto se paga en efectivo o transferencia al acudir.
      </p>
      <p>¡Te esperamos con mucho gusto! ✨</p>
    `;
    return { subject: `💅 Tu cita #${cita.id} en Yessy Nails`, html: wrapEmail('Tu cita fue registrada', body) };
}

export function buildAppointmentAdminEmail(cita, servicioNombre) {
    const esTransferencia = cita.metodo_pago === 'transferencia';
    const intro = esTransferencia
        ? `<p>Se agendó una <strong>nueva cita con pago vía transferencia SPEI</strong>:</p>`
        : `<p>Entró una <strong>nueva cita</strong> al sistema:</p>`;

    const body = `
      ${intro}
      <ul style="font-size:14px;line-height:1.7;">
        <li><strong>Folio:</strong> #${cita.id}</li>
        <li><strong>Clienta:</strong> ${cita.nombre_cliente}</li>
        <li><strong>Teléfono:</strong> ${cita.telefono_cliente || '-'}</li>
        <li><strong>Correo:</strong> ${cita.correo_cliente || '-'}</li>
        <li><strong>Servicio:</strong> ${servicioNombre || 'Servicio en salón'}</li>
        <li><strong>Fecha:</strong> ${formatDateMx(cita.fecha_cita)} a las ${cita.hora_cita}</li>
        <li><strong>Método de pago:</strong> ${esTransferencia ? 'Transferencia SPEI' : (cita.metodo_pago || '-')}</li>
        <li><strong>Estado / Folio de anticipo:</strong> ${cita.folio_transferencia || 'No enviado'}</li>
      </ul>
      <p style="font-size:13px;color:#8A7A76;">Confirma o gestiona la cita desde el panel /admin.</p>
    `;
    const subject = esTransferencia
        ? `📲 Nueva cita vía Transferencia #${cita.id} — ${cita.nombre_cliente}`
        : `📅 Nueva cita #${cita.id} — ${cita.nombre_cliente}`;
    return { subject, html: wrapEmail(esTransferencia ? 'Nueva cita vía transferencia' : 'Nueva cita registrada', body) };
}

export function buildAppointmentCancelledEmail(cita, motivo = '') {
    const body = `
      <p>Hola <strong>${cita.nombre_cliente}</strong>,</p>
      <p>Tu cita <strong>#${cita.id}</strong> del <strong>${formatDateMx(cita.fecha_cita)} a las ${cita.hora_cita}</strong> fue <strong>cancelada</strong>.</p>
      ${motivo ? `<p style="background:#FDEEEE;border:1px solid #F3C9C9;border-radius:10px;padding:12px;font-size:13px;">${motivo}</p>` : ''}
      <p>Si deseas reagendar, contáctanos por WhatsApp o agenda de nuevo en el sitio. 💕</p>
    `;
    return { subject: `❌ Tu cita #${cita.id} fue cancelada — Yessy Nails`, html: wrapEmail('Cita cancelada', body) };
}

export function buildOrderClientEmail(pedido) {
    const items = Array.isArray(pedido.items_json) ? pedido.items_json : [];
    const rows = items.map(it =>
        `<tr><td style="padding:5px 0;">${it.cantidad}× ${it.nombre}</td><td style="padding:5px 0;text-align:right;">${money((it.precio || 0) * (it.cantidad || 1))}</td></tr>`
    ).join('');
    const entrega = pedido.tipo_entrega === 'estudio'
        ? 'Recoger en el estudio'
        : `Entrega a domicilio / punto medio: ${pedido.direccion_entrega || 'por definir'}`;

    const body = `
      <p>¡Hola <strong>${pedido.nombre_cliente}</strong>! 💕</p>
      <p>Recibimos tu pedido de productos Yessy Nails:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        ${rows}
        <tr><td style="padding:8px 0;border-top:1px solid #EFE3E0;font-weight:700;">Total</td><td style="padding:8px 0;border-top:1px solid #EFE3E0;text-align:right;font-weight:700;">${money(pedido.total)}</td></tr>
      </table>
      <p style="font-size:14px;"><strong>Entrega:</strong> ${entrega}</p>
      <p style="font-size:13px;color:#8A7A76;">Te contactaremos para coordinar el pago y la entrega. ✨</p>
    `;
    return { subject: `🛍️ Recibimos tu pedido en Yessy Nails`, html: wrapEmail('Tu pedido fue recibido', body) };
}

export function buildOrderAdminEmail(pedido) {
    const items = Array.isArray(pedido.items_json) ? pedido.items_json : [];
    const lis = items.map(it => `<li>${it.cantidad}× ${it.nombre} — ${money((it.precio || 0) * (it.cantidad || 1))}</li>`).join('');
    const body = `
      <p>Entró un <strong>nuevo pedido</strong>:</p>
      <ul style="font-size:14px;line-height:1.7;">
        <li><strong>Clienta:</strong> ${pedido.nombre_cliente}</li>
        <li><strong>Teléfono:</strong> ${pedido.telefono_cliente || '-'}</li>
        <li><strong>Correo:</strong> ${pedido.correo_cliente || '-'}</li>
        <li><strong>Entrega:</strong> ${pedido.tipo_entrega === 'estudio' ? 'Recoge en estudio' : 'Domicilio / punto medio'}</li>
        <li><strong>Dirección:</strong> ${pedido.direccion_entrega || '-'}</li>
        <li><strong>Total:</strong> ${money(pedido.total)}</li>
      </ul>
      <p><strong>Productos:</strong></p>
      <ul style="font-size:14px;line-height:1.7;">${lis}</ul>
    `;
    return { subject: `🛍️ Nuevo pedido — ${pedido.nombre_cliente}`, html: wrapEmail('Nuevo pedido recibido', body) };
}

export function buildOfferEmail(mensaje, clientaNombre = '') {
    const saludo = clientaNombre ? `<p>¡Hola <strong>${clientaNombre}</strong>! 💕</p>` : '<p>¡Hola! 💕</p>';
    const body = `
      ${saludo}
      <div style="font-size:15px;line-height:1.7;white-space:pre-line;">${mensaje}</div>
      <p style="margin-top:20px;">
        <a href="${process.env.SITE_URL || '#'}" style="background:#C9A84C;color:#fff;text-decoration:none;padding:12px 22px;border-radius:30px;font-weight:700;display:inline-block;">Agendar mi cita ✨</a>
      </p>
    `;
    return { subject: '✨ Promoción del mes — Yessy Nails', html: wrapEmail('Promoción especial para ti', body) };
}

export default {
    isEmailConfigured,
    getAdminEmail,
    sendEmail,
    buildAppointmentClientEmail,
    buildAppointmentAdminEmail,
    buildAppointmentCancelledEmail,
    buildOrderClientEmail,
    buildOrderAdminEmail,
    buildOfferEmail
};
