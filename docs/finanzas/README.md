# Módulo de Finanzas (Yumi) — Documentación completa

> Documento generado por análisis exhaustivo del código real (frontend `web-react/` + backend `vps_current/`).
> Todos los textos de interfaz están transcritos **verbatim** del código.
> Objetivo: que cualquier dev / diseñador / PM entienda el módulo completo **sin leer el código**.

## Índice

1. **Este archivo** — vista general, sitemap, mapa de navegación, ERD, mapa conceptual.
2. [`pantallas.md`](./pantallas.md) — ficha exhaustiva de cada pantalla y modal (objetivo, navegación, datos, acciones, botones, campos, validaciones, textos exactos).
3. [`flujos-y-estados.md`](./flujos-y-estados.md) — casos de uso (sequence/activity) y diagramas de estado.
4. [`reglas-de-negocio.md`](./reglas-de-negocio.md) — cálculos (saldos, deuda, cuotas, ciclo/vencimiento, patrimonio), scope/visibilidad, validaciones.
5. [`analisis-critico.md`](./analisis-critico.md) — bugs, inconsistencias, UX, duplicación, nomenclatura, simplificaciones y features faltantes.

---

## 1. Vista general

El módulo de Finanzas es la "cuña" del asistente: registra **plata** (gastos, ingresos, cuentas, tarjetas, cuotas, recurrentes) y la muestra en un dashboard. Es **multi-inquilino por hogar** (cada usuario ve lo suyo + lo compartido de su hogar) y **multi-moneda** (ARS / USD / EUR), valuando a ARS con el dólar **blue** cuando hace falta.

**Pilar técnico clave:** **no hay saldos guardados**. Todo balance se calcula al vuelo desde `transactions` con `SUM(CASE WHEN type='ingreso' THEN amount ELSE -amount END)` por cuenta y moneda. Borrar o editar una transacción cambia los saldos al instante.

**Las 7 pantallas (rutas bajo `AppLayout`):**

| Ruta | Componente | Nombre visible | Rol |
|------|-----------|----------------|-----|
| `/finanzas` | `Inicio` | "Finanzas" (bottom nav) / "Resumen" (sidebar) | Dashboard del mes |
| `/movimientos` | `Movimientos` | "Movimientos" | Lista de transacciones + filtros + bulk |
| `/tarjetas` | `Tarjetas` | "Tarjetas" | Lista de tarjetas de crédito |
| `/tarjetas/:id` | `TarjetaDetalle` | (sin entrada de menú) | Detalle de tarjeta + cuotas |
| `/cuentas` | `Cuentas` | "Cuentas" | Cuentas + saldos + compartir |
| `/categorias` | `Categorias` | "Categorías" | ABM de categorías |
| `/recurrentes` | `Recurrentes` | "Recurrentes" | Recurrentes y cuotas |

**4 modales/forms compartidos:** `QuickAddSheet` (alta rápida "+"), `EditTxModal` (editar movimiento), `AccountForm` (alta/edición de cuenta o tarjeta), `AdjustBalanceModal` (ajustar saldo).

**El modelo de plata, en una frase (de `cards.ts`, textual en la UI):**
> *"A pagar este mes = compras del ciclo + una cuota de cada plan. Deuda total = todo lo que queda por pagar."*

---

## 2. Sitemap + Mapa de navegación

Qué superficie de navegación lleva a cada ruta. Ojo: `/finanzas` se llama **"Finanzas"** en el bottom nav (mobile) y **"Resumen"** en el sidebar (desktop); y `/tarjetas/:id` **no tiene entrada de menú** (se llega tocando una tarjeta).

```mermaid
flowchart TD
    subgraph SURF["Superficies de navegación"]
        BN["BottomNav (mobile)"]
        SB["Sidebar (desktop)"]
        MD["MenuDrawer (mobile ☰)"]
        TB["TopBar (mobile): logo · ScopeToggle · 🔍 · ☰"]
        ADD["Botón + Agregar / FAB +"]
    end

    BN -->|"Finanzas"| FIN["/finanzas · Inicio (Resumen)"]
    SB -->|"Resumen"| FIN
    SB -->|"Movimientos"| MOV["/movimientos"]
    SB -->|"Tarjetas"| TAR["/tarjetas"]
    SB -->|"Cuentas"| CTA["/cuentas"]
    SB -->|"Categorías"| CAT["/categorias"]
    SB -->|"Recurrentes"| REC["/recurrentes"]
    MD -->|"Movimientos"| MOV
    MD -->|"Tarjetas"| TAR
    MD -->|"Cuentas"| CTA
    MD -->|"Categorías"| CAT
    MD -->|"Recurrentes"| REC
    TB -->|"🔍 Buscar"| BUS["/buscar"]
    ADD -->|abre| QA["QuickAddSheet (modal)"]

    FIN -->|click en fila de tarjeta| DET["/tarjetas/:id · TarjetaDetalle"]
    TAR -->|click en tarjeta| DET
    DET -->|"← Tarjetas"| TAR
    DET -->|borrar tarjeta| TAR

    QA -.->|"Gasto/Ingreso"| MOV
    classDef fin fill:#eaffea,stroke:#2bee4b;
    class FIN,MOV,TAR,DET,CTA,CAT,REC fin;
```

**Detalle de menús (labels exactos):**

- **BottomNav** (mobile): `Hoy` · `Finanzas` · **[ + ]** (aria `Agregar`) · `Agenda` · `Tareas`. *(Única entrada de finanzas en mobile bottom: `Finanzas`.)*
- **Sidebar** (desktop), grupo **`Finanzas`**: `Resumen` · `Movimientos` · `Tarjetas` · `Cuentas` · `Categorías` · `Recurrentes`. Arriba botón `+ Agregar`.
- **MenuDrawer** (mobile ☰), sección **`Finanzas`**: `Movimientos` · `Tarjetas` · `Cuentas` · `Categorías` · `Recurrentes`. *(No incluye "Resumen"/`/finanzas`.)* Al fondo: `Dashboard viejo →` (`/legacy/`).
- **TopBar**: marca `Yumi` + `ScopeToggle` + `🔍` (aria `Buscar` → `/buscar`) + `☰` (aria `Menú`).

**ScopeToggle** (selector "Ver datos de", presente en TopBar): opciones `Mío` (`mine`) · *nombre de cada conviviente* (`scope_value`) · `Ambos` (`both`). Cambia el cookie `scope` vía `POST /api/set_scope` e **invalida TODAS las queries** (refetch global). Define de quién se ven los datos en todo el módulo.

---

## 3. ERD — Entidades del módulo

Modelo inferido de los `CREATE TABLE`/`ALTER` del backend. **No existe columna `balance`**: el saldo es derivado.

```mermaid
erDiagram
    USERS ||--o{ ACCOUNTS : "owns (user_id)"
    USERS ||--o{ TRANSACTIONS : "owns (user_id)"
    USERS ||--o{ RECURRING : "owns (user_id)"
    USERS ||--o{ BUDGETS : "owns (user_id)"
    USERS ||--o{ NET_WORTH_SNAPSHOTS : "user_id"
    USERS }o--o{ USERS : "household_id (mismo hogar)"
    ACCOUNTS ||--o{ TRANSACTIONS : "account_id (NOT NULL)"
    ACCOUNTS ||--o{ RECURRING : "account_id (NOT NULL)"
    CATEGORIES ||--o{ TRANSACTIONS : "category_id (nullable)"
    CATEGORIES ||--o{ RECURRING : "category_id (nullable)"
    CATEGORIES ||--o{ BUDGETS : "category_id"
    RECURRING ||--o{ TRANSACTIONS : "recurring_id (al disparar cuota)"
    USERS ||--o{ SHARED_EXPENSES : "payer/other"
    TRANSACTIONS ||--o| SHARED_EXPENSES : "transaction_id"

    USERS {
        int id PK
        string name
        int household_id "COALESCE(household_id,id)=hogar"
        int share_all "0/1 compartir todo"
        string plan
    }
    ACCOUNTS {
        int id PK
        string name "único por user"
        string type "efectivo|billetera|debito|credito|banco|dolares|cripto|inversion"
        int closing_day "tarjeta: día de cierre"
        int due_day "tarjeta: día de vencimiento"
        int shared "0/1"
        int active "0=archivada"
        int user_id FK
    }
    TRANSACTIONS {
        int id PK
        string type "gasto|ingreso"
        real amount
        string currency "ARS|USD|EUR"
        int account_id FK "NOT NULL"
        int category_id FK "nullable"
        int recurring_id FK "set si la generó una recurrente"
        string occurred_at "ISO"
        string description
        int user_id FK
    }
    CATEGORIES {
        int id PK
        string name
        string type "gasto"
        int household_id "NULL=default compartida"
        int active
    }
    RECURRING {
        int id PK
        string description
        real amount
        string currency
        int account_id FK "NOT NULL"
        int day_of_month
        string next_occurrence
        int active "0=pausada"
        int total_installments "NULL=fijo mensual"
        int installments_fired "default 0"
        int user_id FK
    }
    BUDGETS {
        int id PK
        int category_id FK
        real amount
        int user_id FK
    }
    SHARED_EXPENSES {
        int id PK
        int payer_user_id FK
        int other_user_id FK
        real amount
        real other_share
        string settled_at "NULL=impago"
    }
    NET_WORTH_SNAPSHOTS {
        int id PK
        int user_id FK
        string taken_at
        real total_ars
        real total_usd
    }
```

**Relaciones / responsabilidades clave:**
- `TRANSACTIONS` es el libro mayor: de ahí salen TODOS los saldos, KPIs y ciclos. Toda transacción tiene `account_id` obligatorio.
- `RECURRING` modela tanto **fijos mensuales** (`total_installments = NULL`) como **planes de cuotas** (`total_installments` seteado). Al "dispararse" crea una `TRANSACTIONS` con `recurring_id`.
- `CATEGORIES` con `household_id = NULL` son **defaults compartidas** (visibles para todos, no editables salvo admin).
- La dimensión **hogar** (`users.household_id`) + **compartir** (`accounts.shared`, `users.share_all`) gobierna quién ve qué (ver [`reglas-de-negocio.md`](./reglas-de-negocio.md)).

---

## 4. Mapa conceptual / arquitectura funcional

Cómo fluye la información front ↔ back.

```mermaid
flowchart LR
    subgraph FE["Frontend (React + TanStack Query)"]
        SCREENS["7 pantallas + 4 modales"]
        HOOKS["hooks: useTransactions, useAccounts,\nuseAccountsWithBalances, useOverview,\nuseRecurring, useVencimientos, useCategories, useMe"]
        CARDS["lib/cards.ts (modelo de plata)\nlib/format.ts (formatMoney)\nlib/api.ts (fetch + cookie)"]
        SCREENS --> HOOKS --> CARDS
        SCREENS --> CARDS
    end
    subgraph API["Backend (FastAPI)"]
        EP["/api/transactions /accounts /recurring\n/categories /vencimientos /overview /overview2\n/networth /trends /budgets /share /set_scope /export.csv"]
        LOGIC["crud_v2.py · vencimientos.py · networth.py\ntrends.py · finance.py · fx.py · splits.py"]
        VIS["visibility.py (regla de privacidad)\nresolve_scope_uid / household_member_ids"]
        EP --> LOGIC
        EP --> VIS
    end
    DB[("SQLite\naccounts · transactions · recurring\ncategories · budgets · shared_expenses\nnet_worth_snapshots · users")]
    FXSRC["dolarapi (blue/oficial/mep/cripto)\nrefresco en background cada 600s"]

    HOOKS -- "fetch (cookie session, credentials:include)" --> EP
    LOGIC --> DB
    VIS --> DB
    FXSRC -. "cache" .-> LOGIC

    BOT["Bot Telegram/WhatsApp (main.py)\nparser IA → mismas tablas\nrecurring_daily (dispara cuotas 9am)"]
    BOT --> DB
```

**Responsabilidades:**
- **`cards.ts`** = única fuente de verdad de la matemática de tarjetas en el front (consumos, deuda, cuota actual, "a pagar"). El backend **no** envía deuda total ni "a pagar este mes" calculados: el front los compone de `/api/overview` (saldos) + `/api/vencimientos` (ciclos) + `/api/recurring` (cuotas).
- **`/api/overview`** = saldos por cuenta. **`/api/overview2`** = KPIs del dashboard (patrimonio, cashflow, por categoría). Son endpoints distintos y la pantalla Inicio usa **ambos**.
- **`vencimientos.py`** = toda la matemática de ciclo cerrado/abierto y fecha de vencimiento de tarjetas.
- **`visibility.py`** = primitiva central de privacidad (ver lo tuyo + lo compartido del hogar).
- El **bot** comparte la misma DB: los gastos/cuotas también entran por chat.

---

Seguí en [`pantallas.md`](./pantallas.md) para el detalle pantalla por pantalla.
