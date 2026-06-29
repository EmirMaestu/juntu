# Backlog de Yumi — bugs y mejoras

Lista viva de cosas detectadas para atacar con el tiempo. Cuando se completa algo, mover a "Hecho" con la fecha.

**Severidad:** 🔴 alta · 🟠 media · 🟡 baja · 💡 idea/mejora
**Estado:** `pendiente` · `en curso` · `hecho`

> Convención: agregar arriba de cada sección. Para detalle de Finanzas ver [`docs/finanzas/analisis-critico.md`](finanzas/analisis-critico.md).

---

## 🐛 Bugs

| ID | Sev | Área | Descripción | Archivo | Estado |
|----|-----|------|-------------|---------|--------|
| BUG-01 | 🔴 | Finanzas | Editar un recurrente **pisa el "día del mes" con 1** (el modal hardcodea `day_of_month:1` y `type:'gasto'` en el prefill y `handleEdit` lo envía). | `web-react/src/routes/Recurrentes.tsx` | pendiente |
| BUG-02 | 🔴 | Finanzas | `AccountForm` **cierra aunque la mutación falle** (llama `onClose()` incondicional, no en `onSuccess`) → parece que guardó y no. | `web-react/src/components/AccountForm.tsx` | pendiente |
| BUG-03 | 🟠 | Finanzas | `AdjustBalanceModal` **falla en silencio** con input inválido (NaN → `return` sin mensaje). | `web-react/src/components/AdjustBalanceModal.tsx` | pendiente |
| BUG-04 | 🟠 | Finanzas | Cuenta **solo-USD tratada como ARS** (`arsBalance` cae al primer balance). | `web-react/src/lib/cards.ts` | pendiente |
| BUG-05 | 🟡 | Finanzas | Monto con **coma decimal** (es-AR) puede romper `z.coerce.number()` (espera punto). | `EditTxModal.tsx`, `QuickAddSheet.tsx` | pendiente |
| BUG-06 | 🟡 | Finanzas | Inconsistencia de **clamp de `day_of_month`** (crud_v2 ≤28 vs job a fin de mes). | `vps_current/crud_v2.py`, `recurrence.py` | pendiente |

## ✨ Mejoras / UX

| ID | Sev | Área | Descripción | Estado |
|----|-----|------|-------------|--------|
| UX-02b | 🟠 | Navegación | **Fase 2:** links contextuales (parcial: "Patrimonio"→Cuentas, "En cuotas"→Recurrentes, "Cuotas y tarjetas"→Tarjetas, categoría→Movimientos filtrado, "Ingresos"→Movimientos). Falta filtro por **tipo** (gasto/ingreso) en Movimientos para que "Gastado" e "Ingresos" filtren por tipo. | parcial |
| UX-03 | 🔴 | Finanzas | **Sin feedback** (no hay toasts de éxito/error, ni undo). Los errores del backend no se muestran. | pendiente |
| UX-04 | 🟠 | Finanzas | **Sin updates optimistas** → la UI se siente lenta. | pendiente |
| UX-05 | 🟠 | Navegación | `/finanzas` tiene **dos nombres** ("Finanzas" bottom / "Resumen" sidebar). Unificar. | pendiente |
| BUG-07 | 🟡 | Tests | `Hoy.test.tsx` falla (4 tests) por `localStorage` en `InstallNotifyBanner` en el entorno de test (pre-existente). | pendiente |
| UX-07 | 🟡 | Finanzas | `Categorías` no tiene **skeleton de carga**. | pendiente |
| UX-08 | 🟡 | Finanzas | Validaciones que **existen pero no se muestran** (cierre/vencimiento, nombre de categoría). | pendiente |
| UX-09 | 🟡 | Finanzas | Confirmaciones dicen **"gasto"** aun para ingresos → usar "movimiento". | pendiente |

## 🏗️ Deuda técnica / simplificación

| ID | Sev | Área | Descripción | Estado |
|----|-----|------|-------------|--------|
| TECH-01 | 🟠 | Finanzas | **Dos endpoints de overview** (`/api/overview` + `/api/overview2`) alimentan la misma pantalla → 2 round-trips. Consolidar. | pendiente |
| TECH-02 | 🟠 | Finanzas | `"Transferencia"` es un **string mágico** para excluir de totales. Reemplazar por flag/tipo. | pendiente |
| TECH-03 | 🟠 | Perf | `toggleShared` y otros invalidan **todas las queries**. Acotar. | pendiente |
| TECH-04 | 🟡 | UI | **Estilos inline duplicados** en modales + color de error inconsistente (#a32d2d vs #c0392b). Extraer tokens/componentes. | pendiente |
| TECH-05 | 🟡 | Finanzas | Formateadores `dd/mm` (`fmtDay`/`fmtDate`) redefinidos en 3 pantallas → mover a `lib/format`. | pendiente |

## 🚀 Features faltantes (backend listo, falta UI)

| ID | Área | Descripción | Estado |
|----|------|-------------|--------|
| FEAT-01 | Finanzas | **Pantalla de Presupuestos** (`/api/budgets` + `budget_status` ya existen). | pendiente |
| FEAT-02 | Finanzas | **Pantalla de Tendencias/Reportes** (`/api/trends` ya existe). | pendiente |
| FEAT-03 | Finanzas | **Exportar CSV desde la web** (`/api/export.csv` ya existe). | pendiente |
| FEAT-04 | Finanzas | **Transferencias en la web** (hoy solo por bot). | pendiente |
| FEAT-05 | Finanzas | **Split de gastos compartidos** en la web (`splits.py` + `shared_expenses` listos). | pendiente |
| FEAT-06 | Finanzas | **Metas de ahorro** (tabla `savings_goals` lista). | pendiente |
| FEAT-07 | Finanzas | **Adjuntar comprobante/foto** a un gasto. | pendiente |

---

## ✅ Hecho

| ID | Descripción | Fecha |
|----|-------------|-------|
| UX-01 | Barra inferior liquid-glass (pill flotante translúcida + blur). | 2026-06-29 |
| UX-02 | Rediseño de navegación: eliminado el drawer lateral; nuevo hub "Yo"; barra `Hoy·Finanzas·+·Agenda·Yo`; rieles de acceso en Hoy y Finanzas (Fase 1). | 2026-06-29 |
| UX-06 | "Resumen" fuera del MenuDrawer → resuelto (drawer eliminado). | 2026-06-29 |
