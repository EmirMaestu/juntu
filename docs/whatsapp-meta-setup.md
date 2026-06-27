# Runbook: configurar Meta WhatsApp Cloud API (para Cowork)

**Para el agente que ejecuta:** operás el navegador logueado en la **cuenta de Meta de Emir** que es
dueña de la app **"yumi"**. Los pasos 1 y 2 se hacen YA (habilitan probar el bot). Los pasos 3 y 4 son
para producción (toman días por revisión de Meta). Las etiquetas exactas del panel de Meta pueden variar
un poco; adaptate al texto real que veas, manteniendo la intención de cada paso.

## Datos que vas a usar (copiar/pegar exacto)
- App: **yumi** (App ID `2006656056658348`)
- **Callback URL (webhook):** `https://asistente.emir-maestu.site/api/whatsapp/webhook`
- **Verify token:** `yumi-verify-2026`
- **Campo de webhook a suscribir:** `messages`
- **Número de PRUEBA del bot (lo da Meta):** `+1 555 636-5987` (Phone Number ID `1120492214486305`)
- **Número de PRODUCCIÓN del bot (comprado):** `+54 9 261 468-4953`
- **NO usar como destinatario de prueba:** el número del bot (2614684953).

---

## PASO 1 — Conectar el webhook (HACER YA, 2 min)
1. Ir a `https://developers.facebook.com` → **My Apps** → abrir la app **"yumi"**.
2. Menú izquierdo: **WhatsApp → Configuration** (o "Configuración").
3. En la tarjeta **Webhook**, click **Edit** / "Editar".
4. **Callback URL:** pegar `https://asistente.emir-maestu.site/api/whatsapp/webhook`
5. **Verify token:** pegar `yumi-verify-2026`
6. Click **Verify and save** / "Verificar y guardar". Debe quedar OK/verde (nuestro servidor responde
   el challenge — ya está probado).
7. En **Webhook fields** / "Campos del webhook", click **Manage** y **suscribir `messages`** (activar el
   toggle de "messages"). Guardar.

✅ Resultado esperado: webhook "Complete"/verde con `messages` suscrito.

---

## PASO 2 — Probar el bot YA (con el número de prueba)
El número del bot por ahora es el de PRUEBA (+1 555 636-5987). Necesitás un WhatsApp tuyo distinto para
hacer de "amigo".
1. **WhatsApp → API Setup** (o "Configuración de la API").
2. En la sección de **destinatarios** ("To" / "Para" / "Manage phone number list"), click **Add recipient**.
3. Ingresá un número de WhatsApp **real y tuyo que NO sea el del bot** (ej. el WhatsApp personal de Emir).
   Meta manda un código de verificación a ese WhatsApp → ingresalo para confirmarlo.
   - ⚠️ **NO** agregues 2614684953 acá (ese va a producción como número del bot).
4. Probar el onboarding: en la app Yumi (web) → **Admin → Referidos → "Copiar link WhatsApp"**. Abrir ese
   link desde el teléfono del destinatario de prueba → manda un mensaje precargado con el código → el bot
   debería **dar la bienvenida y crear la cuenta**. Después mandar *"pagué 1000 de café con débito"* → debe
   registrarlo y responder.

Si el bot recibe pero no responde, avisar al desarrollador (puede ser permiso del token).

---

## PASO 3 — Registrar el número de PRODUCCIÓN 2614684953
(La cuenta de WhatsApp de ese número ya fue eliminada del celular, así que el número está libre para la API.)

1. **WhatsApp → API Setup** → sección **"From"** / "Add phone number" → **Add phone number**.
2. Completar datos del negocio / **display name**: nombre visible **"Yumi"**; elegir categoría.
3. Ingresar el número **+54 9 261 468-4953**, elegir verificación por **SMS o llamada**, ingresar el código.
4. Cuando quede verificado, el número se asocia a la WhatsApp Business Account y obtiene un
   **Phone Number ID NUEVO** (distinto al de prueba).
   👉 **IMPORTANTE: copiar ese nuevo Phone Number ID (y, si se creó una WABA nueva, su ID) y pasárselo al
   desarrollador.** Hasta que el desarrollador actualice el `.env` (`WHATSAPP_PHONE_NUMBER_ID` y
   `WHATSAPP_NUMBER`), el bot sigue enviando desde el número de prueba.

---

## PASO 4 — Verificación del negocio (para mandarle a cualquiera)
Sin verificar / en modo desarrollo: solo se le puede escribir a destinatarios allow-listed y hay límites.
Para abrirlo a cualquiera:
1. `https://business.facebook.com` → **Business Settings** → **Security Center / Business Verification**.
2. Completar la verificación del negocio (documentos de la empresa, etc.). Tarda (revisión de Meta).
3. Cuando esté aprobada, pasar la app a modo **Live**/producción en el panel de la app.

---

## Qué reportar al desarrollador al terminar
- ✅ Paso 1 OK (webhook verde + `messages` suscrito).
- 🔢 Paso 3: el **nuevo Phone Number ID** del número de producción (+ ID de WABA nueva si aplica).
- Cualquier error que aparezca (texto exacto) en cualquier paso.

## Seguridad
- No pegar en chats el **App Secret** ni el **token permanente**.
- Recordatorio: rotar el token permanente cuando todo esté andando (se compartió en texto plano).
