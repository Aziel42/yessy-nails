/**
 * ================================================================
 * YESSY NAILS — JavaScript del Panel Administrativo (admin.js)
 * Salón de uñas de Yessica Marlen Calderón Luna
 * ================================================================
 */

const ADMIN_APP = {
    token: null,
    user: null,
    activeTab: 'config',
    activeChatRoomId: null,
    chatPollingInterval: null,
    allServices: [],
    allPortfolio: [],
    allAppointments: [],

    init() {
        this.token = localStorage.getItem('yessy_admin_token');
        const storedUser = localStorage.getItem('yessy_admin_user');
        if (storedUser) {
            try { this.user = JSON.parse(storedUser); } catch(e) {}
        }

        if (this.token) {
            this.showDashboard();
        } else {
            this.showLogin();
        }

        this.initEventListeners();
    },

    // ── Headers para peticiones autenticadas ─────────────────────
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    },

    // ── Subida de imágenes (POST /api/upload) ────────────────────
    async uploadImageFile(file) {
        const formData = new FormData();
        formData.append('imagen', file);

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: formData
        });
        const json = await res.json();

        if (!json.success) {
            throw new Error(json.message || 'No se pudo subir la imagen.');
        }
        return json.data.url;
    },

    // Maneja el cambio de un input type="file": sube la imagen y escribe
    // la URL devuelta en el campo de texto (manteniendo compatibilidad con URLs).
    async handleImageUpload(event, urlFieldName, previewId) {
        const input = event.target;
        const file = input.files && input.files[0];
        if (!file) return;

        try {
            const url = await this.uploadImageFile(file);

            const urlInput = (input.form && input.form[urlFieldName])
                ? input.form[urlFieldName]
                : document.getElementById(urlFieldName);
            if (urlInput) urlInput.value = url;

            if (previewId) {
                const preview = document.getElementById(previewId);
                if (preview) {
                    preview.src = url;
                    preview.style.display = 'block';
                }
            }
        } catch (error) {
            alert(error.message || 'Error al subir la imagen.');
            input.value = '';
        }
    },

    // ── 1. GESTIÓN DE SESIÓN Y VISTAS ────────────────────────────
    showLogin() {
        document.getElementById('view-login').style.display = 'flex';
        document.getElementById('view-dashboard').style.display = 'none';
        if (this.chatPollingInterval) clearInterval(this.chatPollingInterval);
    },

    showDashboard() {
        document.getElementById('view-login').style.display = 'none';
        document.getElementById('view-dashboard').style.display = 'block';

        const userNameEl = document.getElementById('admin-logged-user');
        if (userNameEl && this.user) {
            userNameEl.textContent = `Yessica Marlen (${this.user.email})`;
        }

        // Cargar pestaña inicial
        this.switchTab('config');
        this.startBackgroundChatPolling();
    },

    logout() {
        localStorage.removeItem('yessy_admin_token');
        localStorage.removeItem('yessy_admin_user');
        this.token = null;
        this.user = null;
        this.showLogin();
    },

    initEventListeners() {
        // Formulario de Login
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Botón Logout
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Pestañas de navegación
        const tabBtns = document.querySelectorAll('.admin-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Formulario de Configuración
        const configForm = document.getElementById('admin-config-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => this.handleSaveConfig(e));
        }

        // Preview en vivo del banner (con degradado elegante de respaldo)
        const bannerUrlInput = document.getElementById('cfg_imagen_banner_url');
        if (bannerUrlInput) {
            bannerUrlInput.addEventListener('input', () => {
                this.setBannerPreview(bannerUrlInput.value.trim());
            });
        }

        // Formulario de Envío de Chat desde Admin
        const adminChatForm = document.getElementById('admin-chat-send-form');
        if (adminChatForm) {
            adminChatForm.addEventListener('submit', (e) => this.handleSendAdminChatMessage(e));
        }
    },

    // ── Login contra POST /api/admin/login (Supabase Auth) ───────
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const correo = (form.email ? form.email.value : form.correo.value).trim();
        const password = form.password.value.trim();
        const errorAlert = document.getElementById('login-error-alert');
        const submitBtn = document.getElementById('btn-login-submit');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando credenciales...';
        if (errorAlert) errorAlert.style.display = 'none';

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });

            const json = await res.json();

            if (json.success && json.data && json.data.token) {
                this.token = json.data.token;
                this.user = json.data.admin;
                localStorage.setItem('yessy_admin_token', this.token);
                localStorage.setItem('yessy_admin_user', JSON.stringify(this.user));
                form.reset();
                this.showDashboard();
            } else {
                if (errorAlert) {
                    errorAlert.style.display = 'block';
                    errorAlert.textContent = json.message || 'Credenciales incorrectas.';
                }
            }
        } catch (error) {
            if (errorAlert) {
                errorAlert.style.display = 'block';
                errorAlert.textContent = 'Error al conectar con el servidor.';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión 💅';
        }
    },

    // ── Cambio de pestañas ───────────────────────────────────────
    switchTab(tabId) {
        this.activeTab = tabId;

        document.querySelectorAll('.admin-tab-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        });

        document.querySelectorAll('.admin-tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `tab-panel-${tabId}`);
        });

        // Cargar datos según la pestaña activa
        if (tabId === 'config') this.loadConfig();
        if (tabId === 'servicios-portafolio') {
            this.loadServices();
            this.loadPortfolio();
        }
        if (tabId === 'citas')    this.loadAppointments();
        if (tabId === 'pedidos')  this.loadPedidos();
        if (tabId === 'ofertas')  this.loadOfertasTab();
        if (tabId === 'chat')     this.loadChatRooms();
    },

    // ── 2. PESTAÑA: PERSONALIZAR SITIO & BANNER ──────────────────
    async loadConfig() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) return;
            const json = await res.json();
            const cfg = json.data;

            if (cfg) {
                const form = document.getElementById('admin-config-form');
                form.titulo_banner.value = cfg.titulo_banner || '';
                form.subtitulo_banner.value = cfg.subtitulo_banner || '';
                form.imagen_banner_url.value = cfg.imagen_banner_url || '';
                form.telefono_whatsapp.value = cfg.telefono_whatsapp || '';
                form.direccion_texto.value = cfg.direccion_texto || '';
                form.horario_atencion.value = cfg.horario_atencion || '';
                form.bio_yessica.value = cfg.bio_yessica || '';
                form.anos_experiencia.value = cfg.anos_experiencia || 8;

                // Promoción, ubicación y datos de transferencia
                if (form.promo_mes_titulo) form.promo_mes_titulo.value = cfg.promo_mes_titulo || '';
                if (form.promo_mes_texto) form.promo_mes_texto.value = cfg.promo_mes_texto || '';
                if (form.latitud) form.latitud.value = cfg.latitud != null ? cfg.latitud : '';
                if (form.longitud) form.longitud.value = cfg.longitud != null ? cfg.longitud : '';
                if (form.banco_transferencia) form.banco_transferencia.value = cfg.banco_transferencia || '';
                if (form.titular_transferencia) form.titular_transferencia.value = cfg.titular_transferencia || '';
                if (form.clabe_transferencia) form.clabe_transferencia.value = cfg.clabe_transferencia || '';

                this.setBannerPreview(cfg.imagen_banner_url);
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    },

    async handleSaveConfig(e) {
        e.preventDefault();
        const form = e.target;
        const alertBox = document.getElementById('config-alert');
        const submitBtn = document.getElementById('btn-save-config');

        const payload = {
            titulo_banner: form.titulo_banner.value.trim(),
            subtitulo_banner: form.subtitulo_banner.value.trim(),
            imagen_banner_url: form.imagen_banner_url.value.trim(),
            telefono_whatsapp: form.telefono_whatsapp.value.trim(),
            direccion_texto: form.direccion_texto.value.trim(),
            horario_atencion: form.horario_atencion.value.trim(),
            bio_yessica: form.bio_yessica.value.trim(),
            anos_experiencia: parseInt(form.anos_experiencia.value) || 8,
            promo_mes_titulo: form.promo_mes_titulo ? form.promo_mes_titulo.value.trim() : '',
            promo_mes_texto: form.promo_mes_texto ? form.promo_mes_texto.value.trim() : '',
            latitud: form.latitud && form.latitud.value !== '' ? parseFloat(form.latitud.value) : null,
            longitud: form.longitud && form.longitud.value !== '' ? parseFloat(form.longitud.value) : null,
            banco_transferencia: form.banco_transferencia ? form.banco_transferencia.value.trim() : '',
            titular_transferencia: form.titular_transferencia ? form.titular_transferencia.value.trim() : '',
            clabe_transferencia: form.clabe_transferencia ? form.clabe_transferencia.value.trim() : ''
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando cambios...';

        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                this.showAlert(alertBox, '¡Configuración del sitio actualizada correctamente! Los cambios ya se reflejan en la web.', 'success');
            } else {
                this.showAlert(alertBox, json.message || 'No se pudo guardar la configuración.', 'error');
            }
        } catch (error) {
            this.showAlert(alertBox, 'Error de conexión al guardar configuración.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Cambios del Sitio ✨';
        }
    },

    // ── 3. PESTAÑA: SERVICIOS Y PORTAFOLIO ───────────────────────
    async loadServices() {
        const tbody = document.getElementById('services-table-body');
        if (!tbody) return;

        try {
            const res = await fetch('/api/servicios');
            const json = await res.json();
            this.allServices = json.data || [];

            if (this.allServices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay servicios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = this.allServices.map(s => `
                <tr>
                    <td><strong>#${s.id}</strong></td>
                    <td>
                        <strong>${this.escapeHTML(s.nombre)}</strong>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted); max-width: 280px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                            ${this.escapeHTML(s.descripcion || '')}
                        </div>
                    </td>
                    <td><span class="service-badge">${this.escapeHTML(s.categoria)}</span></td>
                    <td><strong>$${parseFloat(s.precio_base).toFixed(2)} MXN</strong></td>
                    <td>⏱️ ${s.duracion_minutos} min</td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="ADMIN_APP.openEditServiceModal(${s.id})">✏️</button>
                            <button type="button" class="btn btn-secondary btn-sm" style="color:#C62828;" onclick="ADMIN_APP.deleteService(${s.id})">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar servicios.</td></tr>';
        }
    },

    async loadPortfolio() {
        const tbody = document.getElementById('portfolio-table-body');
        if (!tbody) return;

        try {
            const res = await fetch('/api/portafolio');
            const json = await res.json();
            this.allPortfolio = json.data || [];

            if (this.allPortfolio.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay trabajos en el portafolio.</td></tr>';
                return;
            }

            tbody.innerHTML = this.allPortfolio.map(p => `
                <tr>
                    <td>
                        <img src="${p.imagen_url || 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=150&q=80'}" 
                             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" alt="${this.escapeHTML(p.titulo)}">
                    </td>
                    <td><strong>${this.escapeHTML(p.titulo)}</strong></td>
                    <td><span class="portfolio-badge">${this.escapeHTML(p.estilo)}</span></td>
                    <td style="max-width: 250px; font-size: 0.85rem; color: var(--color-text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${this.escapeHTML(p.descripcion || '')}
                    </td>
                    <td>
                        <button type="button" class="btn btn-secondary btn-sm" style="color:#C62828;" onclick="ADMIN_APP.deletePortfolio(${p.id})">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar portafolio.</td></tr>';
        }
    },

    openCreateServiceModal() {
        const modal = document.getElementById('service-modal');
        const form = document.getElementById('service-modal-form');
        document.getElementById('service-modal-title').textContent = 'Nuevo Servicio de Uñas';
        form.reset();
        form.service_id.value = '';
        this.setImagePreview('service-img-preview', '');
        modal.classList.add('active');
    },

    openEditServiceModal(id) {
        const service = this.allServices.find(s => s.id === id);
        if (!service) return;

        const modal = document.getElementById('service-modal');
        const form = document.getElementById('service-modal-form');
        document.getElementById('service-modal-title').textContent = `Editar Servicio #${service.id}`;

        form.service_id.value = service.id;
        form.nombre.value = service.nombre;
        form.categoria.value = service.categoria;
        form.precio_base.value = service.precio_base;
        form.duracion_minutos.value = service.duracion_minutos;
        form.descripcion.value = service.descripcion || '';
        form.imagen_url.value = service.imagen_url || '';
        this.setImagePreview('service-img-preview', service.imagen_url);

        modal.classList.add('active');
    },

    closeServiceModal() {
        document.getElementById('service-modal').classList.remove('active');
    },

    async handleSaveService(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.service_id.value;
        const isEdit = Boolean(id);

        const payload = {
            nombre: form.nombre.value.trim(),
            categoria: form.categoria.value,
            precio_base: parseFloat(form.precio_base.value),
            duracion_minutos: parseInt(form.duracion_minutos.value),
            descripcion: form.descripcion.value.trim(),
            imagen_url: form.imagen_url.value.trim() || null
        };

        const url = isEdit ? `/api/servicios/${id}` : '/api/servicios';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                this.closeServiceModal();
                this.loadServices();
            } else {
                alert(json.message || 'Error al guardar servicio.');
            }
        } catch (error) {
            alert('Error al conectar con el servidor.');
        }
    },

    async deleteService(id) {
        if (!confirm('¿Estás segura de eliminar este servicio?')) return;
        try {
            const res = await fetch(`/api/servicios/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                this.loadServices();
            } else {
                alert(json.message || 'No se pudo eliminar el servicio.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    },

    // Modal de Portafolio
    openCreatePortfolioModal() {
        const modal = document.getElementById('portfolio-modal');
        const form = document.getElementById('portfolio-modal-form');
        form.reset();
        this.setImagePreview('portfolio-img-preview', '');
        modal.classList.add('active');
    },

    closePortfolioModal() {
        document.getElementById('portfolio-modal').classList.remove('active');
    },

    async handleSavePortfolio(e) {
        e.preventDefault();
        const form = e.target;
        const payload = {
            titulo: form.titulo.value.trim(),
            estilo: form.estilo.value,
            descripcion: form.descripcion.value.trim(),
            imagen_url: form.imagen_url.value.trim()
        };

        try {
            const res = await fetch('/api/portafolio', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                this.closePortfolioModal();
                this.loadPortfolio();
            } else {
                alert(json.message || 'Error al agregar trabajo al portafolio.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    },

    async deletePortfolio(id) {
        if (!confirm('¿Eliminar este diseño del portafolio?')) return;
        try {
            const res = await fetch(`/api/portafolio/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                this.loadPortfolio();
            } else {
                alert(json.message || 'No se pudo eliminar el trabajo.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    },

    // ── 4. PESTAÑA: AGENDA DE CITAS ──────────────────────────────
    async loadAppointments() {
        const tbody = document.getElementById('appointments-table-body');
        if (!tbody) return;

        try {
            const res = await fetch('/api/citas', {
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            this.allAppointments = json.data || [];

            this.updateAppointmentStats();
            this.renderAppointmentsTable(this.allAppointments);

            // Cargar estado del toggle de auto-cancelación
            this.loadAutoCancelToggle();
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error al cargar agenda.</td></tr>';
        }
    },

    // Carga el estado del toggle desde /api/config
    async loadAutoCancelToggle() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) return;
            const json = await res.json();
            const cfg = json.data || {};
            const toggle = document.getElementById('toggle-auto-cancel');
            const label  = document.getElementById('toggle-auto-cancel-label');
            const horas  = document.getElementById('cfg-horas-limite');
            if (toggle) {
                toggle.checked = Boolean(cfg.auto_cancelar_sin_confirmar);
                if (label) label.textContent = toggle.checked ? 'ON' : 'OFF';
                if (label) label.style.color = toggle.checked ? '#7A4E5A' : 'var(--color-text-muted)';
            }
            if (horas && cfg.horas_limite_confirmacion) {
                horas.value = cfg.horas_limite_confirmacion;
            }
        } catch (e) {
            // sin bloqueo
        }
    },

    // Guarda auto_cancelar_sin_confirmar y horas_limite_confirmacion
    async saveAutoCancelConfig() {
        const toggle = document.getElementById('toggle-auto-cancel');
        const horas  = document.getElementById('cfg-horas-limite');
        const alertBox = document.getElementById('auto-cancel-alert');
        const label  = document.getElementById('toggle-auto-cancel-label');

        if (!toggle) return;
        const activo = toggle.checked;
        const limite = parseInt(horas ? horas.value : 24) || 24;

        if (label) {
            label.textContent = activo ? 'ON' : 'OFF';
            label.style.color = activo ? '#7A4E5A' : 'var(--color-text-muted)';
        }

        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    auto_cancelar_sin_confirmar: activo,
                    horas_limite_confirmacion: limite
                })
            });
            const json = await res.json();
            if (json.success && alertBox) {
                this.showAlert(alertBox,
                    activo
                        ? `✅ Auto-cancelación <strong>activada</strong>. Citas sin anticipo se cancelarán tras ${limite} h.`
                        : '⏸️ Auto-cancelación <strong>desactivada</strong>. Las citas pendientes se gestionan manualmente.',
                    'success');
            } else if (alertBox) {
                this.showAlert(alertBox, json.message || 'No se pudo guardar la configuración.', 'error');
            }
        } catch (e) {
            if (alertBox) this.showAlert(alertBox, 'Error de conexión.', 'error');
        }
    },

    // Llama a POST /api/citas/verificar y muestra el resultado
    async verifyPendingAppointments() {
        const resultBox = document.getElementById('verify-result');
        try {
            const res = await fetch('/api/citas/verificar', {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            if (resultBox) {
                resultBox.style.display = 'block';
                if (json.success) {
                    const d = json.data || {};
                    resultBox.style.background = '#E8F5E9';
                    resultBox.style.color      = '#2E7D32';
                    resultBox.style.border     = '1px solid #A5D6A7';
                    if (d.activo) {
                        resultBox.textContent = `✅ Verificación completada. ${d.canceladas} cita(s) cancelada(s) por falta de anticipo.`;
                    } else {
                        resultBox.textContent = '⏸️ Auto-cancelación está OFF. Las citas pendientes permanecen sin cambios.';
                    }
                    // Recargar tabla actualizada
                    this.loadAppointments();
                } else {
                    resultBox.style.background = '#FFEBEE';
                    resultBox.style.color      = '#C62828';
                    resultBox.style.border     = '1px solid #FFCDD2';
                    resultBox.textContent = json.message || 'Error al verificar.';
                }
                setTimeout(() => { resultBox.style.display = 'none'; }, 6000);
            }
        } catch (e) {
            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.style.background = '#FFEBEE';
                resultBox.style.color = '#C62828';
                resultBox.style.border = '1px solid #FFCDD2';
                resultBox.textContent = 'Error de conexión al verificar.';
            }
        }
    },

    updateAppointmentStats() {
        const activeCitas = this.allAppointments.filter(c => c.estado_cita !== 'archivada');
        const totalCount = activeCitas.length;
        const pendingCount = activeCitas.filter(c => c.estado_cita === 'pendiente').length;
        const confirmedCount = activeCitas.filter(c => c.estado_cita === 'confirmada').length;
        const totalRevenue = activeCitas
            .filter(c => c.estado_cita !== 'cancelada')
            .reduce((sum, c) => sum + (parseFloat(c.total_estimado) || 0), 0);

        document.getElementById('stat-total-citas').textContent = totalCount;
        document.getElementById('stat-pending-citas').textContent = pendingCount;
        document.getElementById('stat-confirmed-citas').textContent = confirmedCount;
        document.getElementById('stat-revenue-citas').textContent = `$${totalRevenue.toFixed(2)}`;
    },

    toggleArchivedView() {
        const select = document.getElementById('filter-citas-status');
        if (!select) return;
        select.value = select.value === 'archivada' ? 'todas' : 'archivada';
        this.filterAppointments();
    },

    filterAppointments() {
        const statusFilter = document.getElementById('filter-citas-status').value;
        const searchInput = document.getElementById('filter-citas-search').value.toLowerCase().trim();
        const toggleBtn = document.getElementById('btn-toggle-archived');

        if (toggleBtn) {
            toggleBtn.textContent = statusFilter === 'archivada'
                ? '📋 Ver Citas Actuales'
                : '📦 Ver Archivadas';
        }

        let filtered = this.allAppointments;

        if (statusFilter === 'todas') {
            filtered = filtered.filter(c => c.estado_cita !== 'archivada');
        } else {
            filtered = filtered.filter(c => c.estado_cita === statusFilter);
        }

        if (searchInput) {
            filtered = filtered.filter(c => 
                (c.nombre_cliente && c.nombre_cliente.toLowerCase().includes(searchInput)) ||
                (c.telefono_cliente && c.telefono_cliente.includes(searchInput)) ||
                (c.servicio_nombre && c.servicio_nombre.toLowerCase().includes(searchInput))
            );
        }

        this.renderAppointmentsTable(filtered);
    },

    renderAppointmentsTable(citas) {
        const tbody = document.getElementById('appointments-table-body');
        if (!tbody) return;

        if (citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem;">No se encontraron citas con los filtros seleccionados.</td></tr>';
            return;
        }

        tbody.innerHTML = citas.map(c => {
            const cleanPhone = c.telefono_cliente.replace(/[^0-9]/g, '');
            const waLink = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(c.nombre_cliente)},%20te%20contacto%20de%20Yessy%20Nails%20sobre%20tu%20cita%20del%20${c.fecha_cita}%20💅`;

            // Etiqueta de estado de anticipo
            let anticipoTag = '';
            if (
                c.folio_transferencia === 'Sin anticipo (Pago en sucursal)' ||
                c.estado_pago === 'Sin anticipo (Pago en sucursal)' ||
                c.metodo_pago === 'efectivo' ||
                c.metodo_pago === 'sucursal'
            ) {
                anticipoTag = `<div style="margin-top:0.3rem;"><span style="background:#FFF8E1;color:#E65100;border-radius:6px;padding:1px 8px;font-size:0.75rem;font-weight:700;">💵 Sin anticipo (Pago en sucursal)</span></div>`;
            } else if (
                c.metodo_pago === 'transferencia' ||
                (c.folio_transferencia && c.folio_transferencia.includes('Anticipo vía transferencia'))
            ) {
                anticipoTag = `<div style="margin-top:0.3rem;"><span style="background:#E3F2FD;color:#1565C0;border-radius:6px;padding:1px 8px;font-size:0.75rem;font-weight:700;">📲 Anticipo vía transferencia</span></div>`;
            } else if (c.estado_cita === 'pendiente') {
                if (c.folio_transferencia) {
                    anticipoTag = `<div style="margin-top:0.3rem;"><span style="background:#E8F5E9;color:#2E7D32;border-radius:6px;padding:1px 8px;font-size:0.75rem;font-weight:700;">✅ Folio enviado</span></div>`;
                } else {
                    anticipoTag = `<div style="margin-top:0.3rem;"><span style="background:#FFF8E1;color:#E65100;border-radius:6px;padding:1px 8px;font-size:0.75rem;font-weight:700;">⏳ Sin folio</span></div>`;
                }
            }

            return `
                <tr>
                    <td><strong>#${c.id}</strong></td>
                    <td>
                        <strong>${this.escapeHTML(c.nombre_cliente)}</strong>
                        <div style="font-size: 0.8rem; margin-top: 0.2rem;">
                            <a href="${waLink}" target="_blank" style="color: #25D366; font-weight:700;">
                                💬 ${c.telefono_cliente}
                            </a>
                        </div>
                    </td>
                    <td>
                        <span>${this.escapeHTML(c.servicio_nombre || 'Servicio')}</span>
                        <div style="font-size: 0.78rem; color: var(--color-text-muted);">
                            ${this.escapeHTML(c.notas_diseno || 'Sin notas')}
                        </div>
                    </td>
                    <td>
                        <strong>📅 ${c.fecha_cita}</strong>
                        <div style="font-size: 0.82rem; color: var(--color-text-muted);">🕐 ${c.hora_cita}</div>
                    </td>
                    <td><strong>$${parseFloat(c.total_estimado || 0).toFixed(2)}</strong></td>
                    <td>
                        <select class="status-select status-cita-${c.estado_cita}" onchange="ADMIN_APP.changeAppointmentStatus(${c.id}, this.value)">
                            <option value="pendiente" ${c.estado_cita === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                            <option value="confirmada" ${c.estado_cita === 'confirmada' ? 'selected' : ''}>✅ Confirmada</option>
                            <option value="completada" ${c.estado_cita === 'completada' ? 'selected' : ''}>🎉 Completada</option>
                            <option value="cancelada" ${c.estado_cita === 'cancelada' ? 'selected' : ''}>❌ Cancelada</option>
                            <option value="archivada" ${c.estado_cita === 'archivada' ? 'selected' : ''}>📦 Archivada</option>
                        </select>
                        ${anticipoTag}
                    </td>
                    <td>
                        <select class="status-select status-pago-${c.estado_pago}" onchange="ADMIN_APP.changePaymentStatus(${c.id}, this.value)">
                            <option value="pendiente" ${c.estado_pago === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="anticipo_50" ${c.estado_pago === 'anticipo_50' ? 'selected' : ''}>Anticipo</option>
                            <option value="pagado" ${c.estado_pago === 'pagado' ? 'selected' : ''}>Pagado</option>
                        </select>
                    </td>
                    <td>
                        <button type="button" class="btn btn-secondary btn-sm" style="color:#C62828;" onclick="ADMIN_APP.deleteAppointment(${c.id})" title="Eliminar cita">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async changeAppointmentStatus(id, newStatus) {
        try {
            const res = await fetch(`/api/citas/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ estado_cita: newStatus })
            });
            const json = await res.json();
            if (json.success) {
                // Actualizar localmente
                const c = this.allAppointments.find(item => item.id === id);
                if (c) c.estado_cita = newStatus;
                this.updateAppointmentStats();
                this.filterAppointments();
            } else {
                alert(json.message || 'No se pudo actualizar el estado.');
            }
        } catch (error) {
            alert('Error al actualizar cita.');
        }
    },

    async changePaymentStatus(id, newPaymentStatus) {
        try {
            const res = await fetch(`/api/citas/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ estado_pago: newPaymentStatus })
            });
            const json = await res.json();
            if (json.success) {
                const c = this.allAppointments.find(item => item.id === id);
                if (c) c.estado_pago = newPaymentStatus;
                this.filterAppointments();
            } else {
                alert(json.message || 'No se pudo actualizar el pago.');
            }
        } catch (error) {
            alert('Error al actualizar pago.');
        }
    },

    async deleteAppointment(id) {
        if (!confirm(`¿Eliminar definitivamente la cita #${id}?`)) return;
        try {
            const res = await fetch(`/api/citas/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                this.loadAppointments();
            } else {
                alert(json.message || 'No se pudo eliminar la cita.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    },

    // ── 5. PESTAÑA: PEDIDOS ──────────────────────────────────────
    allPedidos: [],

    async loadPedidos() {
        const tbody = document.getElementById('pedidos-table-body');
        if (!tbody) return;

        try {
            const res = await fetch('/api/pedidos', { headers: this.getAuthHeaders() });
            const json = await res.json();
            this.allPedidos = json.data || [];

            this.updatePedidoStats();
            this.renderPedidosTable(this.allPedidos);

            // Actualizar badge de pestaña con pedidos pendientes
            const pending = this.allPedidos.filter(p => p.estado_pedido === 'pendiente').length;
            const badge = document.getElementById('admin-pedidos-tab-badge');
            if (badge) {
                badge.textContent = pending;
                badge.style.display = pending > 0 ? 'inline-block' : 'none';
            }
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Error al cargar pedidos.</td></tr>';
        }
    },

    updatePedidoStats() {
        document.getElementById('stat-total-pedidos').textContent = this.allPedidos.length;
        document.getElementById('stat-pending-pedidos').textContent =
            this.allPedidos.filter(p => p.estado_pedido === 'pendiente').length;
        document.getElementById('stat-confirmed-pedidos').textContent =
            this.allPedidos.filter(p => p.estado_pedido === 'confirmado').length;
        const revenue = this.allPedidos
            .filter(p => p.estado_pedido !== 'cancelado')
            .reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
        document.getElementById('stat-revenue-pedidos').textContent = `$${revenue.toFixed(2)}`;
    },

    filterPedidos() {
        const status = document.getElementById('filter-pedidos-status').value;
        const filtered = status === 'todos'
            ? this.allPedidos
            : this.allPedidos.filter(p => p.estado_pedido === status);
        this.renderPedidosTable(filtered);
    },

    renderPedidosTable(pedidos) {
        const tbody = document.getElementById('pedidos-table-body');
        if (!tbody) return;

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No hay pedidos con ese filtro.</td></tr>';
            return;
        }

        const estadoLabels = {
            pendiente:  '⏳ Pendiente',
            confirmado: '✅ Confirmado',
            entregado:  '📦 Entregado',
            cancelado:  '❌ Cancelado'
        };

        tbody.innerHTML = pedidos.map(p => {
            const items = Array.isArray(p.items_json) ? p.items_json : [];
            const itemsList = items.map(it => `${it.cantidad}× ${this.escapeHTML(it.nombre)}`).join(', ');
            const fecha = p.fecha_creacion
                ? new Date(p.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
            const entrega = p.tipo_entrega === 'estudio'
                ? '🏠 Recoge en estudio'
                : `📍 Domicilio${p.direccion_entrega ? ': ' + this.escapeHTML(p.direccion_entrega) : ''}`;
            const cleanPhone = (p.telefono_cliente || '').replace(/[^0-9]/g, '');
            const waLink = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(p.nombre_cliente || '')},%20te%20contacto%20de%20Yessy%20Nails%20sobre%20tu%20pedido%20💅`;

            return `
                <tr>
                    <td><strong>#${p.id}</strong></td>
                    <td>
                        <strong>${this.escapeHTML(p.nombre_cliente || '—')}</strong>
                        <div style="font-size:0.8rem;margin-top:0.2rem;">
                            <a href="${waLink}" target="_blank" style="color:#25D366;font-weight:700;">
                                💬 ${this.escapeHTML(p.telefono_cliente || '—')}
                            </a>
                        </div>
                        ${p.correo_cliente ? `<div style="font-size:0.78rem;color:var(--color-text-muted);">${this.escapeHTML(p.correo_cliente)}</div>` : ''}
                    </td>
                    <td style="font-size:0.82rem;max-width:220px;">${itemsList || '—'}</td>
                    <td style="font-size:0.82rem;">${entrega}</td>
                    <td><strong>$${parseFloat(p.total || 0).toFixed(2)}</strong></td>
                    <td style="font-size:0.82rem;">${fecha}</td>
                    <td>
                        <select class="status-select" onchange="ADMIN_APP.changePedidoStatus(${p.id}, this.value)"
                                style="border-radius:8px;padding:0.3rem 0.5rem;font-size:0.82rem;border:1.5px solid var(--color-border);">
                            <option value="pendiente"  ${p.estado_pedido === 'pendiente'  ? 'selected' : ''}>${estadoLabels.pendiente}</option>
                            <option value="confirmado" ${p.estado_pedido === 'confirmado' ? 'selected' : ''}>${estadoLabels.confirmado}</option>
                            <option value="entregado"  ${p.estado_pedido === 'entregado'  ? 'selected' : ''}>${estadoLabels.entregado}</option>
                            <option value="cancelado"  ${p.estado_pedido === 'cancelado'  ? 'selected' : ''}>${estadoLabels.cancelado}</option>
                        </select>
                    </td>
                    <td>
                        <button type="button" class="btn btn-secondary btn-sm" style="color:#C62828;"
                                onclick="ADMIN_APP.deletePedido(${p.id})" title="Eliminar pedido">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async changePedidoStatus(id, newStatus) {
        try {
            const res = await fetch(`/api/pedidos/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ estado_pedido: newStatus })
            });
            const json = await res.json();
            if (json.success) {
                const p = this.allPedidos.find(x => x.id === id);
                if (p) p.estado_pedido = newStatus;
                this.updatePedidoStats();
                this.filterPedidos();
            } else {
                alert(json.message || 'No se pudo actualizar el estado del pedido.');
            }
        } catch (error) {
            alert('Error al actualizar pedido.');
        }
    },

    async deletePedido(id) {
        if (!confirm(`¿Eliminar definitivamente el pedido #${id}?`)) return;
        try {
            const res = await fetch(`/api/pedidos/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                this.loadPedidos();
            } else {
                alert(json.message || 'No se pudo eliminar el pedido.');
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    },

    // ── 6. PESTAÑA: ENVIAR OFERTA POR CORREO ─────────────────────
    async loadOfertasTab() {
        // Obtener conteo de suscriptoras
        try {
            const res = await fetch('/api/pedidos', { headers: this.getAuthHeaders() });
            // Usamos los clientes de la API de admin
            const resC = await fetch('/api/clientes', { headers: this.getAuthHeaders() });
            if (resC.ok) {
                const json = await resC.json();
                const subs = (json.data || []).filter(c => c.acepta_promociones);
                const el = document.getElementById('ofertas-subscriber-count');
                if (el) el.textContent = `${subs.length} clienta(s)`;
            }
        } catch (e) {
            const el = document.getElementById('ofertas-subscriber-count');
            if (el) el.textContent = 'no disponible';
        }

        // Conectar vista previa en vivo
        const asuntoInput  = document.getElementById('offer-asunto');
        const mensajeInput = document.getElementById('offer-mensaje');
        const updatePreview = () => {
            const previewSubj = document.getElementById('offer-preview-subject');
            const previewBody = document.getElementById('offer-preview-body');
            if (previewSubj) previewSubj.textContent = asuntoInput.value.trim() || '✨ Promoción del mes — Yessy Nails';
            if (previewBody) previewBody.textContent = (mensajeInput.value || '').substring(0, 200) + (mensajeInput.value.length > 200 ? '…' : '');
        };
        if (asuntoInput && !asuntoInput._ofertaListenerAdded) {
            asuntoInput.addEventListener('input', updatePreview);
            mensajeInput.addEventListener('input', updatePreview);
            asuntoInput._ofertaListenerAdded = true;
        }
        updatePreview();

        // Formulario de envío
        const form = document.getElementById('offer-email-form');
        if (form && !form._ofertaListenerAdded) {
            form.addEventListener('submit', (e) => this.handleSendOffer(e));
            form._ofertaListenerAdded = true;
        }
    },

    async handleSendOffer(e) {
        e.preventDefault();
        const alertBox = document.getElementById('ofertas-alert');
        const btn      = document.getElementById('btn-send-offer');
        const asunto   = document.getElementById('offer-asunto').value.trim();
        const mensaje  = document.getElementById('offer-mensaje').value.trim();

        if (!mensaje) {
            this.showAlert(alertBox, 'El mensaje no puede estar vacío.', 'error');
            return;
        }

        if (!confirm(`¿Enviar esta oferta a todas las clientas suscriptas?\n\nAsunto: ${asunto || '(predeterminado)'}`)) return;

        btn.disabled = true;
        btn.textContent = 'Enviando correos...';

        try {
            const res = await fetch('/api/admin/enviar-oferta', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ asunto, mensaje })
            });
            const json = await res.json();

            if (json.success) {
                const { enviados, fallidos, total } = json.data || {};
                this.showAlert(alertBox,
                    `✅ Oferta enviada: <strong>${enviados} correo(s)</strong> enviados correctamente de ${total} destinataria(s).${fallidos > 0 ? ` (${fallidos} sin correo configurado)` : ''}`,
                    'success');
                e.target.reset();
                document.getElementById('offer-preview-subject').textContent = '—';
                document.getElementById('offer-preview-body').textContent    = '—';
            } else {
                this.showAlert(alertBox, json.message || 'Error al enviar la oferta.', 'error');
            }
        } catch (error) {
            this.showAlert(alertBox, 'Error de conexión al servidor.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '✉️ Enviar Oferta a Todas las Clientas';
        }
    },

    // ── 7. PESTAÑA: BANDEJA DE CHAT ──────────────────────────────
    async loadChatRooms() {
        const listContainer = document.getElementById('admin-chat-rooms-list');
        if (!listContainer) return;

        try {
            const res = await fetch('/api/chat/salas', {
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            const salas = json.data || [];

            if (salas.length === 0) {
                listContainer.innerHTML = '<div style="padding:2rem; text-align:center; color:gray;">No hay chats activos.</div>';
                return;
            }

            listContainer.innerHTML = salas.map(s => {
                const isActive = this.activeChatRoomId === s.sala_cliente_id;
                // El nombre mostrado siempre es el de la CLIENTA (nunca "Yessica")
                const clientName = s.nombre_cliente || s.nombre_remitente || 'Clienta';
                return `
                    <div class="admin-room-item ${isActive ? 'active' : ''}" onclick="ADMIN_APP.selectChatRoom('${s.sala_cliente_id}', '${this.escapeHTML(clientName)}')">
                        <div class="admin-room-title">
                            <strong>${this.escapeHTML(clientName)}</strong>
                            ${s.mensajes_sin_leer > 0 ? `<span class="admin-tab-badge">${s.mensajes_sin_leer}</span>` : ''}
                        </div>
                        <div class="admin-room-preview">
                            ${this.escapeHTML(s.ultimo_mensaje || '')}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            listContainer.innerHTML = '<div style="padding:1rem; color:red;">Error al cargar salas.</div>';
        }
    },

    async selectChatRoom(salaId, clientName) {
        this.activeChatRoomId = salaId;

        // Marcar activo en lista
        document.querySelectorAll('.admin-room-item').forEach(el => el.classList.remove('active'));
        this.loadChatRooms();

        document.getElementById('admin-chat-empty-panel').style.display = 'none';
        document.getElementById('admin-chat-active-panel').style.display = 'flex';
        document.getElementById('admin-chat-client-title').textContent = `${clientName} (${salaId})`;

        // Cargar mensajes de la sala
        await this.loadActiveRoomMessages();

        // Marcar leídos
        await fetch(`/api/chat/salas/${encodeURIComponent(salaId)}/leer`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ rol: 'cliente' })
        });
    },

    async loadActiveRoomMessages() {
        if (!this.activeChatRoomId) return;

        const box = document.getElementById('admin-chat-messages-container');
        if (!box) return;

        try {
            const res = await fetch(`/api/chat/salas/${encodeURIComponent(this.activeChatRoomId)}`, {
                headers: this.getAuthHeaders()
            });
            const json = await res.json();
            const mensajes = json.data || [];

            box.innerHTML = mensajes.map(m => {
                const isYessica = m.rol === 'yessica';
                return `
                    <div class="msg-row ${isYessica ? 'msg-row-client' : 'msg-row-salon'}">
                        ${!isYessica ? `<div class="msg-salon-avatar" style="background:var(--color-primary);">👤</div>` : ''}
                        <div class="msg-bubble ${isYessica ? 'msg-bubble-client' : 'msg-bubble-salon'}">
                            <span style="font-size:0.75rem; font-weight:700; display:block; margin-bottom:0.2rem;">
                                ${this.escapeHTML(m.nombre_remitente)}
                            </span>
                            <p class="msg-text">${this.escapeHTML(m.mensaje)}</p>
                            <span class="msg-time" style="font-size:0.7rem; opacity:0.8;">
                                ${this.formatMsgTime(m.fecha_envio)}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');

            box.scrollTop = box.scrollHeight;
        } catch (error) {
            console.error('Error cargando mensajes de sala:', error);
        }
    },

    async handleSendAdminChatMessage(e) {
        e.preventDefault();
        const input = document.getElementById('admin-chat-input');
        const text = input.value.trim();
        if (!text || !this.activeChatRoomId) return;

        const payload = {
            sala_cliente_id: this.activeChatRoomId,
            nombre_remitente: 'Yessica Calderón',
            rol: 'yessica',
            mensaje: text
        };

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                input.value = '';
                await this.loadActiveRoomMessages();
                this.loadChatRooms();
            }
        } catch (error) {
            alert('Error al enviar respuesta.');
        }
    },

    insertQuickResponse(templateText) {
        const input = document.getElementById('admin-chat-input');
        if (input) {
            input.value = templateText;
            input.focus();
        }
    },

    startBackgroundChatPolling() {
        if (this.chatPollingInterval) clearInterval(this.chatPollingInterval);
        this.chatPollingInterval = setInterval(() => {
            if (this.token) {
                // Actualizar badge de no leídos
                fetch('/api/chat/no-leidos', { headers: this.getAuthHeaders() })
                    .then(r => r.json())
                    .then(data => {
                        const count = data.data ? data.data.sin_leer : 0;
                        const badge = document.getElementById('admin-chat-tab-badge');
                        if (badge) {
                            badge.textContent = count;
                            badge.style.display = count > 0 ? 'inline-block' : 'none';
                        }
                    }).catch(() => {});

                // Si está en la pestaña de chat, actualizar salas y mensajes
                if (this.activeTab === 'chat') {
                    this.loadChatRooms();
                    if (this.activeChatRoomId) {
                        this.loadActiveRoomMessages();
                    }
                }
            }
        }, 4000);
    },

    // Utilidades
    // Muestra el banner: si no hay URL o falla la carga, se oculta la
    // imagen y queda visible el degradado elegante del contenedor.
    setBannerPreview(url) {
        const preview = document.getElementById('banner-preview-img');
        if (!preview) return;

        if (!url) {
            preview.classList.add('is-hidden');
            preview.removeAttribute('src');
            return;
        }

        preview.classList.remove('is-hidden');
        preview.onerror = () => preview.classList.add('is-hidden');
        preview.src = url;
    },

    setImagePreview(previewId, url) {
        const preview = document.getElementById(previewId);
        if (!preview) return;
        if (url) {
            preview.src = url;
            preview.style.display = 'block';
        } else {
            preview.removeAttribute('src');
            preview.style.display = 'none';
        }
    },

    // Formatea fecha_envio al formato local es-MX (nunca ISO crudo)
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

    showAlert(el, message, type = 'success') {
        if (!el) return;
        el.style.display = 'block';
        if (type === 'success') {
            el.style.background = '#E8F5E9';
            el.style.color = '#2E7D32';
            el.style.border = '1px solid #A5D6A7';
        } else {
            el.style.background = '#FFEBEE';
            el.style.color = '#C62828';
            el.style.border = '1px solid #FFCDD2';
        }
        el.innerHTML = message;
        setTimeout(() => { el.style.display = 'none'; }, 5000);
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

document.addEventListener('DOMContentLoaded', () => {
    ADMIN_APP.init();
});
