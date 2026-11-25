# YESSY NAILS — Contexto del Proyecto

> Documento de arquitectura y estado actual.
> Salón de uñas de **Yessica Marlen Calderón Luna**.
> Última verificación: migración a **Supabase (PostgreSQL + Auth)** completa; rutas del backend, login y subida de imágenes funcionando.
> **Última actualización:** implementación del **Módulo 4 — Segunda Mitad**: renombrado de 16 fotos reales (`public/img/diseno-01.jpg` … `diseno-16.jpg`), migración SQL `supabase/migrations/update_modulo4.sql` con portafolio real, registro de clientas desde `index.html`, anticipo $50 MXN y métodos de pago (SPEI dinámico + tarjeta modo prueba) en `agendar.html`, toggle de auto-cancelación en `/admin`, y etiquetas de folio/falta respuesta en la tabla de citas.

---

## 1. Stack técnico

| Capa           | Tecnología                                                       |
| -------------- | --------------------------------------------------------------- |
| Runtime        | Node.js **v24** (ES Modules, `"type": "module"`)                 |
| Servidor       | Express 4.x                                                     |
| Base de datos  | **Supabase — PostgreSQL** (`@supabase/supabase-js ^2.119.2`)     |
| Autenticación  | **Supabase Auth** (`signInWithPassword`, JWT de Supabase)        |
| Carga archivos | **Multer 2.5.0** (disco local → `/public/uploads`)               |
| Config entorno | `dotenv ^18.0.10`                                               |
| Frontend       | HTML + CSS + JS vanilla servido como estático                    |
| CORS           | `cors` (abierto `*` — restringir en producción)                  |

Scripts (`package.json`):

- `npm start` → `node server.js`
- `npm run dev` → `node --watch server.js`

> Ya **no existe** `npm run setup` ni dependencias `sql.js`, `bcryptjs` ni `jsonwebtoken`.

---

## 2. Variables de entorno (`.env`)

```
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
PORT=3000
```

Compatibilidad con la nueva nomenclatura de llaves (opcionales):

```
SUPABASE_PUBLISHABLE_KEY=...   # alternativa a SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY=...        # alternativa a SUPABASE_SERVICE_ROLE_KEY
```

- **`SUPABASE_ANON_KEY`** → se usa en el cliente `supabase` para validar/emitir sesiones de Supabase Auth.
- **`SUPABASE_SERVICE_ROLE_KEY`** → cliente `supabaseAdmin` que **omite RLS**; es el que usan los modelos para leer/escribir la base de datos desde el backend.
- Ya **no se usan** `JWT_SECRET`, `ADMIN_USER` ni `ADMIN_PASSWORD`.

---

## 3. Estructura de carpetas

```
yessy-nails/
├── server.js                     # Entry point Express (monta rutas + estáticos)
├── package.json
├── .env / .env.example           # SUPABASE_* + PORT
├── supabase_schema.sql           # Esquema PostgreSQL (copiar/pegar en SQL Editor)
├── update_datos_reales.sql       # Datos reales (config + servicios); ejecutable en SQL Editor
├── supabase/
│   └── migrations/
│       ├── yessy_nails_schema.sql   # Copia del esquema para migraciones
│       └── update_datos_reales.sql  # Migración de datos reales del negocio
├── public/                       # Frontend estático
│   ├── *.html                    # index, agendar, chat, perfil, portafolio,
│   │                             #   servicios, ubicacion, admin
│   ├── styles.css                # Hoja de estilos única
│   ├── css/                      # admin.css y otros
│   ├── js/                       # main, admin, agendar, chat, portafolio, servicios
│   └── uploads/                  # Imágenes subidas (se autocrea)
└── src/
    ├── config/supabase.js        # Clientes supabase + supabaseAdmin
    ├── controllers/              # config, service, portfolio, appointment, chat, admin
    ├── models/                   # config, service, portfolio, appointment, chat
    ├── middlewares/              # auth, error, upload
    ├── routes/                   # config, service, portfolio, appointment, chat, admin, upload
    └── utils/                    # response.js (respuestas estándar)
```

Arquitectura en capas **routes → controllers → models → Supabase**. Las respuestas
JSON usan un formato uniforme desde `src/utils/response.js`
(`{ success, message, data, timestamp }`).

> Archivos **eliminados** en la migración: `src/config/db.js` (SQLite/sql.js),
> `src/utils/setup.js` (hash bcrypt del admin), `src/models/admin.model.js`
> (tabla `admin_usuarios`) y `database/database.sql` (esquema SQLite obsoleto).

---

## 4. Rutas de la API

Todas montadas en `server.js`. `admin` = requiere `Authorization: Bearer <token JWT de Supabase>`.

### Configuración — `/api/config`
| Método | Ruta  | Acceso  | Descripción                       |
| ------ | ----- | ------- | --------------------------------- |
| GET    | `/`   | público | Configuración del sitio          |
| PUT    | `/`   | admin   | Actualiza configuración (imagen banner incluida) |

### Servicios — `/api/servicios`
| Método | Ruta          | Acceso  |
| ------ | ------------- | ------- |
| GET    | `/`           | público |
| GET    | `/categorias` | público |
| GET    | `/:id`        | público |
| POST   | `/`           | admin   |
| PUT    | `/:id`        | admin   |
| DELETE | `/:id`        | admin (borrado físico) |

### Portafolio — `/api/portafolio`
| Método | Ruta       | Acceso  |
| ------ | ---------- | ------- |
| GET    | `/`        | público |
| GET    | `/estilos` | público |
| GET    | `/:id`     | público |
| POST   | `/`        | admin   |
| PUT    | `/:id`     | admin   |
| DELETE | `/:id`     | admin   |

### Citas — `/api/citas`
| Método | Ruta              | Acceso  |
| ------ | ----------------- | ------- |
| GET    | `/disponibilidad` | público |
| POST   | `/`               | público (clientes agendan) |
| GET    | `/`               | admin   |
| GET    | `/hoy`            | admin   |
| GET    | `/:id`            | admin   |
| PUT    | `/:id`            | admin   |
| DELETE | `/:id`            | admin   |

### Pedidos — `/api/pedidos`
| Método | Ruta       | Acceso  | Descripción |
| ------ | ---------- | ------- | ----------- |
| POST   | `/`        | público | Clienta registra un pedido de la tienda |
| GET    | `/`        | admin   | Lista todos los pedidos |
| PUT    | `/:id`     | admin   | Cambia estado (`pendiente`, `confirmado`, `entregado`, `cancelado`) |
| DELETE | `/:id`     | admin   | Elimina un pedido |

### Clientes — `/api/clientes`
| Método | Ruta | Acceso  | Descripción |
| ------ | ---- | ------- | ----------- |
| POST   | `/`  | público | Registro ligero de clienta (nombre + correo) |
| GET    | `/`  | admin   | Lista todas las clientas |

### Chat — `/api/chat`
| Método | Ruta                     | Acceso  |
| ------ | ------------------------ | ------- |
| GET    | `/salas`                 | admin   |
| PUT    | `/salas/:salaId/leer`    | admin   |
| GET    | `/no-leidos`             | admin   |
| GET    | `/salas/:salaId`         | público |
| GET    | `/:salaId`               | público |
| POST   | `/mensajes`              | público |
| POST   | `/`                      | público |

### Admin — `/api/admin`
| Método | Ruta                | Acceso  | Descripción                          |
| ------ | ------------------- | ------- | ------------------------------------ |
| POST   | `/login`            | público | `{ correo, password }` → Supabase Auth |
| GET    | `/perfil`           | admin   | Perfil del admin autenticado         |
| PUT    | `/cambiar-password` | admin   | `{ password_actual, password_nueva }` |
| POST   | `/enviar-oferta`    | admin   | Envía promo por correo a todas las clientas con `acepta_promociones = true` |

### Upload — `/api/upload`
| Método | Ruta | Acceso | Descripción                                       |
| ------ | ---- | ------ | ------------------------------------------------- |
| POST   | `/`  | admin  | Sube 1 imagen → `public/uploads/`, devuelve `url` |

### Otros
- `GET /api` → health check.
- `GET *` (no-API) → SPA fallback → `public/index.html`.

---

## 5. Tablas de la base de datos (Supabase / PostgreSQL)

Definidas en `supabase_schema.sql` (ejecutado en el SQL Editor de Supabase).
Las **7 tablas** existen en el proyecto y tienen **RLS habilitado**.

| Tabla                 | Propósito                                   | Notas |
| --------------------- | ------------------------------------------- | ----- |
| `configuracion_sitio` | Config editable del sitio (fila única `id=1`) | banner, whatsapp, bio, años de experiencia, horario, **promo del mes**, **latitud/longitud del mapa** y datos bancarios de transferencia (texto genérico de ejemplo) |
| `clientes`            | Registro de clientas                        | `correo` UNIQUE; `acepta_promociones` |
| `servicios`           | Catálogo de servicios                       | `categoria` con CHECK de **7** valores (Acrílico, Gelish, Soft Gel, Polygel, Retiro/Mantenimiento, Pedicure/Spa, Cejas) |
| `portafolio`          | Galería de trabajos                         | `estilo` con CHECK de 4 valores |
| `citas`               | Agenda de clientes                          | FK → `clientes.id` y `servicios.id`; estados con CHECK |
| `pedidos`             | Pedidos / entregas a domicilio              | `items_json` (`jsonb`); **aún sin endpoints** |
| `mensajes_chat`       | Mensajería cliente ↔ Yessica                | `rol` cliente/yessica |

**Políticas RLS:**
- Lectura pública (`anon` + `authenticated`) de `configuracion_sitio`, `servicios` y `portafolio`.
- Acceso total (`ALL`) para usuarios `authenticated` (panel admin).
- El backend opera con la llave **service_role**, que **omite RLS** (escritura de citas, pedidos, clientes y mensajes).

Campos de imagen relevantes para la subida:
`servicios.imagen_url`, `portafolio.imagen_url`, `configuracion_sitio.imagen_banner_url`.

---

## 6. Autenticación (Supabase Auth)

- **No existe** tabla de administradores ni credenciales por defecto en el código.
- El login del panel se valida con `supabase.auth.signInWithPassword({ email, password })`.
- Las rutas de administración y `POST /api/upload` se protegen con `authMiddleware`, que
  valida el JWT con `supabase.auth.getUser(token)`.
- El token se guarda en `localStorage` (`yessy_admin_token`) y se envía como `Bearer`.

**Para crear la cuenta de Yessica:**
`Supabase Dashboard → Authentication → Users → "Add user"` (marcar **Auto Confirm User**).
Su correo y contraseña serán las credenciales del panel en `/admin`.

---

## 7. Estado de la carga de imágenes (Multer)

**Verificado y funcionando.**

- `public/uploads/` **se crea automáticamente** al importar el middleware si no existe. ✅
- `POST /api/upload` sin token → **401** (protegido por `authMiddleware`). ✅
- `POST /api/upload` con token válido + campo `imagen` → **201** con
  `{ filename, url: "/uploads/img-...png", size, mimetype }`. ✅
- Validación: solo MIME `image/*` (JPG, PNG, WebP, GIF, SVG), máx **10 MB**.

**Compatibilidad con URLs en la nube:** se mantiene. Los formularios del panel usan
inputs `type="file"` (subida) **y** `type="url"` (`imagen_url` / `imagen_banner_url`),
por lo que el campo acepta tanto una URL externa como la ruta relativa `/uploads/...`.
El widget de subida ya está conectado en `admin.html` / `admin.js` (banner, servicios y portafolio).

---

## 8. Verificaciones realizadas (post-migración)

Servidor levantado con `node server.js` y probado contra el proyecto Supabase real:

- `GET /api/config` → **200** con la configuración (`titulo_banner = "Yessy Nails"`, `anos_experiencia = 8`, dirección y coordenadas de Ecatepec). ✅
- `GET /api/servicios` → **200**, **3** servicios reales del salón. ✅
- `GET /api/portafolio` → **200**, **8** trabajos. ✅
- `GET /api/citas/disponibilidad?fecha=2026-12-01&hora=10:00` → **200**, `disponible: true`. ✅
- `GET /api/citas` (sin token) → **401**. ✅
- `GET /api/chat/salas` (sin token) → **401**. ✅
- `POST /api/upload` (sin token) → **401**. ✅
- `POST /api/admin/login` con credenciales inválidas → **401**. ✅
- `GET /api/chat/salas/sala_maria_001` (público) → **200**, 4 mensajes. ✅
- `node --check` en todos los `.js` de `src/` y `server.js` → sin errores de sintaxis. ✅

---

## 9. Datos reales y ajustes de UI/UX (última actualización)

### 9.1 Identidad real del negocio
- **Yessica Marlen Calderón Luna**, **8 años de experiencia**, trabajo **100% garantizado**.
- Fotografía local **[`public/img/yessica.jpg`](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/img/yessica.jpg)** usada en [index.html](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/index.html) y [perfil.html](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/perfil.html) con diseño responsivo.
- **Promoción del mes editable** desde `/admin` (campos `promo_mes_titulo` / `promo_mes_texto` en `configuracion_sitio`). Valor por defecto: *"Promoción de Diciembre: Uñas acrílicas desde $250 MXN, de 1 a 3 tonos hasta el número 3."* El bloque se oculta automáticamente si los campos están vacíos.

### 9.2 Servicios reales (`servicios` + `servicios.html`)
Catálogo reducido a los **3 servicios reales** del salón:

| Servicio | Categoría | Precio | Duración |
| -------- | --------- | ------ | -------- |
| Uñas Acrílicas (Promo del Mes) | Acrílico | desde **$250 MXN** (1 a 3 tonos hasta el n.º 3) | 120 min |
| Pedispa Completo | Pedicure/Spa | desde **$320 MXN** (exfoliación, cuadratura, masaje relajante, removedor de callosidad y células muertas, gel semipermanente 1-3 tonos) | 90 min |
| Planchado y Perfilado de Ceja | Cejas | **$150 MXN** | 30 min |

- Se amplió el **CHECK de `categoria`** en `servicios` a 7 valores (`supabase_schema.sql` + migración).
- El **cotizador interactivo** (largo #1–#5, retiro y extras) se conserva y sigue conectado al botón de agendar; solo ofrece como "servicio base" los servicios de aplicación de uñas (`Acrílico`, `Gelish`, `Soft Gel`, `Polygel`).
- Pestañas de categoría actualizadas: **Todos · Acrílico · Pedicure & Spa · Cejas**.

### 9.3 Ubicación y mapas (Leaflet + OpenStreetMap)
- **Sin API keys de pago**: `Leaflet.js 1.9.4` + tiles de **OpenStreetMap** y geocodificación con **Nominatim** (`https://nominatim.openstreetmap.org/search`).
- Implementado en [index.html](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/index.html) y [ubicacion.html](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/ubicacion.html) (se eliminó el `<iframe>` de Google Maps); lógica en [main.js](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/js/main.js) (`initLocationMap` / `initLocationSearch`).
- **Dirección real**: *Las Américas (Av. Ignacio López Rayón entre Simón Bolívar y límite con Jardines de Morelos, Mz 42 Lt 5), Ecatepec de Morelos, Estado de México*.
- **Coordenadas** aproximadas `19.5855, -99.0195`, editables desde `/admin` (`latitud` / `longitud`).

### 9.4 Panel `/admin`: formularios y chat
- Se definieron en [admin.css](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/css/admin.css) las clases **`.form-group`, `.form-label`, `.form-control`, `.form-row`** (antes inexistentes), con `width: 100%`, padding, bordes visibles y **cuadrícula de 2 columnas** (colapsa a 1 en móvil). Corrige el desorden visual de los formularios.
- **Vista previa del banner**: si la URL está vacía o falla la carga (`onerror`), la imagen se oculta y se muestra un **degradado elegante** de fondo (`.banner-preview-box`) en lugar de un cuadro roto.
- **Chat (Bandeja de admin y chat público)**: `fecha_envio` se formatea en JS con `toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day, month, hour, minute, hour12 })` — nunca se muestra el ISO crudo (ver `formatMsgTime` en [admin.js](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/js/admin.js) y [chat.js](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/public/js/chat.js)).
- **Agrupación de salas**: el nombre mostrado es el de la **clienta** (tomado del mensaje con `rol === 'cliente'` en [chat.model.js](file:///c:/Users/DELL/OneDrive/Desktop/yessy-nails/src/models/chat.model.js)), no "Yessica". Con respaldo al último remitente si la sala no tuviera mensajes de clienta.

### 9.5 Seguridad bancaria
- No hay cuentas/tarjetas reales en el código. Los campos `banco_transferencia`, `titular_transferencia` y `clabe_transferencia` quedan en `configuracion_sitio` con **texto genérico de ejemplo** (`CLABE = 000000000000000000`) y se editan desde `/admin`.

---

## 10. Checklist de pendientes

> **Estado al cierre técnico (Módulo 5):** todos los ítems de calidad, seguridad y pruebas completados. ✅

### Datos / Supabase
- [x] Cargar los **datos reales** del negocio (identidad, 3 servicios, dirección/coordenadas, promo del mes) en `configuracion_sitio` y `servicios` — vía `update_datos_reales.sql`. ✅
- [ ] Crear la cuenta de Yessica en **Authentication → Users** (con "Auto Confirm User"). *(acción manual en Supabase Dashboard)*
- [ ] Restringir **CORS** al dominio real antes de producción.
- [ ] Los cambios de esquema futuros deben reflejarse en `supabase_schema.sql` y en `supabase/migrations/`; los cambios de **datos** en `update_datos_reales.sql` y su copia en `supabase/migrations/`.

### Carga de imágenes
- [ ] Endpoint/opción para **eliminar** la imagen física al borrar un registro o
      reemplazarla (hoy solo se borra el registro, el archivo queda en `/uploads`).
- [ ] Añadir `.gitkeep` en `public/uploads/` y sanitizar el nombre de archivo.
- [ ] Almacenamiento en nube (Cloudflare R2) para producción.

### SEO y Accesibilidad ✅ (Módulo 5)
- [x] `lang="es"` en `<html>` de todas las páginas públicas. ✅
- [x] `<title>` único y descriptivo en las 8 páginas públicas. ✅
- [x] `<meta name="description">` en las 8 páginas públicas. ✅
- [x] Etiquetas Open Graph (`og:title`, `og:description`, `og:type`, `og:image`, `og:url`) en todas las páginas. ✅
- [x] Estructura semántica `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` en todas las páginas. ✅
- [x] Atributos `alt` descriptivos en las imágenes del frontend. ✅

### Seguridad y Validación Backend ✅ (Módulo 5)
- [x] Saneamiento de entradas (elimina etiquetas HTML/scripts) en controladores de citas, pedidos, clientes y chat — vía `src/utils/sanitize.js`. ✅
- [x] Validación de formato de correo electrónico en los controladores. ✅
- [x] Status `400` con mensaje claro cuando faltan campos obligatorios. ✅
- [x] Cabeceras HTTP de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`) sin bloquear Leaflet CDN ni Google Fonts. ✅

### Pruebas Automatizadas ✅ (Módulo 5)
- [x] `jest` y `supertest` instalados como `devDependencies`. ✅
- [x] Script `"test"` con `cross-env NODE_ENV=test node --experimental-vm-modules jest.js` (compatible Windows y Linux). ✅
- [x] `server.js` exporta `app` y solo ejecuta `app.listen(...)` cuando `NODE_ENV !== 'test'`. ✅
- [x] `tests/api.test.js` con 6 pruebas — todas en verde con `npm test`. ✅
  - `GET /api/health` → 200 `{ status: 'ok' }`
  - `GET /api/config` → 200 con datos del salón
  - `GET /api/servicios` → 200 con arreglo de servicios
  - `GET /api/portafolio` → 200 con diseños
  - `POST /api/citas` sin datos → 400
  - `GET /api/citas` sin token → 401

### Preparación para Render ✅ (Módulo 5)
- [x] `server.js` usa `process.env.PORT || 3000`. ✅
- [x] Endpoint `GET /api/health` → `200 { status: 'ok' }`. ✅
- [x] `README.md` profesional con arquitectura, estructura, variables de entorno, instalación, pruebas y guía de despliegue en Render. ✅
- [x] `CONTEXTO_PROYECTO.md` actualizado con todo el checklist. ✅

### Módulo de pedidos y correos (implementados en esta iteración) ✅
- [x] `public/pedidos.html` — tienda con catálogo de 12 productos (Acrílico, Geles, Accesorios, Novedades), carrito JS, mini-mapa Leaflet arrastrable para elegir punto de entrega en Ecatepec. ✅
- [x] Enlace "Pedidos" en el `<nav>` y footer de **todas** las páginas HTML. ✅
- [x] API completa `/api/pedidos` (POST público, GET/PUT/DELETE protegidos) montada en `server.js`. ✅
- [x] API `/api/clientes` montada en `server.js`. ✅
- [x] Ruta `POST /api/admin/enviar-oferta` (admin) — envía oferta a todas las clientas con `acepta_promociones = true`. ✅
- [x] Panel `/admin` — pestaña **Pedidos**: tabla con estados editables, estadísticas rápidas y filtros. ✅
- [x] Panel `/admin` — pestaña **Enviar Oferta**: campo de asunto + textarea de mensaje, vista previa en vivo, confirmación antes de enviar. ✅
- [x] `src/services/email.service.js`: Brevo HTTP (prioridad) + Nodemailer respaldo + log en consola sin romper si no hay llaves. ✅
- [x] Correos automáticos: nueva cita (clienta + admin), cancelación de cita (clienta), nuevo pedido (clienta + admin). ✅
- [x] `.env.example` actualizado con `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `ADMIN_EMAIL`, `EMAIL_USER`, `EMAIL_PASS`, `SITE_URL`. ✅

### Funcionalidades pendientes
- [ ] Pasarela de pago (Stripe) — los CHECK ya contemplan `pasarela_futura`.
- [ ] Recordatorios automáticos de citas (cron job externo o Supabase Edge Functions).

### Módulo 4 — Segunda Mitad ✅
- [x] Renombrar 16 fotos reales a `diseno-01.jpg` … `diseno-16.jpg` (sin tocar `yessica.jpg`). ✅
- [x] `supabase/migrations/update_modulo4.sql` — portafolio real con 16 imágenes. ✅
- [x] `supabase_schema.sql` actualizado (CHECK portafolio + seed de 16 diseños). ✅
- [x] `index.html` — bloque "Recibe nuestras promociones del mes" → `POST /api/clientes`. ✅
- [x] `agendar.html` — política de anticipo $50 MXN visible. ✅
- [x] `agendar.html` — SPEI dinámico desde `/api/config` + campo folio. ✅
- [x] `agendar.html` — tarjeta modo prueba con visualizador interactivo. ✅
- [x] `/admin` Citas — toggle ON/OFF auto-cancelación + botón "Verificar Pendientes". ✅
- [x] `/admin` Citas — etiquetas "Folio enviado" / "Sin folio" en citas pendientes. ✅
- [x] `node --check` en todos los `.js` → sin errores de sintaxis. ✅
- [ ] Crear la cuenta de Yessica en **Authentication → Users** (con "Auto Confirm User").
- [ ] Restringir **CORS** al dominio real antes de producción.
- [ ] Endpoint/opción para **eliminar** la imagen física al borrar un registro.
- [ ] Almacenamiento en nube (Cloudflare R2) para producción.

---

## 11. Módulo 4 — Segunda Mitad (implementado)

### 11.1 Fotos reales del portafolio
- Las 16 fotos de WhatsApp en `public/img/` fueron renombradas a `diseno-01.jpg` … `diseno-16.jpg` (script temporal ya eliminado). `yessica.jpg` no fue modificada.
- `supabase/migrations/update_modulo4.sql` limpia los 8 trabajos demo y carga los 16 diseños reales con títulos, estilos y descripciones variados (Acrílico, Minimalista, 3D, Francés, Temporada).
- El CHECK de `estilo` en `portafolio` se amplió a 5 valores (añadido `'Acrílico'`) en `supabase_schema.sql` y en la migración.

### 11.2 Registro ligero de clientas desde `index.html`
- Bloque "Recibe nuestras promociones del mes" (nombre + correo) al final de `index.html`, conectado a `POST /api/clientes` con upsert por correo y `acepta_promociones: true`.
- Al agendar una cita con correo, `appointment.controller.js` ya hace upsert en `clientes` (implementado en módulo anterior).

### 11.3 Anticipo $50 MXN y métodos de pago en `agendar.html`
- Política de anticipo visible antes de los métodos de pago.
- **Transferencia SPEI**: panel dinámico que carga banco, titular y CLABE desde `GET /api/config` (nunca hardcodeados). Botón "Copiar CLABE". Campo de folio/referencia.
- **Tarjeta modo prueba**: visualizador interactivo de tarjeta que actualiza en tiempo real, campos de número, nombre, vencimiento y CVV con formateo automático, y botón de autorización simulada (no hace cargo real).
- El `folio_transferencia` se envía al backend en el payload de la cita.

### 11.4 Auto-cancelación en `/admin`
- Toggle ON/OFF ("Auto-cancelación de Citas Sin Anticipo") en la pestaña Agenda de Citas.
- Guarda `auto_cancelar_sin_confirmar` y `horas_limite_confirmacion` en `configuracion_sitio` via `PUT /api/config`.
- Botón "Verificar Citas Pendientes Ahora" llama a `POST /api/citas/verificar`.
- Si ON: cancela citas `pendiente` sin folio y sin `estado_confirmacion_cliente = 'respondido'` que superan el límite y envía correo de cancelación (sin romper si no hay llaves).
- Si OFF: permanecen pendientes. La tabla muestra etiqueta verde "Folio enviado" o amarilla "Sin folio" en cada cita pendiente.

---

## 11. Cómo ejecutar

```bash
npm install          # instalar dependencias
npm run dev          # desarrollo con auto-reload
npm start            # producción
```

Acceso al panel: **`/admin`** → iniciar sesión con el correo/contraseña creados en
**Supabase Auth** (ya no hay credenciales por defecto en el código).
