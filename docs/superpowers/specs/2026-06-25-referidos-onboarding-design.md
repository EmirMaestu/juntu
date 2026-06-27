# Referidos + Onboarding (beta solo-invitación) — Design

**Fecha:** 2026-06-25
**Estado:** aprobado por el user; listo para plan de implementación.

## Objetivo

Permitir que entren **usuarios nuevos** a Yumi **solo por invitación** (beta cerrada con amigos),
trackeando **quién invitó a quién** (referidos). El onboarding debe ser **agnóstico al canal**:
funciona en **Telegram ya**, y queda listo para **WhatsApp** (Meta Cloud API) cuando lleguen
las credenciales.

## Decisiones tomadas

- **Solo-invitación.** Únicamente **admins** reparten links de invitación durante la beta.
  Los amigos que entran pueden **usar** el bot pero **no invitar** (un flag lo abre después).
- **Mecanismo:** link **reutilizable** por admin (no tokens de un solo uso — YAGNI por ahora).
  Si se filtra: los topes de costo (15 msgs/día free, US$5/día global) limitan el daño y se puede
  **desactivar a cualquiera desde el panel admin** (ya existe).
- **Gating:** "permitido" pasa a significar **usuario registrado activo** (existe en `users`),
  no `telegram_id ∈ ALLOWED_USER_IDS`. `ALLOWED_USER_IDS` se mantiene solo para **admin** y para
  el plan `pareja`.
- **No registrado** que escribe sin invitación válida → **mensaje predefinido** "registrate en Yumi"
  (dominio pronto).
- **Proveedor WhatsApp:** Meta WhatsApp Business Platform (Cloud API). Más barato para un asistente
  conversacional (mensajes de servicio user-initiated = gratis) y el audio se baja y se transcribe con
  el **Whisper que ya existe** (mismo pipeline que Telegram).
- **Recompensas de referido:** por ahora **solo tracking**; se atan a MercadoPago después.

## Arquitectura / componentes

### Núcleo de referidos+onboarding (channel-agnostic) — `vps_current/main.py`
Funciones puras que NO dependen de `update`/`context` de Telegram, para reusar desde cualquier canal:

- `gen_referral_code()` → string corto único (ej. 6–8 chars `[a-z0-9]`, sin ambiguos).
- `get_user_by_referral_code(code)` → fila de `users` o None.
- `can_invite(user)` → bool. Beta: `True` solo si el user es admin (`telegram_id ∈ ADMIN/ALLOWED`)
  o `INVITE_MODE == "all"`.
- `onboard_user(channel, channel_user_id, display_name, referred_by_id)` →
  crea la fila en `users` (genera `username` web único + clave temporal random + `referral_code`),
  setea `referred_by`, `plan='free'`. Devuelve `(user_row, temp_password)`. Idempotente:
  si ya existe ese `channel_user_id`, devuelve el existente sin recrear.
- `invite_link_for(user, bot_username, wa_number)` → arma el/los link(s) de invitación.

### Adaptador Telegram (ya existe, se modifica)
- `start_cmd`: si viene `/start <code>` (deep-link `t.me/<bot>?start=<code>`):
  - valida code → `can_invite(referrer)` → `onboard_user("telegram", tg_id, first_name, referrer.id)`
  - responde bienvenida + acceso web (usuario + “poné tu clave con /password”).
  - code inválido / sin code / referrer no puede invitar → mensaje "registrate en Yumi".
- `is_allowed(update)`: cambia a **"¿es usuario registrado activo?"** (consulta `users` por
  `telegram_id`), en vez de chequear `ALLOWED_USER_IDS`. Si no está registrado → el handler responde
  el mensaje predefinido (no silencio).

### Adaptador WhatsApp (FASE 2, cuando lleguen credenciales) — `vps_current/whatsapp.py` (nuevo)
- Webhook FastAPI (`GET` verify + `POST` receive) montado en `web.py` o app aparte; ruta pública por Caddy.
- Verificación de firma con App Secret; verify token.
- Recibir: parsea mensajes (texto/audio), descarga media (media-id → URL → download con token),
  corre Whisper para audio (reusa el pipeline existente), y enruta al mismo `process_text`/onboarding.
- Enviar: helper `wa_send(to, text)`.
- Onboarding por `wa.me/<numero>?text=<frase con code>`: el primer mensaje del usuario nuevo trae el code;
  el webhook llama `onboard_user("whatsapp", phone, profile_name, referrer.id)`.

### Panel admin (reemplaza el stub de referidos) — `web-react` + `web.py`
- `web.py`: `GET /api/admin/referrals` → por usuario: `referral_code`, link(s), cantidad de invitados,
  y `referred_by` (nombre). `GET /api/me` ya expone `is_admin`.
- `routes/Admin.tsx`: sección **Referidos** → tu link copiable + lista "quién invitó a quién"
  (árbol/contador simple). Reemplaza el "próximamente".

## Cambios de datos (`users`, vía `_ALTERS` en `main.py`)

- `referral_code TEXT` — único; **se genera para todos los usuarios existentes** en la migración
  (idempotente: solo si está NULL).
- `referred_by INTEGER` — id del referente (NULL para fundadores).
- `channel TEXT DEFAULT 'telegram'` — canal de alta del usuario.
- **FASE 2 (WhatsApp):** identificación por teléfono. `telegram_id` hoy es `NOT NULL UNIQUE`, lo que no
  encaja para usuarios de WhatsApp. Se resuelve en Fase 2 (agregar `wa_id TEXT` + relajar `telegram_id`
  vía rebuild de tabla o id sintético). **No se toca ahora** porque la Fase 1 onboarda por Telegram.

## Config (env)

- `INVITE_MODE` = `admins` (default, beta) | `all` (cuando se abra a que todos inviten).
- `PUBLIC_SIGNUP_URL` (opcional) — para el mensaje "registrate en Yumi" cuando haya dominio.
- FASE 2: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`, `WHATSAPP_APP_SECRET`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_NUMBER` (para el `wa.me`).

## Flujo (Telegram, Fase 1)

1. Admin comparte `t.me/<bot>?start=<su_referral_code>`.
2. Persona nueva lo abre → `/start <code>`.
3. Bot valida: `code` existe, su dueño `can_invite`. Sí → `onboard_user(...)` →
   bienvenida + acceso web. No → "registrate en Yumi".
4. A partir de ahí esa persona es **usuario registrado**: el bot le responde normal (gating por `users`).

## Manejo de errores

- `onboard_user` idempotente (no duplica si reabren el link).
- Código inválido/ausente → mensaje predefinido (nunca crash, nunca silencio).
- `referral_code` colisión → regenerar (loop corto).
- Migración: `_ALTERS` con guard de tabla/columna existente (ya implementado); generación de codes
  para existentes en un paso aparte idempotente.
- Todo cambio sobre el bot en vivo: `py_compile` en el VPS + diff vs vivo + backup, restart por el user.

## Testing / verificación

- `py_compile` del bot y la web en el VPS antes de deploy.
- Telegram: probar el deep-link con un tercer número (alta + bienvenida + que después responda normal)
  y que un no-invitado reciba el mensaje predefinido.
- Admin: que la sección Referidos muestre el link y el conteo.
- Build del front (`tsc -b`) verde.

## Fuera de alcance (YAGNI / fases futuras)

- Recompensas por referido (se atan a MercadoPago).
- Tokens de invitación de un solo uso / con vencimiento.
- Que los amigos (no-admin) inviten (flag `INVITE_MODE=all`).
- Signup por web/dominio.
- WhatsApp adapter completo = **Fase 2** (depende de credenciales de Meta).
- MercadoPago (suscripciones) = tanda aparte.
