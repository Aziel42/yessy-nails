/**
 * ================================================================
 * YESSY NAILS — Cliente de conexión a Supabase (PostgreSQL + Auth)
 * ================================================================
 * Lee las credenciales desde .env y es compatible tanto con las
 * llaves nuevas (Publishable / Secret) como con las legacy
 * (anon / service_role).
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;

// Compatibilidad de nomenclaturas de llaves:
//   legacy: SUPABASE_ANON_KEY        / SUPABASE_SERVICE_ROLE_KEY
//   nueva : SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY
const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL) {
    throw new Error('Falta SUPABASE_URL en las variables de entorno (.env).');
}
if (!SUPABASE_ANON_KEY) {
    throw new Error('Falta SUPABASE_ANON_KEY (o SUPABASE_PUBLISHABLE_KEY) en las variables de entorno (.env).');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) en las variables de entorno (.env).');
}

// Cliente público (anon / publishable): se usa para verificar los tokens
// JWT de los usuarios autenticados con Supabase Auth.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Cliente administrador (service_role / secret): lo usa el backend para
// operar la base de datos saltándose las políticas RLS. NUNCA debe
// exponerse al frontend.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

export default { supabase, supabaseAdmin };
