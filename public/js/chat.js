/**
 * ================================================================
 * YESSY NAILS — Sistema de Chat Interno en Tiempo Real
 * Salón de uñas de Yessica Marlen Calderón Luna
 * Soporta: Widget flotante en todas las páginas y página chat.html
 * ================================================================
 */

const YESSY_CHAT = {
    salaId: null,
    clienteNombre: null,
    pollingTimer: null,
    lastMessagesCount: 0,
    isOpen: false,
    whatsappPhone: '5215587431290',

    init() {
        this.initStorage();
        this.fetchConfig();
        this.initDOM();
        this.startPolling();
    },

    // 1. Inicializar o recuperar sala y nombre desde localStorage
    initStorage() {
        let storedSalaId = localStorage.getItem('yessy_chat_sala_id');
        if (!storedSalaId) {
            storedSalaId = 'sala_cliente_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            localStorage.setItem('yessy_chat_sala_id', storedSalaId);
        }
        this.salaId = storedSalaId;
        this.clienteNombre = localStorage.getItem('yessy_chat_cliente_nombre') || '';
    },

    // 2. Obtener teléfono de WhatsApp desde /api/config
    async fetchConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.telefono_whatsapp) {
                    this.whatsappPhone = json.data.telefono_whatsapp.replace(/[^0-9]/g, '');
                    this.updateWhatsAppButtons();
                }
            }
        } catch (e) {
            // Usa fallback
        }
    },

    updateWhatsAppButtons() {
        const cleanPhone = this.whatsappPhone;
        const waUrl = `https://wa.me/${cleanPhone}?text=Hola%20Yessica,%20me%20gustaría%20agendar%20una%20cita%20en%20Yessy%20Nails%20💅`;
        const buttons = document.querySelectorAll('.dyn-whatsapp-link, .whatsapp-float');
        buttons.forEach(btn => {
            btn.href = waUrl;
        });
    },

    // 3. Inicializar elementos del DOM (Drawer Widget & página completa)
    initDOM() {
        // Asegurar que el widget flotante exista en la página (si no existe, se inyecta)
        if (!document.getElementById('yessy-chat-widget-root') && !document.getElementById('chat-page-root')) {
            this.injectFloatingWidget();
        }

        // Configurar Listeners
        const toggleBtn = document.getElementById('chat-widget-toggle-btn');
        const closeBtn = document.getElementById('chat-drawer-close-btn');
        const nameForm = document.getElementById('chat-name-form');
        const sendForm = document.getElementById('chat-send-form');
        const changeNameBtn = document.getElementById('chat-change-name-btn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleDrawer());
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDrawer());
        }
        if (changeNameBtn) {
            changeNameBtn.addEventListener('click', () => this.resetName());
        }
        if (nameForm) {
            nameForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('chat-name-input');
                const nombre = input.value.trim();
                if (nombre) {
                    this.setClienteNombre(nombre);
                }
            });
        }
        if (sendForm) {
            sendForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = document.getElementById('chat-message-input');
                const msg = input.value.trim();
                if (msg) {
                    this.sendMessage(msg);
                    input.value = '';
                }
            });
        }

        // Actualizar vistas (Onboarding o Mensajes)
        this.updateViews();
    },

    // Inyecta el widget flotante en páginas estándar
    injectFloatingWidget() {
        const widgetHTML = `
            <div id="yessy-chat-widget-root">
                <!-- Botón flotante para abrir el Chat -->
                <button type="button" class="chat-float-btn" id="chat-widget-toggle-btn" aria-label="Abrir chat en vivo con Yessy" title="Chatear con Yessy Nails">
                    <span class="chat-btn-icon">💬</span>
                    <span class="chat-btn-text">Chat en Vivo</span>
                    <span class="chat-unread-badge" id="chat-unread-badge" style="display: none;">0</span>
                </button>

                <!-- Drawer / Ventana Flotante del Chat -->
                <div class="chat-drawer" id="chat-drawer-box" role="dialog" aria-labelledby="chat-header-title">
                    <!-- Cabecera del Chat -->
                    <div class="chat-drawer-header">
                        <div class="chat-header-user">
                            <div class="chat-header-avatar">YN</div>
                            <div>
                                <h4 id="chat-header-title">Yessy Nails • Chat</h4>
                                <div class="chat-header-status">
                                    <span class="status-dot"></span>
                                    <span>Yessica Marlen • En Línea ✨</span>
                                </div>
                            </div>
                        </div>
                        <div class="chat-header-actions">
                            <button type="button" class="chat-hdr-btn" id="chat-change-name-btn" title="Cambiar mi nombre">👤</button>
                            <button type="button" class="chat-hdr-btn" id="chat-drawer-close-btn" title="Cerrar ventana">✕</button>
                        </div>
                    </div>

                    <!-- Vista 1: Ingreso de Nombre (Onboarding) -->
                    <div class="chat-body-onboarding" id="chat-view-onboarding" style="display: none;">
                        <div class="onboarding-icon">💅</div>
                        <h3>¡Hola hermosa!</h3>
                        <p>Bienvenida al chat en directo de <strong>Yessy Nails</strong>. Dinos tu nombre para que Yessica pueda atenderte de forma personalizada:</p>
                        <form id="chat-name-form" class="chat-onboarding-form">
                            <input type="text" id="chat-name-input" class="chat-input-control" placeholder="Tu nombre o apodo..." maxlength="60" required autofocus>
                            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.75rem;">
                                Comenzar a Chatear ✨
                            </button>
                        </form>
                        <small style="color: var(--color-text-light); margin-top: 1rem; display: block;">
                            🔒 Tu sesión se guardará automáticamente en este dispositivo.
                        </small>
                    </div>

                    <!-- Vista 2: Mensajes y Conversación Activa -->
                    <div class="chat-body-messages" id="chat-view-messages" style="display: none;">
                        <!-- Saludo y banner de sala -->
                        <div class="chat-welcome-banner">
                            <p>💅 <strong>Estás conectada con Yessica Marlen</strong></p>
                            <span id="chat-current-user-tag" style="font-size: 0.8rem; color: var(--color-accent-dark);"></span>
                        </div>

                        <!-- Lista de mensajes con scroll automático -->
                        <div class="chat-messages-scroller" id="chat-messages-container">
                            <div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: 2rem 0;">
                                Cargando mensajes...
                            </div>
                        </div>

                        <!-- Formulario de envío -->
                        <form id="chat-send-form" class="chat-footer-form">
                            <input type="text" id="chat-message-input" class="chat-input-control" placeholder="Escribe tu mensaje o duda..." maxlength="1000" autocomplete="off" required>
                            <button type="submit" class="chat-send-btn" id="chat-send-btn" aria-label="Enviar mensaje">
                                ➤
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },

    updateViews() {
        const onboardingView = document.getElementById('chat-view-onboarding');
        const messagesView = document.getElementById('chat-view-messages');
        const userTag = document.getElementById('chat-current-user-tag');

        if (!onboardingView || !messagesView) return;

        if (!this.clienteNombre) {
            onboardingView.style.display = 'flex';
            messagesView.style.display = 'none';
        } else {
            onboardingView.style.display = 'none';
            messagesView.style.display = 'flex';
            if (userTag) {
                userTag.textContent = `Chateando como: ${this.clienteNombre}`;
            }
            this.loadMessages(true);
        }
    },

    setClienteNombre(nombre) {
        this.clienteNombre = nombre;
        localStorage.setItem('yessy_chat_cliente_nombre', nombre);
        this.updateViews();
        // Mensaje de bienvenida inicial si la sala está vacía
        this.sendInitialGreeting();
    },

    resetName() {
        const nuevo = prompt('¿Cómo te gustaría que te llame Yessica?', this.clienteNombre || '');
        if (nuevo && nuevo.trim()) {
            this.setClienteNombre(nuevo.trim());
        }
    },

    async sendInitialGreeting() {
        try {
            const res = await fetch(`/api/chat/${encodeURIComponent(this.salaId)}`);
            if (res.ok) {
                const json = await res.json();
                const msgs = json.data || [];
                if (msgs.length === 0) {
                    // Enviar mensaje de entrada
                    await this.sendMessage(`¡Hola Yessy! Soy ${this.clienteNombre}, me gustaría información sobre tus servicios y citas.`);
                }
            }
        } catch (e) {}
    },

    toggleDrawer() {
        const drawer = document.getElementById('chat-drawer-box');
        if (!drawer) return;
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            drawer.classList.add('active');
            this.clearUnreadBadge();
            this.scrollToBottom();
            const input = document.getElementById('chat-message-input');
            if (input) input.focus();
        } else {
            drawer.classList.remove('active');
        }
    },

    openDrawer() {
        const drawer = document.getElementById('chat-drawer-box');
        if (drawer) {
            this.isOpen = true;
            drawer.classList.add('active');
            this.clearUnreadBadge();
            this.scrollToBottom();
        }
    },

    closeDrawer() {
        const drawer = document.getElementById('chat-drawer-box');
        if (drawer) {
            this.isOpen = false;
            drawer.classList.remove('active');
        }
    },

    // 4. Polling cada 4 segundos con GET /api/chat/:salaId
    startPolling() {
        if (this.pollingTimer) clearInterval(this.pollingTimer);

        // Primera carga inmediata
        this.loadMessages();

        // Polling regular cada 4 segundos
        this.pollingTimer = setInterval(() => {
            this.loadMessages();
        }, 4000);
    },

    async loadMessages(forceScroll = false) {
        if (!this.salaId) return;

        try {
            const res = await fetch(`/api/chat/${encodeURIComponent(this.salaId)}`);
            if (!res.ok) return;

            const json = await res.json();
            const mensajes = json.data || [];

            // Detectar nuevos mensajes para scroll o badge
            const hasNewMessages = mensajes.length !== this.lastMessagesCount;
            if (hasNewMessages || forceScroll) {
                this.renderMessages(mensajes);

                // Si hay nuevos mensajes y el drawer está cerrado, mostrar badge
                if (hasNewMessages && !this.isOpen && this.lastMessagesCount > 0) {
                    const nuevosYessica = mensajes.filter(m => m.rol === 'yessica' && !m.leido);
                    if (nuevosYessica.length > 0) {
                        this.showUnreadBadge(nuevosYessica.length);
                    }
                }

                this.lastMessagesCount = mensajes.length;
                this.scrollToBottom();
            }
        } catch (e) {
            // Error de conexión temporal en polling
        }
    },

    // Renderiza burbujas de mensaje diferenciando clienta y salón
    renderMessages(mensajes) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;

        if (mensajes.length === 0) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <span>💅</span>
                    <p>¡Inicia la conversación! Escribe tus dudas sobre diseños, agenda o cotizaciones.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = mensajes.map(msg => {
            const isCliente = msg.rol === 'cliente';
            const timeStr = this.formatMsgTime(msg.fecha_envio);

            if (isCliente) {
                // Burbuja Clienta (Derecha, Rosa Empolvado / Nude)
                return `
                    <div class="msg-row msg-row-client">
                        <div class="msg-bubble msg-bubble-client">
                            <p class="msg-text">${this.escapeHTML(msg.mensaje)}</p>
                            <span class="msg-time">${timeStr} ✓</span>
                        </div>
                    </div>
                `;
            } else {
                // Burbuja Salón / Yessica (Izquierda, Blanco Marfil / Oro)
                return `
                    <div class="msg-row msg-row-salon">
                        <div class="msg-salon-avatar" title="Yessica Marlen">YN</div>
                        <div class="msg-bubble msg-bubble-salon">
                            <span class="msg-sender-name">Yessica Calderón • Nail Artist ✨</span>
                            <p class="msg-text">${this.escapeHTML(msg.mensaje)}</p>
                            <span class="msg-time">${timeStr}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
    },

    // 5. Enviar mensaje mediante POST /api/chat
    async sendMessage(texto) {
        if (!texto || !this.salaId) return;

        const nombre = this.clienteNombre || 'Clienta';
        const payload = {
            sala_cliente_id: this.salaId,
            nombre_remitente: nombre,
            rol: 'cliente',
            mensaje: texto
        };

        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await this.loadMessages(true);
            }
        } catch (e) {
            alert('No se pudo enviar el mensaje. Revisa tu conexión.');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    },

    scrollToBottom() {
        const scroller = document.getElementById('chat-messages-container');
        if (scroller) {
            setTimeout(() => {
                scroller.scrollTop = scroller.scrollHeight;
            }, 50);
        }
    },

    showUnreadBadge(count) {
        const badge = document.getElementById('chat-unread-badge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = 'flex';
        }
    },

    clearUnreadBadge() {
        const badge = document.getElementById('chat-unread-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    },

    formatMsgTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleString('es-MX', {
                timeZone: 'America/Mexico_City',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return '';
        }
    },

    escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

// Arrancar automáticamente
document.addEventListener('DOMContentLoaded', () => {
    YESSY_CHAT.init();
});
