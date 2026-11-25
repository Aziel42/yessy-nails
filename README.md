# 💅 Yessy Nails

Aplicación web profesional para **Yessy Nails**, el salón de uñas de **Yessica Marlen Calderón Luna** en Ecatepec de Morelos, Estado de México. Permite agendar citas en línea, explorar el portafolio de diseños, comprar productos a domicilio y chatear en tiempo real con la nail artist.

---

## Arquitectura y tecnologías

| Capa | Tecnología |
|---|---|
| Runtime | Node.js v24, ES Modules (`"type": "module"`) |
| Servidor | Express 4.x |
| Base de datos | Supabase — PostgreSQL (`@supabase/supabase-js ^2`) |
| Autenticación | Supabase Auth — JWT, `signInWithPassword` |
| Carga de archivos | Multer 2.x (disco local → `public/uploads/`) |
| Frontend | HTML5 + CSS3 + JavaScript vanilla |
| Mapas | Leaflet.js 1.9.4 + OpenStreetMap (sin API key de pago) |
| Correos | Brevo HTTP API (prioridad) + Nodemailer SMTP (respaldo) |
| Tests | Jest + Supertest (`--experimental-vm-modules`) |

**Patrón:** `routes → controllers → models → Supabase`. Las respuestas JSON siguen el formato `{ success, message, data, timestamp }` definido en `src/utils/response.js`.

---

## Estructura de carpetas

```
yessy-nails/
├── server.js                       # Entry point: monta rutas, middlewares y exporta `app`
├── package.json
├── .env / .env.example             # Variables de entorno (ver sección siguiente)
├── supabase_schema.sql             # Esquema completo — copiar/pegar en SQL Editor de Supabase
├── update_datos_reales.sql         # Seed de datos reales del negocio
├── supabase/migrations/            # Histórico de migraciones SQL
├── tests/
│   └── api.test.js                 # 6 pruebas de integración con mocks
├── public/                         # Frontend estático servido por Express
│   ├── index.html                  # Inicio
│   ├── servicios.html              # Catálogo + cotizador interactivo
│   ├── portafolio.html             # Galería de diseños con filtros
│   ├── agendar.html                # Formulario de cita + anticipo SPEI/tarjeta
│   ├── pedidos.html                # Tienda + carrito + mapa de entrega
│   ├── perfil.html                 # Trayectoria de Yessica
│   ├── ubicacion.html              # Mapa interactivo + políticas del salón
│   ├── chat.html                   # Chat en vivo cliente ↔ Yessica
│   ├── admin.html                  # Panel de administración (protegido)
│   ├── styles.css                  # Hoja de estilos única
│   ├── css/admin.css               # Estilos del panel admin
│   ├── js/                         # Scripts JS del frontend
│   ├── img/                        # Imágenes reales (yessica.jpg, diseno-01..16.jpg)
│   └── uploads/                    # Imágenes subidas vía POST /api/upload (se autocrea)
└── src/
    ├── config/supabase.js          # Clientes supabase (anon) y supabaseAdmin (service_role)
    ├── controllers/                # Lógica de negocio por dominio
    ├── models/                     # Acceso a datos — Supabase queries
    ├── middlewares/                # auth, error, upload
    ├── routes/                     # Definición de rutas Express
    ├── services/email.service.js   # Envío de correos (Brevo + Nodemailer)
    └── utils/
        ├── response.js             # Respuestas JSON uniformes
        └── sanitize.js             # Saneamiento y validación de entradas
```

---

## Variables de entorno

Copia `.env.example` como `.env` y completa con tus credenciales reales:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (Render lo asigna automáticamente) |
| `SUPABASE_URL` | URL del proyecto en Supabase Dashboard |
| `SUPABASE_ANON_KEY` | Llave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta (service_role) — omite RLS |
| `BREVO_API_KEY` | API Key de Brevo para envío de correos |
| `EMAIL_FROM` | Dirección remitente de correos |
| `EMAIL_FROM_NAME` | Nombre remitente ("Yessy Nails") |
| `ADMIN_EMAIL` | Correo al que llegan avisos internos |
| `SITE_URL` | URL pública del sitio (para links en correos) |

> `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` son nombres alternativos aceptados también.

---

## Instalación local

```bash
# 1. Clona el repositorio
git clone <repo-url>
cd yessy-nails

# 2. Instala dependencias
npm install

# 3. Configura el entorno
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 4. Levanta el servidor en modo desarrollo
npm run dev
# → http://localhost:3000
```

> Antes de levantar el servidor, ejecuta `supabase_schema.sql` en el SQL Editor de tu proyecto Supabase para crear las tablas y políticas RLS. Luego ejecuta `update_datos_reales.sql` para insertar los datos del negocio.

---

## Ejecutar las pruebas

```bash
npm test
```

Las pruebas usan **Jest + Supertest** con mocks de los modelos de Supabase, por lo que no requieren conexión de red ni variables de entorno configuradas para pasar.

Resultado esperado:

```
Tests:   6 passed, 6 total
```

---

## Despliegue en Render

### Requisitos previos

1. Cuenta activa en [render.com](https://render.com).
2. Proyecto Supabase configurado con el esquema SQL aplicado.
3. Cuenta de Yessica creada en **Supabase Dashboard → Authentication → Users** (marcar "Auto Confirm User").

### Pasos

1. **Crea un nuevo Web Service** en Render y conecta el repositorio.
2. Configura el Build Command:
   ```
   npm install
   ```
3. Configura el Start Command:
   ```
   npm start
   ```
4. En **Environment Variables**, agrega todas las variables del `.env.example` con sus valores reales.
5. Render asigna el `PORT` automáticamente; `server.js` usa `process.env.PORT || 3000`.
6. Render llama a `GET /api/health` como health check — responde `200 { status: "ok" }`.
7. Haz deploy. El sitio estará disponible en `https://<tu-servicio>.onrender.com`.

### CORS en producción

Antes del primer deploy real, cambia el `origin: '*'` en `server.js` al dominio de Render:

```js
app.use(cors({ origin: 'https://<tu-servicio>.onrender.com' }));
```

---

## Panel de administración

Accede a `/admin` con el correo y contraseña creados en Supabase Auth. Desde el panel puedes gestionar citas, servicios, portafolio, pedidos y enviar ofertas por correo a las clientas suscritas.

---

*Proyecto desarrollado para Yessica Marlen Calderón Luna — Yessy Nails, Ecatepec de Morelos, Estado de México.*
