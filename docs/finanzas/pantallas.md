# Finanzas — Ficha exhaustiva por pantalla y modal

Convenciones: textos **verbatim** entre comillas. `formatMoney` = es-AR, 2 decimales, símbolos `$`/`US$`/`€`, negativos con `-` adelante (ej. `-$1.234,56`). Todos los modales usan el `Modal`/`Sheet` de Radix; el botón de cerrar tiene `aria-label="Cerrar"`. `ConfirmDialog` por defecto: botones `Cancelar` / `Borrar`.

Índice: [Inicio](#1-inicio-resumen) · [Movimientos](#2-movimientos) · [Tarjetas](#3-tarjetas) · [TarjetaDetalle](#4-tarjetadetalle) · [Cuentas](#5-cuentas) · [Categorías](#6-categorías) · [Recurrentes](#7-recurrentes) · [Modales](#modales-compartidos)

---

## 1. Inicio (Resumen)

- **Ruta:** `/finanzas` · componente `Inicio`. **Nombre visible:** "Finanzas" (bottom nav) / "Resumen" (sidebar).
- **Objetivo:** dashboard del mes — cuánto se gastó, KPIs, tarjetas y gasto por categoría.
- **Cómo se llega:** bottom nav "Finanzas", sidebar "Resumen". *(No está en el MenuDrawer.)*
- **Navega a:** `/tarjetas/:id` (cada fila de tarjeta es un `<Link>`). No tiene otra navegación.
- **Datos que consume:**
  - `useOverview()` → `GET /api/overview2` (`kpis.gasto_mes`, `gasto_prev_alt`, `ingreso_mes`; `patrimonio_ars`; `blue`; `por_categoria`).
  - `useVencimientos()` → `GET /api/vencimientos` (`account_id`, `next_closing`, `ciclo_abierto`, `ciclo_cerrado`).
  - `useAccountsWithBalances()` → `GET /api/overview` → `.accounts` (filtra `type==='credito'`).
  - `useRecurring()` → `GET /api/recurring`.
- **Qué muestra:** héroe "Gastado este mes" (número serif grande) + delta vs mes pasado; 3 KPIs (`Ingresos`, `Patrimonio`, `En cuotas`); card "Cuotas y tarjetas" (a pagar este mes + deuda futura + lista de tarjetas); "Gastos por categoría" (top 6 con barras); footnote patrimonio en USD.
- **Acciones / botones:** **ninguno** (`<button>` = 0). Es read-only; única interacción = tocar una tarjeta → detalle.
- **Campos/forms:** ninguno.
- **Estados (renders condicionales):**
  - `isLoading` → `<InicioSkeleton/>`.
  - `isError || !data` → empty state `"No pudimos cargar tus datos. Reintentá."`.
  - Filas de tarjeta: si `accounts.isLoading || venc.isLoading` → shimmer; si `creditCards.length===0` → `"Sin tarjetas de crédito."`.
  - Por tarjeta, indicador de cierre (3 vías): si `dias` entre 0 y 5 → pill `"cierra en N día(s)"`; si hay `next_closing` → texto `"cierra DD/MM"`; si no → nada.
  - Categorías: si `por_categoria` vacío → `"Todavía no cargaste gastos este mes — escribile al bot o tocá +."`; si no, top 6.
  - Footnote USD: solo si `blue > 0`.
- **Cálculos:** `delta = gasto_mes - gasto_prev_alt` (muestra `Math.abs`); `totalEnCurso = cicloEnCursoTotal(venc, recurring)`; `totalEnCuotas = Σ enCuotas(card.id, recurring)`; por tarjeta `aPagarMes = cicloEnCurso(card.id, v, recurring)`; `dias = ceil((next_closing - now)/86_400_000)`.
- **Textos exactos:** `"Gastado este mes"`, `"▲"`/`"▼"`, `"vs mes pasado"`, `"Ingresos"`, `"Patrimonio"`, `"En cuotas"`, `"Cuotas y tarjetas"`, `"A pagar este mes"`, `"En cuotas (deuda futura): …"`, `"Sin tarjetas de crédito."`, `"cierra en N día/días"`, `"cierra DD/MM"`, `"Gastos por categoría"`, `"Todavía no cargaste gastos este mes — escribile al bot o tocá +."`, `"Patrimonio ≈ US$… · blue $…"`.

---

## 2. Movimientos

- **Ruta:** `/movimientos` · componente `Movimientos`.
- **Objetivo:** listar transacciones con filtros; editar/borrar por fila; modo selección para **mover en lote** y **borrar en lote**.
- **Cómo se llega:** sidebar "Movimientos", MenuDrawer "Movimientos". *(No en bottom nav.)*
- **Navega a:** no navega (todo es modales/estado in-place).
- **Datos:** `useTransactions(filters)` → `GET /api/transactions?…` → `{items,total}` (usa `.items`); `useAccounts()`; `useCategories()`; `useTxMutations()` (`remove`, `bulkDelete`, `bulkMove`, `update`).
- **Filtros (campos):**
  - `period` — Select; opciones `Mes`/`Mes pasado`/`Año`/`Todo` (valores `mes`/`mes pasado`/`año`/`todo`); default `mes`.
  - `account_id` — Select; 1ra opción `"Toda cuenta"` (`all`).
  - `category_id` — Select; 1ra opción `"Toda categoría"` (`all`).
  - `q` — input texto, placeholder `"Buscar…"`, opcional.
- **Acciones / botones:**
  - `"Seleccionar"` / `"Cancelar"` (toggle modo selección).
  - Checkbox por fila (aria `"Seleccionar {descripción}"`).
  - Toolbar (solo si hay selección): `"{n} seleccionado(s)"`, `"Mover"`, `"Borrar"`, `"×"` (aria `"Limpiar selección"`).
  - Por fila: icono editar (aria `"Editar {descripción}"`) → abre `EditTxModal`; icono borrar (aria `"Borrar {descripción}"`) → confirm.
- **Qué pasa después:**
  - Mover lote → modal "Mover a cuenta" → CTA `"Mover {n} movimiento(s) →"` → `bulkMove.mutate({ids, account_id})` → limpia selección y cierra.
  - Borrar lote → confirm `"¿Borrar {n} gasto(s)?"` desc `"Esta acción no se puede deshacer."` → `bulkDelete.mutate(ids)`.
  - Borrar fila → confirm `"¿Borrar este gasto?"` desc `'Se eliminará "{descripción}".'` → `remove.mutate(id)`.
- **Estados:** `isLoading`→`<MovimientosSkeleton/>`; vacío → `"Sin movimientos para este filtro."`; toolbar solo si `sel.size>0`; signo `+` verde (`#3b6d11`) para ingreso, `−` (U+2212) si no.
- **Subline de fila:** `"{cat_name ?? 'sin categoría'} · {acc_name ?? ''} · {YYYY-MM-DD}"`.
- **Textos exactos:** `"Movimientos"`, `"Seleccionar"`, `"Cancelar"`, `"Toda cuenta"`, `"Toda categoría"`, `"Buscar…"`, `"Mover"`, `"Borrar"`, `"×"`, `"sin categoría"`, `"Sin movimientos para este filtro."`, `"Mover a cuenta"`, `"Seleccionar cuenta…"`, `"Mover {n} movimiento(s) →"`, `"¿Borrar {n} gasto(s)?"`, `"Esta acción no se puede deshacer."`, `"¿Borrar este gasto?"`.

---

## 3. Tarjetas

- **Ruta:** `/tarjetas` · componente `Tarjetas`. Título de página: `"Tarjetas y cuotas"`.
- **Objetivo:** listar tarjetas de crédito (`type==='credito'`) con el "a pagar este mes" y la fecha de cierre; entrada al detalle.
- **Cómo se llega:** sidebar "Tarjetas", MenuDrawer "Tarjetas".
- **Navega a:** `/tarjetas/:id` (toda la card es clickeable; pasa `card.id`). Los iconos editar/borrar hacen `stopPropagation` (no navegan).
- **Datos:** `useVencimientos()`, `useAccountsWithBalances()` (filtra crédito), `useRecurring()`, `useAccountMutations()` (`remove`). Helper `cicloEnCurso(card.id, v, recurring)`.
- **Por tarjeta muestra:** nombre; iconos Editar/Borrar; label `"A pagar este mes"` + monto serif (`cicloEnCurso`); línea `"cierra DD/MM"` o fallback `"cargá cierre y vencimiento"`; pill `"cierra en N día(s)"` si faltan ≤5 días.
- **Acciones / botones:** Editar (icono, aria `"Editar"`) → `AccountForm` modo edición (`defaultType="credito"`); Borrar (icono, aria `"Borrar"`) → `ConfirmDialog`; click en card → detalle.
- **Estados:** `accounts.isLoading`→`<TarjetasSkeleton/>`; `cards.length===0`→`"No tenés tarjetas de crédito cargadas."`; pill de alerta solo si `dias` ∈ [0,5].
- **Confirmación borrar:** título `"¿Borrar esta tarjeta?"`, desc `'Se eliminará "{nombre}".'`.
- **Cálculos:** `aPagarMes = cicloEnCurso(...)`; `dias = ceil((next_closing - now)/86_400_000)`; `fmtDay` → `dd/mm`.
- **Textos exactos:** `"Tarjetas y cuotas"`, `"A pagar este mes"`, `"cierra DD/MM"`, `"cargá cierre y vencimiento"`, `"cierra en N día/días"`, `"No tenés tarjetas de crédito cargadas."`, `"¿Borrar esta tarjeta?"`.

---

## 4. TarjetaDetalle

- **Ruta:** `/tarjetas/:id` · componente `TarjetaDetalle` (`accId = Number(id)`). **Sin entrada de menú** (se llega desde Inicio o Tarjetas).
- **Objetivo:** detalle de una tarjeta: deuda total, a pagar este mes (con desglose), resumen cerrado, lista de recurrentes/cuotas (pausar/editar/borrar + "te falta"), y movimientos del mes de la tarjeta.
- **Navega a:** `← Tarjetas` (`/tarjetas`); al borrar la tarjeta → `navigate('/tarjetas')`.
- **Datos:** `useAccountsWithBalances()` (busca `accId`), `useVencimientos()`, `useRecurring()` (filtra `account_id===accId`), `useTransactions({account_id})` (en `MovimientosTarjeta`, mes actual), `useAccountMutations().remove`, `useRecurringMutations()` (`create`/`update`/`remove`).
- **Helpers `cards.ts`:** `consumos=calcConsumos(account)`, `enCuotasVal=calcEnCuotas(accId, recurring)`, `deuda=deudaTotal(...)`, `aPagarAhora=aPagarCard(venc)`, `enCursoMes=cicloEnCurso(...)`, `cuotaActual(r)`.
- **Qué muestra:**
  - Header: `← Tarjetas`, nombre (h1), iconos Editar/Borrar.
  - Card resumen: HERO `"Deuda total"` + `formatMoney(deuda)` (34px); `"A pagar este mes"` (+ `" (cierra dd/mm)"`) + `formatMoney(enCursoMes)`; desglose `"Consumos … · En cuotas …"`; línea condicional `"Resumen cerrado (vence dd/mm): …"` (solo si `aPagarAhora>0`); explicación en itálica.
  - Sección `"Recurrentes y cuotas"` + botón `"+ Agregar cuota"`. Por ítem: **fila de plan de cuotas** (subtítulo `"Cuota A de T · $X c/u"`, `"Te falta: $Y (N cuotas)"`, toggle `Pausar`/`Reactivar`, editar/borrar) o **fila fija mensual** (`"fijo mensual · $X"`, `"próxima: dd/mm"`).
  - Sección `"Movimientos de la tarjeta"`: lista del mes; vacío → `"Sin movimientos este mes en esta tarjeta."`.
- **Acciones / botones:** Editar tarjeta → `AccountForm`; Borrar tarjeta → confirm + navega; `"+ Agregar cuota"` → `CuotaModal` "Nueva cuota"; Pausar/Reactivar → `update.mutate({id, active: 0/1})`; Editar cuota → `CuotaModal` "Editar cuota"; Borrar cuota → confirm.
- **CuotaModal (campos):** `description` (texto, placeholder `"Descripción"`, requerido); `amount` ("Monto por cuota", number, min 0); `total_installments` ("Total de cuotas", number, min 1); `installments_fired` ("Cuotas ya pagadas", number, min 0, max=total) con helper `"Cuántas de las T ya pagaste"`. Botón `"Guardar"`.
- **Estados:** loading combinado → `<TarjetaDetalleSkeleton/>`; `!account` → `← Tarjetas` + `"Tarjeta no encontrada."`; por recurrente `if (r.total_installments)` plan de cuotas else fijo; `isPaused = r.active===0` (opacidad 0.55).
- **Confirmaciones:** borrar tarjeta `"¿Borrar esta tarjeta?"`; borrar cuota `"¿Borrar esta cuota?"` desc `'Se eliminará "{descripción}".'`.
- **Textos exactos clave:** `"Deuda total"`, `"A pagar este mes (cierra dd/mm)"`, `"Consumos $… · En cuotas $…"`, `"Resumen cerrado (vence dd/mm): $…"`, `"A pagar este mes = compras del ciclo + una cuota de cada plan. Deuda total = todo lo que queda por pagar."`, `"Recurrentes y cuotas"`, `"+ Agregar cuota"`, `"Sin recurrentes en esta tarjeta."`, `"Cuota A de T · $X c/u"`, `"Te falta:"`, `"fijo mensual · $X"`, `"próxima: dd/mm"`, `"Movimientos de la tarjeta"`, `"Sin movimientos este mes en esta tarjeta."`, `"Tarjeta no encontrada."`, `"Nueva cuota"`, `"Editar cuota"`, `"Monto por cuota"`, `"Total de cuotas"`, `"Cuotas ya pagadas"`.

---

## 5. Cuentas

- **Ruta:** `/cuentas` · componente `Cuentas`. Caption: `"Cuentas"`.
- **Objetivo:** listar cuentas con saldos; crear/editar/borrar; alternar privada/compartida; ajustar saldo. Las de crédito muestran desglose de deuda.
- **Cómo se llega:** sidebar "Cuentas", MenuDrawer "Cuentas".
- **Datos:** `useAccountsWithBalances()` (`GET /api/overview`→`accounts`), `useRecurring()`, `useAccountMutations().remove`, `toggleShared` (`POST /api/share` `{entity:'accounts', id, shared}` → invalida TODO).
- **Por cuenta muestra:** nombre + iconos Editar/Borrar; label de tipo (`TYPE_LABEL`); pill privada/compartida; si `credito` → bloque `"Deuda"` (`deudaTotal`) + `"Consumos … · En cuotas …"`; si no → saldos por moneda (o `"Sin movimientos"`); link `"Ajustar saldo"`.
- **Acciones / botones:** `"+ Nueva cuenta"` → `AccountForm` create; Editar → `AccountForm` edit; Borrar → confirm; pill `👥 Compartida`/`🔒 Privada` → `toggleShared`; `"Ajustar saldo"` → `AdjustBalanceModal`.
- **Tipos (`TYPE_LABEL`):** `Efectivo`, `Billetera`, `Débito`, `Crédito`, `Banco`, `Dólares (USD)`, `Cripto`, `Inversión`.
- **Estados:** `isLoading`→`<CuentasSkeleton/>`; vacío → `"No tenés cuentas cargadas."`; pill: `a.shared ? '👥 Compartida' : '🔒 Privada'` (tooltip `"Privada solo vos / Compartida con tu pareja"`).
- **Cálculos:** `consumos=Math.abs(arsBalance)`, `enCuotas`, `deudaTotal`. En AdjustBalance: `diff = nuevo - actual` → ingreso/gasto por `Math.abs(diff)`.
- **Confirmación borrar:** `"¿Borrar esta cuenta?"` desc `'Se eliminará "{nombre}".'`.
- **Textos exactos:** `"Cuentas"`, `"+ Nueva cuenta"`, `"No tenés cuentas cargadas."`, `"👥 Compartida"`, `"🔒 Privada"`, `"Privada solo vos / Compartida con tu pareja"`, `"Deuda"`, `"Consumos … · En cuotas …"`, `"Sin movimientos"`, `"Ajustar saldo"`, `"¿Borrar esta cuenta?"`.

---

## 6. Categorías

- **Ruta:** `/categorias` · componente `Categorias`. Caption: `"Categorías"`.
- **Objetivo:** ABM de categorías (solo nombre).
- **Cómo se llega:** sidebar "Categorías", MenuDrawer "Categorías".
- **Datos:** `useCategories()` (`GET /api/categories`), `useCategoryMutations()` (`create`/`update`/`remove`, invalidan `['categories']`).
- **Qué muestra:** caption + `"+ Nueva categoría"`; si vacío → `"Sin categorías."`; si no, una card con filas (nombre + Editar/Borrar). **No tiene skeleton de loading.**
- **Acciones / botones:** `"+ Nueva categoría"` → modal create; Editar → modal edit (prefill `{name}`); Borrar → confirm.
- **Campo (CategoryFormModal):** `name` — texto, requerido (HTML/RHF `required`, **sin mensaje de error visible**), placeholder `"Nombre de la categoría"`.
- **Textos exactos:** `"Categorías"`, `"+ Nueva categoría"`, `"Sin categorías."`, `"Nueva categoría"`, `"Editar categoría"`, `"Nombre de la categoría"`, `"Guardar"`, `"¿Borrar esta categoría?"`.

---

## 7. Recurrentes

- **Ruta:** `/recurrentes` · componente `Recurrentes`. Caption: `"Recurrentes y cuotas"`.
- **Objetivo:** gestionar recurrentes (fijo mensual) y planes de cuotas: crear, editar, borrar, pausar/reactivar. **Incluye inactivos** (`useRecurring(true)`).
- **Cómo se llega:** sidebar "Recurrentes", MenuDrawer "Recurrentes".
- **Datos:** `useRecurring(true)` (`?include_inactive=true`), `useAccounts()` (para el select y resolver nombre), `useRecurringMutations()`.
- **Por ítem muestra:** descripción (bold) + nombre de cuenta; tag `"cuota F/T · $X c/u"` (si cuotas) o `"fijo mensual · $X"`; meta `"próxima: dd/mm"` + palabra `cuota`/`fijo`; botón `Pausar`/`Reactivar` + Editar/Borrar. Pausado → opacidad 0.55.
- **Acciones / botones:** `"+ Nuevo"` → modal create; Pausar/Reactivar → `update.mutate({id, active})`; Editar → modal edit; Borrar → confirm.
- **Campos (RecurrenteModal, zod):**
  - `description` — texto, requerido (`"Requerido"`), placeholder `"Descripción"`.
  - `amount` — number (step 0.01), `> 0` (`"Debe ser mayor a 0"`), label `"Monto"`.
  - `account_id` — Select, requerido (`"Requerido"`), placeholder/aria `"Cuenta"`.
  - `type` — Select `Gasto`/`Ingreso` (aria `"Tipo"`). **No se envía a la API.**
  - `day_of_month` — number 1–31, label `"Día del mes"`.
  - `total_installments` — number, opcional/nullable, label `"Total de cuotas (opcional)"`, placeholder `"Dejar vacío si es fijo mensual"`.
  - `installments_fired` — number, opcional/nullable, label `"Cuotas ya pagadas (opcional)"`, placeholder `"0"`.
- **Estados:** `isLoading`→`<MovimientosSkeleton/>`; vacío → `"No hay recurrentes cargados."`.
- **Confirmación borrar:** `"¿Borrar este recurrente?"` desc `'Se eliminará "{descripción}".'`.
- **Textos exactos:** `"Recurrentes y cuotas"`, `"+ Nuevo"`, `"No hay recurrentes cargados."`, `"cuota F/T · $X c/u"`, `"fijo mensual · $X"`, `"próxima: dd/mm"`, `"Reactivar"`, `"Pausar"`, `"Nuevo recurrente"`, `"Editar recurrente"`, `"Requerido"`, `"Debe ser mayor a 0"`, `"Dejar vacío si es fijo mensual"`.

> ⚠️ Quirk: el modal de edición **hardcodea** `type:'gasto'` y `day_of_month:1` en el prefill (no refleja los valores reales), y `handleEdit` **sí** envía `day_of_month` → editar puede pisar el día real con `1`. (Ver [`analisis-critico.md`](./analisis-critico.md).)

---

## Modales compartidos

### QuickAddSheet (alta rápida "+")
- **Abre desde:** botón `+ Agregar` (sidebar) / FAB `+` (bottom nav). Título: `"Agregar"`.
- **Switcher de tipo (pills):** `Gasto` · `Tarea` · `Nota` · `Evento` · `Recordatorio`. **Tipo finanzas = `Gasto`** (no hay pill `Ingreso` ni `Transferencia`; el ingreso se elige dentro del form Gasto).
- **GastoForm (campos, zod):** `occurred_at` (hidden, ahora); `type` Select `Gasto`/`Ingreso` (placeholder `"Tipo…"`, default `gasto`); `amount` (inputmode decimal, placeholder `"Monto"`, `>0` → `"Monto inválido"`); `description` (placeholder `"Descripción"`, `min1` → `"Falta descripción"`); `account_id` Select (placeholder `"Cuenta…"`); `category_id` Select opcional (placeholder `"Categoría (opcional)…"`).
- **Botón:** `"Guardar →"` / `"Guardando…"` → `useTxMutations().create.mutate(v, {onSuccess: onClose})`.
- **Footer (siempre):** `"También podés mandarle un mensaje al bot."`

### EditTxModal (editar movimiento)
- **Abre desde:** icono Editar en Movimientos. Título: `"Editar movimiento"`. **Solo edita** (no mueve ni borra).
- **Props:** `{ tx, open, onClose }`.
- **Campos (zod):** `type` (`gasto`/`ingreso`, placeholder `"Tipo…"`); `amount` (`"Monto"`, `>0` → `"Monto inválido"`); `description` (`"Descripción"`, `min1` → `"Falta descripción"`); `account_id` (`"Cuenta…"`); `category_id` opcional (`"Categoría (opcional)…"`).
- **Botón:** `"Guardar cambios →"` / `"Guardando…"` → `update.mutate({id, ...v}, {onSuccess: onClose})`.

### AccountForm (alta/edición de cuenta o tarjeta)
- **Abre desde:** Cuentas (`+ Nueva cuenta` / editar), Tarjetas/TarjetaDetalle (editar, `defaultType="credito"`). Título: `"Nueva cuenta"` / `"Editar cuenta"`.
- **Campos (zod):** `name` (texto, requerido `"Requerido"`, placeholder `"Nombre de la cuenta"`); `type` (Select, aria `"Tipo de cuenta"`, opciones = los 8 tipos); **solo si `type==='credito'`**: `closing_day` (`"Día de cierre"`, 1–31) y `due_day` (`"Día de vencimiento"`, 1–31).
- **Botón:** `"Guardar"` → create o update; **cierra incondicionalmente** (no espera `onSuccess`) y **no se deshabilita** mientras carga.
- ⚠️ Los errores de `closing_day`/`due_day` existen en el schema pero **no se muestran**.

### AdjustBalanceModal (ajustar saldo)
- **Abre desde:** link "Ajustar saldo" en Cuentas. Título: `"Ajustar saldo"`. **Sin zod** (useState).
- **Campos:** `currency` (Select `"Moneda"`, solo si >1 moneda); `newBalance` (number, placeholder = saldo actual). Línea read-only `"Saldo actual: $…"`.
- **Botones:** `"Cancelar"`; `"Guardar"` / `"Guardando…"`.
- **Lógica:** `diff = parseFloat(newBalance) - currentBalance`; si `isNaN` → return silencioso; si `diff===0` → cierra; si no → crea transacción `ingreso`/`gasto` por `Math.abs(diff)` con descripción `"Ajuste de saldo"`.

---

Seguí en [`flujos-y-estados.md`](./flujos-y-estados.md) para los casos de uso y diagramas de estado.
