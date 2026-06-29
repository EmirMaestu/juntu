# Finanzas — Casos de uso y diagramas de estado

Cada flujo muestra el recorrido completo (usuario → UI → hook → API → DB) y qué se invalida. Recordá: **toda mutación de finanzas dispara un refetch** de las queries afectadas (no hay updates optimistas; no hay toasts — los errores se propagan como `ApiError` con el body del server).

## Índice de flujos
[Crear gasto/ingreso](#1-crear-gasto-o-ingreso-quickadd) · [Editar](#2-editar-un-movimiento) · [Borrar](#3-borrar-movimiento-individual-y-en-lote) · [Mover en lote](#4-mover-movimientos-en-lote) · [Ajustar saldo](#5-ajustar-saldo) · [Alta de cuenta](#6-crear--editar-cuenta) · [Alta de tarjeta](#7-alta--edición-de-tarjeta) · [Cuota](#8-alta-de-cuota-plan-de-cuotas) · [Recurrente](#9-crear-recurrente-fijo-mensual) · [Pausar](#10-pausarreactivar-recurrentecuota) · [Compartir](#11-compartir-una-cuenta) · [Buscar/filtrar](#12-buscar--filtrar-movimientos) · [Exportar](#13-exportar-csv) · [Transferencia](#14-transferencia-no-hay-endpoint)

---

## 1. Crear gasto o ingreso (QuickAdd)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant QA as QuickAddSheet (GastoForm)
    participant H as useTxMutations.create
    participant API as POST /api/transactions
    participant DB as SQLite

    U->>QA: toca "+ Agregar" → pill "Gasto"
    U->>QA: completa Tipo, Monto, Descripción, Cuenta, (Categoría)
    U->>QA: "Guardar →"
    QA->>QA: zod valida (Monto>0, Descripción≥1, Cuenta int)
    alt inválido
        QA-->>U: "Monto inválido" / "Falta descripción"
    else válido
        QA->>H: create.mutate({type,amount,description,account_id,category_id,occurred_at})
        H->>API: POST con cookie (credentials:include)
        API->>API: valida required + cuenta existe + es del user
        alt error
            API-->>H: 400 "Falta {k}" / 400 "Cuenta inexistente" / 403 "Esa cuenta no es tuya"
            H-->>U: ApiError (sin toast)
        else ok
            API->>DB: INSERT transactions (user_id)
            API-->>H: {id, ok:true}
            H->>H: invalida ['transactions'],['overview2'],['accounts-balances']
            QA-->>U: onClose() → cierra; saldos/KPIs se recalculan
        end
    end
```

> El **ingreso** no es un flujo aparte: en el mismo GastoForm se cambia el Select Tipo a `Ingreso`. El saldo de la cuenta sube (`+amount`) en vez de bajar.

---

## 2. Editar un movimiento

```mermaid
sequenceDiagram
    actor U as Usuario
    participant M as Movimientos
    participant E as EditTxModal
    participant H as useTxMutations.update
    participant API as PATCH /api/transactions/{id}

    U->>M: icono ✏️ en una fila
    M->>E: abre con tx (prefill)
    U->>E: cambia campos → "Guardar cambios →"
    E->>H: update.mutate({id, ...v})
    H->>API: PATCH
    alt error
        API-->>U: 404 "No existe" / 403 "No es tuya" / 403 "Cuenta destino no es tuya" / 400 "Sin cambios"
    else ok
        API-->>H: {ok:true} → invalida transactions/overview2/accounts-balances
        E-->>U: onSuccess → cierra
    end
```

---

## 3. Borrar movimiento (individual y en lote)

```mermaid
flowchart TD
    A["Movimientos"] --> B{"¿modo selección?"}
    B -- no --> C["icono 🗑️ en fila"]
    C --> D["ConfirmDialog: '¿Borrar este gasto?'<br/>'Se eliminará \"...\".'"]
    D -->|Cancelar| A
    D -->|Borrar| E["remove.mutate(id)<br/>DELETE /api/transactions/{id}"]
    B -- sí --> F["check filas → toolbar"]
    F --> G["'Borrar'"]
    G --> H["ConfirmDialog: '¿Borrar N gasto(s)?'<br/>'Esta acción no se puede deshacer.'"]
    H -->|Borrar| I["bulkDelete.mutate(ids)<br/>POST /api/transactions/bulk_delete"]
    E --> J["invalida transactions/overview2/accounts-balances"]
    I --> J
    I -. "403 'Alguna no es tuya' si alguna no es del user" .-> A
```

---

## 4. Mover movimientos en lote

```mermaid
sequenceDiagram
    actor U as Usuario
    participant M as Movimientos
    participant API as POST /api/transactions/bulk_move
    U->>M: "Seleccionar" → check filas
    U->>M: toolbar "Mover" → Modal "Mover a cuenta"
    U->>M: Select "Seleccionar cuenta…" (cuenta destino)
    U->>M: "Mover N movimiento(s) →"
    alt sin cuenta elegida
        M-->>U: no-op (CTA hace return)
    else
        M->>API: bulkMove.mutate({ids, account_id})
        alt error
            API-->>U: 403 "Cuenta destino no es tuya" / 403 "Alguna no es tuya" / 400 "Sin cambios"
        else ok
            API-->>M: {ok, count} → limpia selección, cierra, invalida
        end
    end
```

---

## 5. Ajustar saldo

El "ajuste" no es una operación especial: crea una transacción compensatoria.

```mermaid
flowchart TD
    A["Cuentas → 'Ajustar saldo'"] --> B["AdjustBalanceModal"]
    B --> C["Elegí Moneda (si >1) + 'Nuevo saldo'"]
    C --> D["'Guardar'"]
    D --> E{"parseFloat(newBalance)"}
    E -- NaN --> F["return silencioso (no pasa nada)"]
    E -- número --> G{"diff = nuevo - actual"}
    G -- "diff = 0" --> H["cierra sin crear nada"]
    G -- "diff ≠ 0" --> I["create.mutate(tx)<br/>type = diff>0 ? ingreso : gasto<br/>amount = |diff| · desc 'Ajuste de saldo'"]
    I --> J["POST /api/transactions → invalida → saldo = nuevo"]
```

---

## 6. Crear / editar cuenta

```mermaid
sequenceDiagram
    actor U as Usuario
    participant CF as AccountForm
    participant API as POST/PATCH /api/accounts
    U->>CF: Cuentas "+ Nueva cuenta" (o editar)
    U->>CF: Nombre + Tipo (+ si crédito: cierre/vencimiento)
    U->>CF: "Guardar"
    CF->>CF: zod (name≥1 → "Requerido")
    CF->>API: create({name,type[,closing_day,due_day]}) o update({id,...})
    alt error
        API-->>U: 400 "Nombre requerido" / 400 "Ya tenés una cuenta con ese nombre" / 403 "No es tu cuenta"
    else ok
        API-->>CF: {id,ok} → invalida accounts/accounts-balances/overview2/vencimientos
    end
    Note over CF,U: ⚠️ AccountForm llama onClose() SIEMPRE (aun si falla la mutación)
```

---

## 7. Alta / edición de tarjeta

Una tarjeta **es una cuenta** con `type='credito'` + `closing_day` + `due_day`. Mismo `AccountForm` (con `defaultType="credito"`). Sin cierre/vencimiento, la tarjeta aparece pero `/api/vencimientos` devuelve `error: "Falta closing_day/due_day…"` y la UI muestra `"cargá cierre y vencimiento"`.

---

## 8. Alta de cuota (plan de cuotas)

Se crea desde **TarjetaDetalle → "+ Agregar cuota"** (CuotaModal) o desde **Recurrentes** poniendo `total_installments`. Una cuota es un `recurring` con `total_installments` seteado.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant CM as CuotaModal (TarjetaDetalle)
    participant API as POST /api/recurring
    participant J as Job recurring_daily (bot, 9am)
    U->>CM: "+ Agregar cuota" → Descripción, Monto por cuota, Total de cuotas, Cuotas ya pagadas
    CM->>API: create({description, amount, account_id, day_of_month:1, total_installments, installments_fired, currency:'ARS'})
    API->>API: cuenta es del user; next_occurrence = _next_occurrence(day)
    API-->>CM: {id,ok} → invalida recurring/vencimientos/overview2
    Note over J: Cada día, si next_occurrence ≤ hoy y active=1
    J->>J: INSERT transaction (recurring_id, "(cuota fired+1/total)")
    J->>J: fired++ ; si fired ≥ total → active=0 (finaliza)
```

---

## 9. Crear recurrente (fijo mensual)

Igual que la cuota pero `total_installments = NULL` (vacío). En el modal: dejar vacío "Total de cuotas" (`"Dejar vacío si es fijo mensual"`). El job lo vuelve a programar cada mes indefinidamente.

---

## 10. Pausar/reactivar recurrente/cuota

```mermaid
stateDiagram-v2
    [*] --> Activa
    Activa --> Pausada: "Pausar" (update active=0)
    Pausada --> Activa: "Reactivar" (update active=1)
    Activa --> Finalizada: fired ≥ total (job)
    note right of Pausada
      Sigue contando como DEUDA (enCuotas)
      pero NO en "a pagar este mes"
      (recurrenteMensual excluye active=0)
    end note
    Finalizada --> [*]
```

---

## 11. Compartir una cuenta

```mermaid
sequenceDiagram
    actor U as Usuario
    participant C as Cuentas
    participant API as POST /api/share
    U->>C: toca pill "🔒 Privada" / "👥 Compartida"
    C->>API: toggleShared({entity:'accounts', id, shared: a.shared?0:1})
    API->>API: solo el dueño puede; 403 "No es tuyo" si no
    API-->>C: {ok, shared} → invalida TODAS las queries
    Note over C: Compartir una cuenta = compartir sus transacciones con el hogar
```

---

## 12. Buscar / filtrar movimientos

Los filtros son **en vivo** (cambian la query key → refetch). `buildQuery` traduce `period`:
- `mes` → year+month actual · `mes pasado` → mes anterior · `año` → solo year · `todo` → sin fechas.
- + `account_id`, `category_id` (`-1` = sin categoría), `currency`, `q` (LIKE en descripción).

```mermaid
flowchart LR
    F["Filtros: Período, Cuenta, Categoría, Buscar…"] --> Q["useTransactions(filters)<br/>key ['transactions', filters]"]
    Q --> API["GET /api/transactions?year&month&account_id&category_id&q&currency&limit&offset"]
    API --> R["{items, total, sums}"]
    R --> L["render filas (visibilidad por scope/hogar aplicada en el server)"]
```

> La **búsqueda global** (TopBar 🔍 → `/buscar`) es client-side sobre varias entidades; no hay `/api/buscar`.

---

## 13. Exportar CSV

`GET /api/export.csv?year&month` → stream con header `id,fecha,tipo,monto,moneda,cuenta,categoria,descripcion,persona`, nombre `transacciones_{year}_{mm}.csv`. (No hay botón documentado en las 7 pantallas React analizadas — el endpoint existe; el disparo está en el dashboard legacy.)

---

## 14. Transferencia (no hay endpoint)

**No existe** `/api/transfer`. Una transferencia se representa como transacción(es) en una categoría llamada literalmente `"Transferencia"`, que queda **excluida** de `overview2`, `trends` y totales (match por string). El parseo de "transferí X de A a B" vive en el **bot** (`main.py: handle_transferencia_intent`), no en la web.

---

# Diagramas de estado

## Ciclo de una tarjeta de crédito

```mermaid
stateDiagram-v2
    [*] --> SinConfig: tarjeta sin closing_day/due_day
    SinConfig --> CicloAbierto: se cargan cierre y vencimiento
    state "Ciclo abierto (compras del mes en curso)" as CicloAbierto
    state "Ciclo cerrado (resumen a pagar)" as CicloCerrado
    CicloAbierto --> CicloCerrado: llega el día de cierre
    CicloCerrado --> Vencido: llega next_due (a pagar)
    Vencido --> CicloAbierto: nuevo ciclo
    note right of CicloAbierto
      "A pagar este mes" = ciclo_abierto (ARS)
      + 1 cuota de cada plan activo
      (cicloEnCurso)
    end note
    note right of CicloCerrado
      "Resumen cerrado (vence dd/mm)" = ciclo_cerrado
      (aPagarCard) — lo que realmente vence
    end note
```

Regla de fecha (de `vencimientos.py`): si `due_day > closing_day` el vencimiento cae el **mismo mes** del cierre; si `due_day ≤ closing_day`, el **mes siguiente**.

## Estado de una transacción / cuenta

```mermaid
stateDiagram-v2
    state "Transacción" as TX {
        [*] --> Registrada
        Registrada --> Editada: PATCH
        Registrada --> Borrada: DELETE / bulk_delete
        Registrada --> Movida: bulk_move (cambia account_id)
    }
    state "Cuenta" as ACC {
        [*] --> Activa
        Activa --> Archivada: DELETE con transacciones (active=0)
        Activa --> Eliminada: DELETE sin transacciones (hard delete)
    }
```

---

Seguí en [`reglas-de-negocio.md`](./reglas-de-negocio.md) para los cálculos y la lógica de privacidad.
