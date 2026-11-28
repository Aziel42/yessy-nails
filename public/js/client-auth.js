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

    // 3. Timer de inactividad (30 min)
    function resetInactivityTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Cerrar sesión por inactividad
            clearSession();
            alert('Tu sesión ha expirado por inactividad (30 min). Por favor inicia sesión nuevamente.');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
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

    // 4. API pública
    const YESSY_AUTH = {
        async init() {
            await initSupabase();
            startInactivityListener();
        },

        async signUp(email, password) {
            const client = await initSupabase();
            if (!client) throw new Error('Supabase no disponible');
            const { data, error } = await client.auth.signUp({ email, password });
            if (error) throw new Error(error.message);
            if (data.session) {
                saveSession({ user: { id: data.user.id, email: data.user.email }, access_token: data.session.access_token });
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
                saveSession({ user: { id: data.user.id, email: data.user.email }, access_token: data.session.access_token });
                startInactivityListener();
            }
            return data;
        },

        async signInWithGoogle() {
            const client = await initSupabase();
            if (!client) throw new Error('Supabase no disponible');
            const redirectTo = window.location.origin + '/agendar.html';
            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo }
            });
            if (error) throw new Error(error.message);
            // OAuth redirect maneja la sesión; no hay session inmediata aquí
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

        // Protege páginas que requieren sesión; si no hay sesión redirige a login guardando URL de retorno
        requireAuth(returnUrl = window.location.href) {
            if (!this.isAuthenticated()) {
                sessionStorage.setItem(RETURN_KEY, returnUrl);
                window.location.href = 'login.html?redirect=' + encodeURIComponent(returnUrl);
                return false;
            }
            return true;
        },

        // Rellena campos de nombre y correo en un formulario dado (por id o selector)
        autoFillForm(formSelector) {
            const session = getSession();
            if (!session) return;
            const form = typeof formSelector === 'string' ? document.querySelector(formSelector) : formSelector;
            if (!form) return;
            const emailInput = form.querySelector('input[name="correo"], input[name="email"], input[type="email"]');
            const nameInput = form.querySelector('input[name="nombre_cliente"], input[name="nombre"]');
            if (emailInput && session.user?.email) emailInput.value = session.user.email;
            if (nameInput && session.user?.user_metadata?.full_name) nameInput.value = session.user.user_metadata.full_name;
        }
    };

    // Exponer globalmente
    window.YESSY_AUTH = YESSY_AUTH;

    // Auto-inicializar en DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        YESSY_AUTH.init();
    });
})();