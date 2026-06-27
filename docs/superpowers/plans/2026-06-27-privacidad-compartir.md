# Privacidad / Compartir — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo privado por default; cada usuario comparte con su hogar todo (`share_all`) o por cuenta (finanzas) / por ítem (resto). El bot y la web nunca devuelven data privada ajena.

**Architecture:** Una **regla de visibilidad central** en un módulo nuevo `visibility.py` (devuelve fragmento SQL + params), reusada por el bot (`main.py`), la web (`web.py`) y `crud_v2.py`. Flags `shared` por entidad (default 0) + `users.share_all` (default 0). Migración que resetea todo a privado **una sola vez** (sentinela en `app_meta`).

**Tech Stack:** Python (FastAPI, python-telegram-bot, SQLite), pytest (venv del VPS), React + TanStack Query.

**Spec:** `docs/superpowers/specs/2026-06-27-privacidad-compartir-design.md`

---

## Contexto de entorno (LEER)
- **No hay Python local.** Tests Python en el venv del VPS: `ssh emir@217.76.48.219 'cd ~/asistente && venv/bin/python -m pytest tests/... -v'`. Para correr, copiar el módulo y el test a `~/asistente/` (módulo) y `~/asistente/tests/` (test) con `scp`.
- **Deploy backend:** `tr -d '\r' < f.py | ssh … 'cat > ~/asistente/f.py.new && venv/bin/python -m py_compile ~/asistente/f.py.new'` → `diff --strip-trailing-cr` → backup + `mv` → el **usuario** corre `sudo systemctl restart asistente asistente-web`.
- **Deploy frontend:** `npm run build` en `web-react/` → `scp -r dist/* …:~/asistente/webapp/` → el usuario `sudo cp -r ~/asistente/webapp /var/www/juntu`.
- **Código sensible (seguridad):** validar migraciones sobre **copia** de `data.db` (`cp data.db /tmp/x.db`), nunca probar en la viva.
- VPS `emir@217.76.48.219`, DB `~/asistente/data.db`. Estamos en git `main`.

## Modelo de visibilidad (referencia para todas las tareas)
`visible(item, asker)` = `item.owner==asker` **OR** (`owner ∈ hogar(asker)` AND (`owner.share_all=1` OR `shared`)).
- Finanzas: `shared` del ítem = `account.shared` de su cuenta.
- Resto: `shared` = `item.shared`.
- Scopes: `mine`=propio; `ours`/None=propio + compartido del hogar; `user:X`=propio si X=asker, si no solo lo compartido de X.

## Estructura de archivos
| Archivo | Responsabilidad | Acción |
|---|---|---|
| `vps_current/visibility.py` | Helper central: fragmento SQL de visibilidad | **Crear** |
| `vps_current/tests/test_visibility.py` | Tests del helper (TDD) | **Crear** |
| `vps_current/main.py` | Schema/migración + enforcement bot + creación/comandos | Modificar |
| `vps_current/web.py` | Enforcement web + endpoints PATCH `shared`/`share_all` | Modificar |
| `vps_current/crud_v2.py` | `assert_ownership` + visibilidad de listas | Modificar |
| `web-react/src/...` | Switch share_all + toggles por cuenta/ítem | Modificar (Plan-fase 2) |

**Hito desplegable:** al terminar la Task 7, el modelo de privacidad está activo y funcionando (compartir vía bot). Las Tasks 8–9 agregan la UI web.

---

## Task 1: Schema + migración (columnas + reset una sola vez)

**Files:** Modify `vps_current/main.py` (bloque `init`: `_ALTERS`, y un bloque de migración nuevo).

- [ ] **Step 1: Agregar columnas en `_ALTERS`**

En `_ALTERS` agregar/ajustar:
```python
        "users": [..., ("cal_token", "TEXT"), ("share_all", "INTEGER DEFAULT 0")],
        "accounts": [..., ("shared", "INTEGER DEFAULT 0")],
        "eventos": [("kind", "TEXT"), ("shared", "INTEGER DEFAULT 0")],
        "recordatorios": [..., ("shared", "INTEGER DEFAULT 0")],
```
(`tareas.shared`, `notas.shared`, `lists.shared` ya existen como columnas; no se re-agregan. Solo cambia su **valor** en el reset, no el default declarado — el reset los pone en 0.)

- [ ] **Step 2: Crear tabla `app_meta` + reset único**

En `init`, dentro del `executescript` de CREATE TABLE, agregar:
```sql
        CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
```
Después del loop de `_ALTERS` (cuando ya existen todas las columnas), agregar el reset con sentinela:
```python
    # Privacidad: empezar de cero (todo privado) UNA sola vez. NO repetir en cada reinicio.
    if not conn.execute("SELECT 1 FROM app_meta WHERE key='privacy_reset_done'").fetchone():
        for _t in ("accounts", "eventos", "recordatorios", "tareas", "notas", "lists"):
            try:
                conn.execute(f"UPDATE {_t} SET shared=0")
            except Exception:
                log.exception("privacy reset %s", _t)
        conn.execute("UPDATE users SET share_all=0")
        conn.execute("INSERT INTO app_meta(key,value) VALUES('privacy_reset_done','1')")
        log.info("privacy reset aplicado (todo privado)")
```

- [ ] **Step 3: Validar compilación + migración sobre copia de la DB**

```bash
tr -d '\r' < vps_current/main.py | ssh emir@217.76.48.219 'cat > ~/asistente/main.py.new && ~/asistente/venv/bin/python -m py_compile ~/asistente/main.py.new && echo COMPILE_OK'
ssh emir@217.76.48.219 'cp ~/asistente/data.db /tmp/priv.db && ~/asistente/venv/bin/python - <<PY
import sqlite3
c=sqlite3.connect("/tmp/priv.db")
for t,col in [("users","share_all"),("accounts","shared"),("eventos","shared"),("recordatorios","shared")]:
    cols=[r[1] for r in c.execute(f"PRAGMA table_info({t})")]
    if col not in cols: c.execute(f"ALTER TABLE {t} ADD COLUMN {col} INTEGER DEFAULT 0")
c.execute("CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY, value TEXT)")
for t in ("accounts","eventos","recordatorios","tareas","notas","lists"): c.execute(f"UPDATE {t} SET shared=0")
c.execute("UPDATE users SET share_all=0"); c.commit()
print("share_all col:", "share_all" in [r[1] for r in c.execute("PRAGMA table_info(users)")])
print("accounts shared col:", "shared" in [r[1] for r in c.execute("PRAGMA table_info(accounts)")])
PY
rm -f /tmp/priv.db'
```
Expected: `COMPILE_OK`, ambas columnas `True`.

- [ ] **Step 4: Commit** (se despliega con el resto del backend en Task 7)
```bash
git add vps_current/main.py
git commit -m "feat(privacidad): columnas shared/share_all + reset único (app_meta)"
```

---

## Task 2: Helper de visibilidad `visibility.py` (TDD)

**Files:** Create `vps_current/visibility.py`, `vps_current/tests/test_visibility.py`.

- [ ] **Step 1: Escribir los tests**

Crear `vps_current/tests/test_visibility.py`:
```python
import os, sys, sqlite3
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import visibility


def _db():
    c = sqlite3.connect(":memory:"); c.row_factory = sqlite3.Row
    c.executescript("""
      CREATE TABLE users(id INTEGER PRIMARY KEY, household_id INTEGER, share_all INTEGER DEFAULT 0);
      CREATE TABLE accounts(id INTEGER PRIMARY KEY, user_id INTEGER, shared INTEGER DEFAULT 0);
      CREATE TABLE eventos(id INTEGER PRIMARY KEY, user_id INTEGER, shared INTEGER DEFAULT 0);
      CREATE TABLE transactions(id INTEGER PRIMARY KEY, user_id INTEGER, account_id INTEGER);
      INSERT INTO users(id,household_id,share_all) VALUES (1,1,0),(2,1,0),(3,3,0); -- 1&2 hogar 1; 3 otro hogar
      INSERT INTO accounts(id,user_id,shared) VALUES (10,1,0),(11,1,1),(12,2,0); -- 10 priv de 1, 11 compartida de 1, 12 priv de 2
      INSERT INTO transactions(id,user_id,account_id) VALUES (100,1,10),(101,1,11),(102,2,12);
      INSERT INTO eventos(id,user_id,shared) VALUES (200,1,0),(201,1,1),(202,2,0);
    """)
    return c


def _members(c, uid):
    return [r[0] for r in c.execute(
        "SELECT id FROM users WHERE COALESCE(household_id,id)=(SELECT COALESCE(household_id,id) FROM users WHERE id=?)", (uid,))]


def _ids(c, table, alias, frag, params):
    return sorted(r[0] for r in c.execute(f"SELECT {alias}.id FROM {table} {alias} WHERE {frag}", params))


def test_eventos_mine_sees_all_own():
    c = _db()
    frag, p = visibility.where(asker_id=1, scope_uid=1, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    assert _ids(c, "eventos", "e", frag, p) == [200, 201]  # ambos propios (priv + compartido)


def test_eventos_ours_hides_others_private():
    c = _db()
    frag, p = visibility.where(asker_id=1, scope_uid=None, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    # ve los propios (200,201); de user 2 ve solo lo compartido (202 es privado → NO)
    assert _ids(c, "eventos", "e", frag, p) == [200, 201]


def test_eventos_ours_shows_others_shared():
    c = _db()
    c.execute("UPDATE eventos SET shared=1 WHERE id=202")  # user 2 comparte 202
    frag, p = visibility.where(asker_id=1, scope_uid=None, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    assert _ids(c, "eventos", "e", frag, p) == [200, 201, 202]


def test_eventos_userX_only_shared_of_X():
    c = _db()
    c.execute("UPDATE eventos SET shared=1 WHERE id=202")
    frag, p = visibility.where(asker_id=1, scope_uid=2, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    assert _ids(c, "eventos", "e", frag, p) == [202]  # solo lo compartido de 2 (no su privado)


def test_share_all_exposes_everything_of_owner():
    c = _db()
    c.execute("UPDATE users SET share_all=1 WHERE id=2")  # user 2 comparte todo
    frag, p = visibility.where(asker_id=1, scope_uid=None, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    assert _ids(c, "eventos", "e", frag, p) == [200, 201, 202]  # ahora ve 202 aunque shared=0


def test_transactions_visibility_by_account():
    c = _db()
    frag, p = visibility.where(asker_id=1, scope_uid=None, members=_members(c,1), alias="t",
                               shared_expr="t.account_id IN (SELECT id FROM accounts WHERE shared=1)")
    # propios 100,101; de user 2: 102 está en cuenta 12 (priv) → NO
    assert _ids(c, "transactions", "t", frag, p) == [100, 101]


def test_cross_household_never():
    c = _db()
    c.execute("INSERT INTO eventos(id,user_id,shared) VALUES (300,3,1)")  # user 3, otro hogar, compartido
    frag, p = visibility.where(asker_id=1, scope_uid=None, members=_members(c,1), alias="e", shared_expr="e.shared=1")
    assert 300 not in _ids(c, "eventos", "e", frag, p)  # otro hogar nunca
```

- [ ] **Step 2: Correr y verificar que FALLA**
```bash
ssh emir@217.76.48.219 'mkdir -p ~/asistente/tests'
scp vps_current/tests/test_visibility.py emir@217.76.48.219:~/asistente/tests/test_visibility.py
ssh emir@217.76.48.219 'cd ~/asistente && venv/bin/python -m pytest tests/test_visibility.py -v'
```
Expected: FAIL (`No module named 'visibility'`).

- [ ] **Step 3: Implementar `vps_current/visibility.py`**
```python
"""Regla central de visibilidad (privacidad por hogar). Devuelve fragmento SQL + params.
Lo usan main.py (bot), web.py y crud_v2.py para no duplicar la regla.

Modelo: ves un ítem si es tuyo, o si su dueño (de tu hogar) tiene share_all=1, o si el
ítem está compartido (shared). En finanzas, `shared` del ítem = la cuenta (account.shared).
"""

def where(asker_id, scope_uid, members, alias="t", owner_col="user_id", shared_expr=None):
    """Devuelve (sql_fragment, params) para filtrar filas visibles segun el scope.
      scope_uid == asker_id -> 'mine' (todo lo propio)
      scope_uid is None      -> 'ours' (propio + compartido del hogar)
      scope_uid == X (!=asker)-> 'user:X' (solo lo compartido de X)
    `shared_expr`: SQL booleano que indica que la fila esta compartida (sin params). Para
    items: f"{alias}.shared=1". Para transacciones: subquery de cuentas compartidas.
    """
    o = f"{alias}.{owner_col}"
    sa = f"{o} IN (SELECT id FROM users WHERE share_all=1)"
    shared = f"({shared_expr} OR {sa})" if shared_expr else f"({sa})"
    if scope_uid is not None and scope_uid == asker_id:
        return f"{o} = ?", [asker_id]
    if scope_uid is not None:  # user:X, X != asker -> solo lo compartido de X
        return f"({o} = ? AND {shared})", [scope_uid]
    # ours: dentro del hogar, lo propio o lo compartido
    ph = ",".join("?" for _ in members) or "NULL"
    return f"({o} IN ({ph}) AND ({o} = ? OR {shared}))", [*members, asker_id]


# Expresiones `shared_expr` canonicas por entidad (para no escribirlas mal en cada call-site):
def shared_expr_item(alias):
    return f"{alias}.shared=1"

def shared_expr_tx(alias):
    return f"{alias}.account_id IN (SELECT id FROM accounts WHERE shared=1)"
```

- [ ] **Step 4: Copiar a VPS, correr, verificar que pasan**
```bash
scp vps_current/visibility.py emir@217.76.48.219:~/asistente/visibility.py
ssh emir@217.76.48.219 'cd ~/asistente && venv/bin/python -m pytest tests/test_visibility.py -v'
```
Expected: 7 passed.

- [ ] **Step 5: Commit**
```bash
git add vps_current/visibility.py vps_current/tests/test_visibility.py
git commit -m "feat(privacidad): helper central de visibilidad + tests"
```

---

## Task 3: Enforcement en el bot (`main.py`)

**Files:** Modify `vps_current/main.py` (`build_consulta_filter`, `_eventos_query`, y consultas que usan `household_member_ids` para scope).

- [ ] **Step 1: `build_consulta_filter` — aplicar visibilidad por cuenta**

Reemplazar el bloque de scope (al inicio de la función):
```python
    scope_uid, scope_label = resolve_scope(f.get("scope"), asker_id)
    if scope_uid is not None:
        where.append("t.user_id = ?"); params.append(scope_uid)
    else:  # "compartido" = SOLO mi hogar (no global)
        _m = household_member_ids(asker_id)
        where.append(f"t.user_id IN ({','.join('?' for _ in _m)})"); params.extend(_m)
```
por:
```python
    import visibility
    scope_uid, scope_label = resolve_scope(f.get("scope"), asker_id)
    _m = household_member_ids(asker_id)
    _vf, _vp = visibility.where(asker_id, scope_uid, _m, alias="t",
                                shared_expr=visibility.shared_expr_tx("t"))
    where.append(_vf); params.extend(_vp)
```
(Esto cubre `mine`, `ours` y `user:X` con la regla por cuenta. El resto de la función no cambia.)

- [ ] **Step 2: `_eventos_query` — aplicar visibilidad por ítem**

Localizar la rama de scope en `_eventos_query` (hoy: si scope None → `user_id IN (miembros)`; si uid → `user_id = uid`). **Read primero** `_eventos_query` para conocer el alias real de la tabla eventos (lo llamamos `A`) y su estructura de `where`/`params`. Reemplazar esa rama por:
```python
    import visibility
    _m = household_member_ids(asker_id)
    _vf, _vp = visibility.where(asker_id, scope_uid, _m, alias=A,
                                shared_expr=visibility.shared_expr_item(A))
    where.append(_vf); params.extend(_vp)
```
(donde `A` es el alias real, p. ej. `"e"`). Misma transformación: cambiar `user_id IN (members)` / `user_id = uid` por el fragmento del helper.

- [ ] **Step 3: `_distinct_keyword_candidates` / `_maybe_fuzzy_keyword`**

Estas funciones sugieren keywords a partir de transacciones del scope. Read ambas; donde filtran por `user_id IN (miembros)` (rama scope None) o por `user_id`, reemplazar por el fragmento de `visibility.where(...)` con `shared_expr_tx`. Si solo operan sobre el propio usuario, dejar como están (no exponen ajeno).

- [ ] **Step 4: Test de enforcement del bot (integración)**

Crear `vps_current/tests/test_bot_privacy.py` (corre en el VPS con la DB de test en memoria simulando build_consulta_filter no es trivial por imports de main; en su lugar testear el helper ya cubre la lógica). **Verificación manual** en Task 7 vía consulta real. (No agregar test frágil que importe todo main.)

- [ ] **Step 5: Validar compilación + commit**
```bash
tr -d '\r' < vps_current/main.py | ssh emir@217.76.48.219 'cat > ~/asistente/main.py.new && ~/asistente/venv/bin/python -m py_compile ~/asistente/main.py.new && echo OK'
git add vps_current/main.py && git commit -m "feat(privacidad): enforcement de visibilidad en consultas del bot"
```

---

## Task 4: Enforcement en la web (`web.py`)

**Files:** Modify `vps_current/web.py` (`user_filter`/`user_filter_eq`, `api_accounts`, `overview2`, listas de notas/tareas/eventos/recordatorios) + endpoints PATCH para `shared`/`share_all`.

- [ ] **Step 1: `user_filter` / `user_filter_eq` con visibilidad**

Hoy devuelven `AND alias.user_id = ?` (uid) o `AND alias.user_id IN (miembros)` (None). Reemplazar el cuerpo para usar el helper. Para entidades por-ítem (alias con columna `shared`):
```python
import visibility
def user_filter(scope_cookie, user, alias="t", shared_expr=None):
    uid = resolve_scope_uid(scope_cookie, user)
    m = _household_member_ids(user["id"])
    se = shared_expr if shared_expr is not None else f"{alias}.shared=1"
    frag, params = visibility.where(user["id"], uid, m, alias=alias, shared_expr=se)
    return "AND " + frag, params
```
> OJO: `user_filter` se usa para varias entidades. Para **transacciones** pasar `shared_expr=visibility.shared_expr_tx(alias)`; para ítems con `shared` dejar el default. Revisar cada call-site de `user_filter`/`user_filter_eq` y pasar el `shared_expr` correcto. Read los call-sites antes de editar.

- [ ] **Step 2: `api_accounts` — solo cuentas visibles**

Hoy lista cuentas del scope (`user_id=?` o `user_id IN (miembros)`). Reemplazar la condición por `visibility.where(user["id"], scope_uid, members, alias="<alias accounts>", shared_expr="<alias>.shared=1")` (una cuenta ajena se ve solo si shared o el dueño tiene share_all). Read `api_accounts` para el alias real.

- [ ] **Step 3: `overview2` — gastos/categorías/cashflow/hoy + eventos/recordatorios**

Cada subconsulta que hoy filtra por `uf_t`/`uf_p` (transacciones) o `uf_x`/`uf_xp` (otras entidades) ya usa el filtro central. Si esos filtros vienen de `user_filter`, al arreglar `user_filter` (Step 1) se propaga. **Verificar** que las consultas de transacciones pasen `shared_expr_tx` y las de eventos/recordatorios el de ítem. Read `overview2` y ajustar los `user_filter(...)` con el `shared_expr` correcto por consulta.

- [ ] **Step 4: Endpoints PATCH de visibilidad**

Agregar/asegurar que se pueda setear:
- `PATCH /api/cuentas/{id}` acepta `shared` (0/1) — solo el dueño.
- `PATCH /api/{eventos,tareas,notas,recordatorios}/{id}` acepta `shared` — solo el dueño.
- `POST /api/settings/share_all` (o extender `/api/me` PATCH) con `{value: 0|1}` → `UPDATE users SET share_all=? WHERE id=?`.
Cada uno valida que el usuario sea **dueño** del ítem (no del hogar) antes de cambiar `shared`. Read los endpoints PATCH existentes para seguir el patrón.

- [ ] **Step 5: Validar compilación + commit**
```bash
tr -d '\r' < vps_current/web.py | ssh emir@217.76.48.219 'cat > ~/asistente/web.py.new && ~/asistente/venv/bin/python -m py_compile ~/asistente/web.py.new && echo OK'
git add vps_current/web.py && git commit -m "feat(privacidad): enforcement de visibilidad en la web + PATCH shared/share_all"
```

---

## Task 5: `crud_v2.py` (ownership + listas)

**Files:** Modify `vps_current/crud_v2.py`.

- [ ] **Step 1: `assert_ownership` con visibilidad**

Hoy permite `allow_shared` si la fila tiene `shared` y el dueño es del hogar. Mantener para **edición** (quién puede tocar), pero asegurar que la **lectura** de listas/ítems compartidos respete el helper. Read `assert_ownership` y las queries de `get_listas`/items; donde listan ítems del hogar, aplicar `visibility.where(...)` con `shared_expr_item` (alias de la tabla). Una lista ajena se ve solo si `shared=1` o dueño con `share_all`.

- [ ] **Step 2: Validar + commit**
```bash
tr -d '\r' < vps_current/crud_v2.py | ssh emir@217.76.48.219 'cat > ~/asistente/crud_v2.py.new && ~/asistente/venv/bin/python -m py_compile ~/asistente/crud_v2.py.new && echo OK'
git add vps_current/crud_v2.py && git commit -m "feat(privacidad): visibilidad en listas (crud_v2)"
```

---

## Task 6: Creación privada por default + comandos del bot (`main.py`)

**Files:** Modify `vps_current/main.py`.

- [ ] **Step 1: Crear privado por default + keyword "compartido"**

En los handlers de creación (gasto/cuenta/evento/tarea/nota/recordatorio), NO setear shared salvo que el parser indique compartir. El parser ya extrae `scope`; si el texto trae "compartido/con mi pareja/los dos/juntos", setear `shared=1` en la entidad creada (o `accounts.shared=1` si es cuenta). Read cada `save_*` para agregar el flag. Default: privado.

- [ ] **Step 2: Comandos `/compartir`, `/privado`, `/compartirtodo`, `/privadotodo`**

- `/compartir [N]` y `/privado [N]`: togglean `shared` del último ítem creado (o #N). Generalizar el `/compartir` actual (hoy tareas) para que funcione por tipo de ítem reciente. Read el `/compartir` actual.
- `/compartirtodo` y `/privadotodo`: `UPDATE users SET share_all=1|0 WHERE id=?` + confirmación.
- Registrar los handlers en `main()` (`app.add_handler(CommandHandler(...))`) y sumarlos a `set_my_commands`.

- [ ] **Step 3: Validar + commit**
```bash
tr -d '\r' < vps_current/main.py | ssh emir@217.76.48.219 'cat > ~/asistente/main.py.new && ~/asistente/venv/bin/python -m py_compile ~/asistente/main.py.new && echo OK'
git add vps_current/main.py && git commit -m "feat(privacidad): creacion privada por default + comandos compartir/privado"
```

---

## Task 7: Deploy backend + verificación de enforcement (HITO desplegable)

**Files:** ninguno (deploy + verificación).

- [ ] **Step 1: Diff + swap (main.py, web.py, crud_v2.py, visibility.py) en el VPS**
```bash
scp vps_current/visibility.py emir@217.76.48.219:~/asistente/visibility.py
ssh emir@217.76.48.219 'cd ~/asistente && for f in main web crud_v2; do diff --strip-trailing-cr $f.py $f.py.new && echo "$f sin cambios" || true; done'
ssh emir@217.76.48.219 'cd ~/asistente && ts=$(date +%Y%m%d-%H%M%S) && for f in main web crud_v2; do cp $f.py $f.py.bak-$ts; mv $f.py.new $f.py; done && venv/bin/python -m py_compile main.py web.py crud_v2.py visibility.py && echo swapped'
```

- [ ] **Step 2: El usuario reinicia**
```bash
ssh -t emir@217.76.48.219 'sudo systemctl restart asistente asistente-web && systemctl is-active asistente asistente-web'
```
Expected: `active` ×2. El restart corre el reset de privacidad (una vez) y crea las columnas.

- [ ] **Step 3: Verificación de enforcement en vivo (con DB)**

Confirmar el reset y la regla, sin exponer datos:
```bash
ssh emir@217.76.48.219 'cd ~/asistente && sqlite3 data.db "SELECT value FROM app_meta WHERE key=\"privacy_reset_done\";" && sqlite3 data.db "SELECT (SELECT COUNT(*) FROM accounts WHERE shared=1) AS acc_shared, (SELECT COUNT(*) FROM eventos WHERE shared=1) AS ev_shared, (SELECT COUNT(*) FROM users WHERE share_all=1) AS sa;"'
```
Expected: `1` (reset done) y todos los contadores en `0` (todo privado tras el reset).

- [ ] **Step 4: Verificar que el bot NO ve lo privado ajeno (Emir↔Lisa)**
```bash
ssh emir@217.76.48.219 'cd ~/asistente && venv/bin/python -c "
import main
# Emir (1) pregunta por gastos de Lisa (2) — todo privado ahora -> no debe traer nada de 2
wc, params, *_ = main.build_consulta_filter({\"scope\":\"user:Lisa\"}, 1)
print(\"WHERE:\", wc)
"'
```
Expected: el WHERE incluye la condición de `shared`/`share_all` para user 2 (no un simple `user_id=2`).

- [ ] **Step 5: Commit del hito (CHANGELOG)**
```markdown
### Added
- **Privacidad por hogar.** Todo privado por default; se comparte por cuenta (finanzas) o por ítem (eventos/tareas/notas/recordatorios/listas), o todo con `share_all`. El bot y la web nunca devuelven data privada ajena (regla central en `visibility.py`). Reset inicial a privado (una vez).
```
```bash
git add CHANGELOG.md && git commit -m "docs(changelog): privacidad por hogar (backend)"
```

---

## Task 8: Frontend — toggles de compartir (web-react)

**Files:** Modify `web-react/src/...` (ajustes con switch `share_all`; toggle por cuenta; toggle por ítem en sus modales/acciones; hooks/tipos).

- [ ] **Step 1: Tipos + hooks**

En `lib/types.ts` agregar `shared?: boolean` a Account/Evento/Tarea/Nota/Recordatorio y `share_all?: boolean` a Me. En los hooks de mutación, soportar `shared` en el PATCH de cada entidad y un `setShareAll` (POST `/api/settings/share_all`). Read los hooks existentes para seguir el patrón.

- [ ] **Step 2: Switch "Compartir todo con mi pareja"**

En una pantalla de Ajustes (o en el menú), un toggle que llama `setShareAll`. Si no existe pantalla de ajustes, agregar una tarjeta en el menú/perfil. Mostrar estado actual desde `me.share_all`.

- [ ] **Step 3: Toggle por cuenta y por ítem**

En la pantalla de Cuentas: un control privado/compartido por cuenta (PATCH `shared`). En los modales de evento/tarea/nota/recordatorio: un checkbox "Compartir con mi pareja" (PATCH `shared`). Seguir el estilo de los componentes existentes (Card/Modal/Select).

- [ ] **Step 4: Build (valida TS)**
```bash
cd web-react && npm run build
```
Expected: build OK.

- [ ] **Step 5: Commit**
```bash
git add web-react/src && git commit -m "feat(privacidad): UI de compartir (share_all + por cuenta/item)"
```

---

## Task 9: Deploy frontend + verificación e2e

- [ ] **Step 1: Subir frontend**
```bash
ssh emir@217.76.48.219 'rm -rf ~/asistente/webapp && mkdir -p ~/asistente/webapp'
scp -r web-react/dist/* emir@217.76.48.219:~/asistente/webapp/
```
- [ ] **Step 2: El usuario publica**
```bash
ssh -t emir@217.76.48.219 'sudo rm -rf /var/www/juntu && sudo cp -r ~/asistente/webapp /var/www/juntu && sudo chmod -R a+rX /var/www/juntu'
```
- [ ] **Step 3: Verificación e2e**
1. Con dos usuarios del mismo hogar (Emir/Lisa): A no ve nada de B (todo privado).
2. B marca una cuenta o un evento como compartido → A lo ve; B lo vuelve a privado → A deja de verlo.
3. B activa "compartir todo" → A ve todo lo de B; lo apaga → vuelve a no ver.
4. En el bot: A pregunta "cuánto gastó B" → no devuelve lo privado de B.

- [ ] **Step 4: Commit final (CHANGELOG UI)**
```bash
git add CHANGELOG.md && git commit -m "docs(changelog): UI de privacidad/compartir"
```

---

## Notas
- **Seguridad:** el corazón es `visibility.py` + sus tests; cualquier consulta que agregue datos de otros DEBE pasar por el helper. Si aparece una consulta nueva que cruza usuarios, aplicar el helper.
- **Edición vs lectura:** este plan es de **visibilidad (lectura)**. Quién puede editar lo compartido se mantiene como hoy (`assert_ownership`).
- **Hogares de 3+:** "compartido" = visible para todo el hogar (no por-persona). Fuera de alcance el compartir selectivo por-persona.
