# Referidos + Onboarding (Fase 1, Telegram) — Implementation Plan

> **For agentic workers:** Implementar tarea por tarea. Steps con checkbox (`- [ ]`).
> **Nota de verificación:** este proyecto NO tiene suite de pytest y NO hay Python local
> (ver memoria). La verificación es: `py_compile` en el VPS (`~/asistente/venv/bin/python -m py_compile`),
> `tsc -b`/build del front, y prueba manual del deep-link. NO inventar pytest.

**Goal:** Que entren usuarios nuevos a Yumi solo por link de invitación (beta), trackeando quién
invitó a quién, con onboarding channel-agnostic (Telegram ya; WhatsApp = Fase 2).

**Architecture:** Núcleo de referidos/onboarding como funciones puras en `main.py` (no dependen de
`update`/`context`), llamadas desde el adaptador Telegram (`start_cmd`, handlers). El gate del bot pasa
de `ALLOWED_USER_IDS` a "¿usuario registrado en `users`?". Panel admin (web) muestra links + árbol de
referidos.

**Tech Stack:** Python (FastAPI + python-telegram-bot + sqlite3), React 19 + TS + TanStack Query.

---

## File Structure

- `vps_current/main.py` — schema (`_ALTERS`), migración (backfill referral_code), helpers
  (`gen_referral_code`, `get_user_by_referral_code`, `can_invite`, `onboard_user`), gate
  (`is_allowed` → registrado + `send_register_prompt`), `start_cmd` (deep-link onboarding).
- `vps_current/web.py` — `GET /api/admin/referrals`.
- `web-react/src/lib/types.ts` — `AdminReferral`, `AdminReferralsResponse`.
- `web-react/src/hooks/useAdmin.ts` — `useAdminReferrals`.
- `web-react/src/routes/Admin.tsx` — sección Referidos real (reemplaza stub).

---

### Task 1: Schema + backfill de referral_code (main.py)

**Files:** Modify: `vps_current/main.py` (`_ALTERS` dict y bloque post-`_ALTERS`)

- [ ] **Step 1: Extender `_ALTERS["users"]`**

```python
"users": [("plan", "TEXT DEFAULT 'free'"),
          ("referral_code", "TEXT"),
          ("referred_by", "INTEGER"),
          ("channel", "TEXT DEFAULT 'telegram'")],
```

- [ ] **Step 2: Backfill idempotente + índice único** — después del loop `_ALTERS` y del UPDATE de `plan='pareja'`, antes de `CREATE INDEX ... idx_items_list`:

```python
# referral_code para todos los usuarios que no tengan (idempotente)
_existing_codes = set(r[0] for r in conn.execute(
    "SELECT referral_code FROM users WHERE referral_code IS NOT NULL AND referral_code<>''").fetchall())
for (_uid,) in conn.execute(
        "SELECT id FROM users WHERE referral_code IS NULL OR referral_code=''").fetchall():
    _code = gen_referral_code()
    while _code in _existing_codes:
        _code = gen_referral_code()
    _existing_codes.add(_code)
    conn.execute("UPDATE users SET referral_code=? WHERE id=?", (_code, _uid))
conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_refcode ON users(referral_code)")
```

- [ ] **Step 3: Verificar** — `py_compile` (se hace en deploy, Task 7). Confirmá que `gen_referral_code` exista (Task 2 lo define; está a nivel módulo, disponible en `init`).

---

### Task 2: Helpers de referidos/onboarding (main.py)

**Files:** Modify: `vps_current/main.py` (junto a `get_user_by_tg`, ~línea 403)

- [ ] **Step 1: `gen_referral_code` + lookups + `can_invite`**

```python
INVITE_MODE = (os.environ.get("INVITE_MODE", "admins").strip().lower() or "admins")
_REF_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # sin caracteres ambiguos (no l/o/0/1/i)

def gen_referral_code(n=7):
    return "".join(secrets.choice(_REF_ALPHABET) for _ in range(n))

def get_user_by_referral_code(code):
    if not code: return None
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM users WHERE referral_code=? AND active=1", (code.strip(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def can_invite(user):
    """Beta: solo admins (telegram_id en ALLOWED_USER_IDS) pueden invitar. INVITE_MODE=all abre a todos."""
    if INVITE_MODE == "all": return True
    return bool(user) and user.get("telegram_id") in ALLOWED_USER_IDS
```

- [ ] **Step 2: `onboard_user` (idempotente, channel-agnostic)**

```python
def _unique_username(conn, base):
    base = re.sub(r"[^a-z0-9]", "", (base or "").lower()) or "user"
    base = base[:20]
    cand = base; i = 1
    while conn.execute("SELECT 1 FROM users WHERE username=?", (cand,)).fetchone():
        i += 1; cand = f"{base}{i}"
    return cand

def onboard_user(channel, channel_user_id, display_name, referred_by_id=None):
    """Crea (o devuelve, si ya existe) un usuario. Devuelve (user_dict, temp_password|None)."""
    if channel == "telegram":
        existing = get_user_by_tg(channel_user_id)
        if existing:
            return existing, None
    name = (display_name or "Usuario").strip()[:40] or "Usuario"
    temp_pw = secrets.token_urlsafe(6)
    conn = sqlite3.connect(DB_PATH); conn.row_factory = sqlite3.Row
    try:
        username = _unique_username(conn, name)
        code = gen_referral_code()
        while conn.execute("SELECT 1 FROM users WHERE referral_code=?", (code,)).fetchone():
            code = gen_referral_code()
        tg_id = channel_user_id if channel == "telegram" else None
        conn.execute(
            "INSERT INTO users(telegram_id, name, username, password_hash, plan, "
            "referral_code, referred_by, channel, active) VALUES (?,?,?,?,?,?,?,?,1)",
            (tg_id, name, username, hash_password(temp_pw), "free", code, referred_by_id, channel))
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        return dict(row), temp_pw
    finally:
        conn.close()
```

> Nota Fase 2: `telegram_id` es `NOT NULL` hoy; para WhatsApp (`tg_id=None`) habrá que relajarlo
> (rebuild de tabla) — fuera de alcance de Fase 1.

- [ ] **Step 3: Verificar** — `py_compile` en deploy (Task 7).

---

### Task 3: Gate por registro + mensaje predefinido (main.py)

**Files:** Modify: `vps_current/main.py` (`is_allowed` ~línea 989; handlers `handle_text`/`handle_voice`/`handle_photo`)

- [ ] **Step 1: Cambiar `is_allowed` a "registrado"**

```python
def is_allowed(update):
    """Permitido = usuario registrado activo (existe en users por telegram_id)."""
    try:
        return get_user_by_tg(update.effective_user.id) is not None
    except Exception:
        return False
```

- [ ] **Step 2: Helper de mensaje** (cerca de `is_allowed`)

```python
REGISTER_MSG = ("👋 Yumi todavía es por invitación.\n"
                "Pedile a quien te invitó su link de Yumi para entrar. "
                "Pronto vas a poder registrarte solo.")

async def send_register_prompt(update):
    try:
        await update.message.reply_text(REGISTER_MSG)
    except Exception:
        log.exception("no pude mandar register prompt")
```

- [ ] **Step 3: En `handle_text`, `handle_voice`, `handle_photo`** reemplazar `if not is_allowed(update): return` por:

```python
    if not is_allowed(update):
        await send_register_prompt(update); return
```

(El resto de comandos —`/resumen`, etc.— quedan con `if not is_allowed(update): return` silencioso; OK para beta.)

- [ ] **Step 4: Verificar** — `py_compile` en deploy.

---

### Task 4: Onboarding por deep-link en `start_cmd` (main.py)

**Files:** Modify: `vps_current/main.py` (`start_cmd` ~línea 2015)

- [ ] **Step 1: Reescribir `start_cmd`** para manejar `/start <code>`:

```python
async def start_cmd(update, context):
    user = get_user_by_tg(update.effective_user.id)
    if user:
        saludo = f"Hola {user['name']}."
        await update.message.reply_text(
            f"{saludo} Mandame texto, audios o fotos:\n\n"
            "💸 «pague 1000 coca cola con MP» / foto de un ticket\n"
            "💰 «me pagaron 500 USD takenos sueldo»\n"
            "🔁 «agenda Movistar 7000 todos los 10 con MP»\n"
            "📊 «cuanto gastamos los dos este mes?»\n"
            "📅 «cena con Ana viernes 21»\n"
            "⏰ «recordame manana 9 llamar al banco»\n"
            "✅ «tengo que pagar la luz»\n"
            "📓 «anota: idea para X»\n\n"
            "Comandos: /resumen /cuentas /recurrentes /movimientos /borrar N\n"
            "/tareas /done N /habitos /pendientes /notas\n"
            "/password <nueva> · /addcuenta <nombre> [tipo]")
        return
    # No registrado: ¿viene con código de invitación?
    code = (context.args[0].strip() if getattr(context, "args", None) else "")
    if code:
        referrer = get_user_by_referral_code(code)
        if referrer and can_invite(referrer):
            new_user, temp_pw = onboard_user(
                "telegram", update.effective_user.id,
                update.effective_user.first_name, referrer["id"])
            msg = (f"🎉 ¡Bienvenido/a a Yumi, {new_user['name']}! Te invitó {referrer['name']}.\n\n"
                   "Soy tu asistente: mandame texto, audios o fotos.\n"
                   "💸 «pagué 1000 de café con débito»\n"
                   "📅 «cena con Ana el viernes 21»\n"
                   "⏰ «recordame mañana 9 llamar al banco»\n\n")
            if temp_pw:
                msg += (f"🌐 Tu acceso web: usuario *{new_user['username']}*, "
                        f"clave temporal `{temp_pw}` — cambiala con /password <nueva>.")
            await update.message.reply_text(msg, parse_mode="Markdown")
            return
    await send_register_prompt(update)
```

- [ ] **Step 2: Verificar** — `py_compile` en deploy. Prueba manual del deep-link en Task 7.

---

### Task 5: Endpoint admin de referidos (web.py)

**Files:** Modify: `vps_current/web.py` (después de `api_admin_usage`)

- [ ] **Step 1: Agregar endpoint**

```python
BOT_USERNAME = os.environ.get("BOT_USERNAME", "").strip().lstrip("@")

@app.get("/api/admin/referrals")
def api_admin_referrals(user=Depends(require_admin)):
    with db() as conn:
        if not _col_exists(conn, "users", "referral_code"):
            return {"ready": False, "users": [], "bot_username": BOT_USERNAME}
        users = [dict(r) for r in conn.execute(
            "SELECT id, name, username, referral_code, referred_by, active FROM users ORDER BY id").fetchall()]
        counts = {}
        for r in conn.execute(
                "SELECT referred_by AS rb, COUNT(*) AS c FROM users "
                "WHERE referred_by IS NOT NULL GROUP BY referred_by").fetchall():
            counts[r["rb"]] = r["c"]
    names = {u["id"]: u["name"] for u in users}
    out = []
    for u in users:
        link = (f"https://t.me/{BOT_USERNAME}?start={u['referral_code']}"
                if BOT_USERNAME and u["referral_code"] else None)
        out.append({
            "id": u["id"], "name": u["name"], "username": u["username"],
            "referral_code": u["referral_code"], "invite_link": link,
            "invited_count": counts.get(u["id"], 0),
            "referred_by_name": names.get(u["referred_by"]) if u["referred_by"] else None,
        })
    return {"ready": True, "users": out, "bot_username": BOT_USERNAME}
```

- [ ] **Step 2: Verificar** — `py_compile` en deploy. (Si `BOT_USERNAME` no está en `.env`, `invite_link` viene `null` y el front muestra el código pelado — agregar `BOT_USERNAME=tu_bot` al `.env` en deploy.)

---

### Task 6: Sección Referidos en el panel (web-react)

**Files:** Modify: `lib/types.ts`, `hooks/useAdmin.ts`, `routes/Admin.tsx`

- [ ] **Step 1: Tipos** (`lib/types.ts`)

```ts
export interface AdminReferral {
  id: number
  name: string
  username: string
  referral_code: string | null
  invite_link: string | null
  invited_count: number
  referred_by_name: string | null
}
export interface AdminReferralsResponse {
  ready: boolean
  users: AdminReferral[]
  bot_username: string
}
```

- [ ] **Step 2: Hook** (`hooks/useAdmin.ts`)

```ts
import { type AdminOverview, type AdminUsersResponse, type AdminReferralsResponse } from '../lib/types'

export function useAdminReferrals() {
  return useQuery({
    queryKey: ['admin', 'referrals'],
    queryFn: () => apiGet<AdminReferralsResponse>('/api/admin/referrals'),
  })
}
```

- [ ] **Step 3: Reemplazar el stub de Referidos en `Admin.tsx`** por: mi link copiable (la fila cuyo `id === me.id`) + tabla "quién invitó a quién" (nombre · invitó N · lo invitó X). Usar `useAdminReferrals()` y `useMe()`. Botón "Copiar" con `navigator.clipboard.writeText`. Si `!ready`, mostrar "esperando migración (reiniciá el bot)". Si una fila no tiene `invite_link`, mostrar el `referral_code` y una nota de configurar `BOT_USERNAME`.

- [ ] **Step 4: Verificar** — `npm run build` (tsc verde) + render en preview (sin crash; contra el mock muestra estado vacío).

---

### Task 7: Deploy + verificación manual

- [ ] **Step 1:** `tr -d '\r' < main.py | ssh ... 'cat > ~/asistente/main.py.new && py_compile'` ; idem `web.py`. Diff vs vivo.
- [ ] **Step 2:** build front (`npm run build`) → `scp -r dist ...:~/asistente/webapp`.
- [ ] **Step 3:** backup + swap de `main.py`/`web.py` (emir owns, sin sudo). Recompilar el vivo.
- [ ] **Step 4:** agregar `BOT_USERNAME=<usuario_del_bot>` (y opcional `INVITE_MODE=admins`) al `~/asistente/.env`.
- [ ] **Step 5 (user, sudo):** `sudo cp -r ~/asistente/webapp /var/www/juntu` (+chmod) y `sudo systemctl restart asistente asistente-web`.
- [ ] **Step 6 (manual):** desde el panel admin copiar tu link `t.me/<bot>?start=<code>`; abrirlo con un tercer Telegram → debe onboardear + bienvenida; ese usuario después escribe y el bot responde normal; un no-invitado escribe → "registrate en Yumi"; en admin, el contador de invitados sube.

---

## Self-review

- **Cobertura del spec:** schema+migración (T1) ✓; helpers channel-agnostic (T2) ✓; gate→registrado + mensaje (T3) ✓; onboarding deep-link (T4) ✓; admin referrals (T5/T6) ✓; deploy/verif (T7) ✓. WhatsApp/MP/recompensas = fuera de alcance (Fase 2) ✓.
- **Sin placeholders:** todo el código está completo; los textos de bienvenida son finales.
- **Consistencia de tipos/nombres:** `gen_referral_code`, `get_user_by_referral_code`, `can_invite`,
  `onboard_user`, `is_allowed`, `send_register_prompt`, `INVITE_MODE`, `BOT_USERNAME`,
  `referral_code`/`referred_by`/`channel` usados consistente entre tareas y entre main.py/web.py/front.
- **Riesgo live-bot:** todos los cambios pasan `py_compile` + diff + backup antes del restart (que corre el user).
