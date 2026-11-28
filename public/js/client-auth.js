/**
 * ================================================================
 * YESSY NAILS — Autenticación de Clientas (Supabase Auth)
 * Módulo para login.html, agendar.html, pedidos.html, chat.html
 * ================================================================
 */

(function () {
    let supabase = null;
    let inactivityTimer = null;
    const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
    const SESSION_KEY = 'yessy_client_session';
    const RETURN_KEY = 'yessy_return_url';

    // Decodifica el payload de un JWT sin verificar firma (solo para leer claims públicos en cliente)
    function decodeJwtPayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    // Captura sesión de OAuth si Supabase redirigió con #access_token=...
    function captureOAuthHashSession() {
        try {
            const hash = window.location.hash;
            if (!hash || !hash.includes('access_token=')) return false;

            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            if (!accessToken) return false;

            const payload = decodeJwtPayload(accessToken) || {};
            const userMetadata = payload.user_metadata || {};
            const sessionData = {
                user: {
                    id: payload.sub || '',
                    email: payload.email || userMetadata.email || '',
                    user_metadata: userMetadata
                },
                access_token: accessToken
            };
            saveSession(sessionData);

            // Limpiar el hash de la URL sin recargar
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
            return true;
        } catch {
            return false;
        }
    }

    // 1. Inicializar cliente Supabase con credenciales públicas de /api/config
    async function initSupabase() {
        if (supabase) return supabase;
        try {
            const res = await fetch('/api/config');
            const json = await res.json();
            const cfg = json.data || {};
            const url = cfg.supabase_url;
            const anon = cfg.supabase_anon_key;
            const globalSupabase = window.supabase;
            if (url && anon && globalSupabase && typeof globalSupabase.createClient === 'function') {
                supabase = globalSupabase.createClient(url, anon, {
                    auth: { autoRefreshToken: false, persistSession: false }
                });
            }
        } catch (e) {
            console.warn('No se pudo inicializar Supabase Auth:', e.message);
        }
        return supabase;
    }

    // 2. Utilidades de sesión localStorage
    function saveSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const s = JSON.parse(raw);
            if (!s || !s.access_token) return null;
            return s;
        } catch {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem(SESSION_KEY);
    }

    // Intentar capturar OAuth hash inmediatamente al cargar el script
    captureOAuthHashSession();

    // 3. Timer de inactividad (30 min)
    function resetInactivityTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            clearSession();
            alert('Tu sesión ha expirado por inactividad (30 min). Por favor inicia sesión nuevamente.');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }
        }, INACTIVITY_MS);
    }

    function startInactivityListener() {
        ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
            window.addEventListener(evt, resetInactivityTimer, { passive: true });
        });
        resetInactivityTimer();
    }

    function stopInactivityListener() {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
            window.removeEventListener(evt, resetInactivityTimer);
        });
    }

    function resolveRedirectUrl(target) {
        if (!target) return window.location.origin + '/agendar.html';
        try {
            const u = new URL(target, window.location.origin);
            if (u.origin === window.location.origin) return u.href;
        } catch {}
        return window.location.origin + '/agendar.html';
    }

    // 4. API pública
    const YESSY_AUTH = {
        async init() {
            captureOAuthHashSession();
            await initSupabase();
            if (this.isAuthenticated()) {
                startInactivityListener();
            }
        },

        async signUp(email, password, fullName = '') {
            const client = await initSupabase();
            if (!client) throw new Error('Supabase no disponible');
            const options = fullName ? { data: { full_name: fullName.trim() } } : undefined;
            const { data, error } = await client.auth.signUp({ email, password, options });
            if (error) throw new Error(error.message);
            if (data.session) {
                saveSession({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        user_metadata: data.user.user_metadata || (fullName ? { full_name: fullName.trim() } : {})
                    },
                    access_token: data.session.access_token
                });
                startInactivityListener();
            }
            return data;
        },

        async signIn(email, password) {
            const client = await initSupabase();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw new Error(error.message);
            if (data.session) {
                saveSession({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        user_metadata: data.user.user_metadata || {}
                    },
                    access_token: data.session.access_token
                });
                startInactivityListener();
            }
            return data;
        },

        async signInWithGoogle(redirectTarget = null) {
            const client = await initSupabase();
            if (!client) throw new Error('Supabase no disponible');
            const redirectTo = resolveRedirectUrl(redirectTarget || sessionStorage.getItem(RETURN_KEY));
            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo }
            });
            if (error) throw new Error(error.message);
            return data;
        },

        logout() {
            clearSession();
            stopInactivityListener();
            window.location.href = 'login.html';
        },

        getSession() {
            return getSession();
        },

        isAuthenticated() {
            return !!getSession();
        },

        getDisplayName() {
            const session = getSession();
            if (!session || !session.user) return '';
            const meta = session.user.user_metadata || {};
            if (meta.full_name) return meta.full_name;
            if (meta.name) return meta.name;
            if (session.user.email) return session.user.email.split('@')[0];
            return 'Clienta';
        },

        // Protege páginas que requieren sesión; si no hay sesión redirige a login guardando URL de retorno
        requireAuth(returnUrl = window.location.pathname + window.location.search) {
            captureOAuthHashSession();
            if (!this.isAuthenticated()) {
                sessionStorage.setItem(RETURN_KEY, returnUrl);
                window.location.replace('login.html?redirect=' + encodeURIComponent(returnUrl));
                return false;
            }
            return true;
        },

        // Rellena campos de nombre y correo en un formulario dado (por id o selector)
        autoFillForm(formSelector) {
            const session = getSession();
            if (!session || !session.user) return;
            const root = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
            if (!root) return;

            const emailInput = root.querySelector('input[name="correo"], input[name="email"], input#order-correo, input[type="email"]');
            const nameInput = root.querySelector('input[name="nombre_cliente"], input[name="nombre"], input#order-nombre');

            const email = session.user.email || '';
            const meta = session.user.user_metadata || {};
            const fullName = meta.full_name || meta.name || (email ? email.split('@')[0] : '');

            if (emailInput && email && !emailInput.value) {
                emailInput.value = email;
            }
            if (nameInput && fullName && !nameInput.value) {
                nameInput.value = fullName;
            }
        }
    };

    // Exponer globalmente
    window.YESSY_AUTH = YESSY_AUTH;

    // Auto-inicializar en DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        YESSY_AUTH.init();
    });
})();
