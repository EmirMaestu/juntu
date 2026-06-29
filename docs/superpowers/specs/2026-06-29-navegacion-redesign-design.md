# Rediseño de navegación — eliminar el sheet lateral (propuesta)

**Fecha:** 2026-06-29 · **Estado:** propuesta (pendiente de aprobación, sin implementar)

Objetivo: **eliminar el drawer lateral (☰)** y rediseñar la navegación para que cada función tenga un lugar natural y descubrible, con acceso **contextual** desde las pantallas y un nuevo hub de usuario. No es mover botones: es repensar el flujo.

---

## 1. Diagnóstico de la navegación actual

**Rutas (16):** Hoy, Finanzas(Resumen), Movimientos, Tarjetas, TarjetaDetalle, Cuentas, Categorías, Recurrentes, Agenda, Tareas, Listas, Hábitos, Notas, Buscar, Perfil, Admin.

**Superficies hoy:**
- **Bottom nav (mobile):** Hoy · Finanzas · [+] · Agenda · Tareas.
- **Drawer ☰ (mobile, arriba-derecha):** Búsqueda, Listas, Hábitos, Notas · *Finanzas:* Movimientos, Tarjetas, Cuentas, Categorías, Recurrentes · Perfil · Admin · Dashboard viejo →.
- **Sidebar (desktop):** grupos Asistente / Finanzas / Perfil / Admin.

**Problemas:**
1. **El drawer es invisible:** el usuario mira la barra inferior (zona del pulgar), no la esquina superior derecha. Todo lo que vive en el ☰ queda sin descubrir (lo confirmó el dueño: "usan solo lo de la barra de abajo").
2. **Dos taxonomías distintas** mobile vs desktop (la barra no coincide con el sidebar) → modelo mental inconsistente.
3. **El drawer es un cajón de sastre:** mezcla secciones (Listas, Notas), finanzas (Movimientos…) y cuenta (Perfil, Admin, logout) sin jerarquía.
4. **Poca navegación contextual:** las pantallas casi no se enlazan entre sí (ej. tocar una categoría en el Resumen no lleva a sus movimientos).

---

## 2. Principios del rediseño

1. **Todo lo importante se descubre desde donde el usuario mira** (la barra inferior y el contenido de cada pantalla), nunca detrás de un cajón.
2. **Hubs por dominio:** cada tab inferior es un *hub* que expone sus sub-secciones de forma visible (riel de accesos) + enlaces contextuales.
3. **Navegación contextual:** desde un dato, llegás a la pantalla que lo gobierna (categoría → sus movimientos; cuota → recurrentes; etc.).
4. **Consistencia mobile/desktop:** misma taxonomía (la barra mobile = los grupos del sidebar).
5. **Cero drawer lateral.** El ☰ desaparece.

---

## 3. Nueva barra de navegación

### Mobile — 4 tabs + FAB (sobre la pill liquid-glass ya hecha)

```
   Hoy        Finanzas      [ + ]      Agenda        Yo
 (sparkles)    (coin)       (FAB)    (calendar)    (user)
```

- **Hoy** — hub del **Asistente** (tu día + accesos a Agenda, Tareas, Listas, Hábitos, Notas).
- **Finanzas** — hub de **Finanzas** (Resumen + accesos a Movimientos, Tarjetas, Cuentas, Categorías, Recurrentes).
- **[ + ]** — alta rápida (QuickAddSheet), sin cambios.
- **Agenda** — calendario (eventos + recordatorios). Se mantiene como tab por uso diario.
- **Yo** — hub de **usuario/cuenta** (reemplaza a "Perfil" y absorbe todo lo de cuenta).

> **Decisión de diseño (la más discutible):** Tareas, Listas, Hábitos y Notas **dejan de ser tab** y pasan a vivir bajo **Hoy** (que ya es el agregador del día). Se exponen como un **riel de accesos visible** bajo el header de Hoy → siguen a un toque y, ahora sí, **descubribles**. Justificación: son "cosas del día a día" y Hoy ya las resume; tener 6 secciones de asistente como tabs es imposible en 375px. *(Alternativa B abajo si preferís Tareas como tab.)*

**TopBar (mobile)** queda: marca `Yumi` + `ScopeToggle` + `🔍 Buscar`. **Se elimina el `☰`.** (Buscar sigue como ícono global; es descubrible y es acción transversal.)

### Desktop — sidebar (se mantiene, alineado a la misma taxonomía)

El sidebar no tiene el problema del drawer, pero se **alinea** a los 4 hubs para consistencia:
- **Hoy** (con sub-items: Agenda, Tareas, Listas, Hábitos, Notas)
- **Finanzas** (Resumen, Movimientos, Tarjetas, Cuentas, Categorías, Recurrentes)
- **Yo** (Perfil, Compartir, Notificaciones, Calendario, Vincular, Admin, Cerrar sesión)

---

## 4. Qué sale del sheet y dónde va cada cosa

| Hoy estaba en el ☰ | Nuevo lugar | Cómo se llega |
|---|---|---|
| **Búsqueda** | TopBar `🔍` (se mantiene) | ícono global |
| **Listas** | Hub **Hoy** | riel de accesos + contextual (recordatorio de lista) |
| **Hábitos** | Hub **Hoy** | riel + mini-widget "hábitos de hoy" en Hoy |
| **Notas** | Hub **Hoy** | riel de accesos |
| **Movimientos** | Hub **Finanzas** | riel + tap en KPI "Gastado"/"Ingresos" |
| **Tarjetas** | Hub **Finanzas** | riel + card "Cuotas y tarjetas" → "Ver tarjetas" |
| **Cuentas** | Hub **Finanzas** | riel + KPI "Patrimonio" → Cuentas |
| **Categorías** | Hub **Finanzas** | riel + (gestión) desde Movimientos |
| **Recurrentes** | Hub **Finanzas** | riel + "En cuotas (deuda futura)" → Recurrentes |
| **Perfil** | Hub **Yo** | tab "Yo" |
| **Admin** | Hub **Yo** (si `is_admin`) | tab "Yo" |
| **Dashboard viejo →** | Hub **Yo** (footer) | tab "Yo" |

---

## 5. Hubs y enlaces contextuales (qué se vuelve clickeable y a dónde)

### Hub "Hoy" (Asistente)
- **Riel de accesos** bajo el header (chips/cards visibles): `Agenda` · `Tareas` · `Listas` · `Hábitos` · `Notas`.
- "Tu día": cada item ya enlaza a su sección (evento→Agenda, tarea→Tareas, recurrente→Recurrentes) — se mantiene y refuerza.
- Mini-widget opcional "Hábitos de hoy" → Hábitos.

### Hub "Finanzas" (Resumen, hoy `Inicio`)
- **Riel de accesos:** `Movimientos` · `Tarjetas` · `Cuentas` · `Categorías` · `Recurrentes`.
- **Contextual nuevo:**
  - KPI **"Gastado este mes"** → Movimientos (filtro: gastos, mes).
  - KPI **"Ingresos"** → Movimientos (filtro: ingresos, mes).
  - KPI **"Patrimonio"** → Cuentas.
  - **"Gastos por categoría"**: tocar una barra → Movimientos filtrado por esa categoría.
  - Card **"Cuotas y tarjetas"**: "En cuotas (deuda futura)" → Recurrentes; encabezado → Tarjetas; cada fila → detalle de tarjeta (ya existe).
- **Gestión de categorías** se accede desde el filtro de categoría en Movimientos (link "Gestionar categorías") además del riel.

### Hub "Agenda"
- Mantiene "Suscribir a mi calendario" (.ics). Recordatorios y eventos viven acá.

### Hub "Yo" (NUEVO — reemplaza Perfil)
Header: avatar + nombre + usuario. Secciones (cards/lista):
- **Perfil** (editar datos, color).
- **Compartir y privacidad** (ScopeToggle "ver datos de" + "Compartir todo" `share_all` + ayuda).
- **Notificaciones e instalar app** (el banner de instalar/activar push, ahora con hogar permanente).
- **Calendario** (suscribir / regenerar URL .ics).
- **Vincular WhatsApp / Telegram** (deep-links de vinculación).
- **Admin** (solo si `is_admin`).
- **Cerrar sesión**.
- **Dashboard viejo →** (footer, link a `/legacy/`).

---

## 6. Pantallas nuevas / modificadas

- **NUEVA `/yo`** (hub de usuario) — puede ser una evolución de la actual `/perfil` renombrada, que agrupa Perfil + Compartir + Notificaciones + Calendario + Vincular + Admin + Logout.
- **Modificadas:** `Hoy` (agrega riel de accesos), `Inicio`/Finanzas (riel + KPIs/categorías clickeables), `TopBar` (saca ☰), `Sidebar` (alinea taxonomía), `BottomNav` (nuevo set de tabs).
- **Se elimina:** `MenuDrawer.tsx` (y su estado en AppLayout).
- `/perfil` puede quedar como alias/redirect a `/yo` para no romper links.

---

## 7. Flujo de navegación (objetivo)

```mermaid
flowchart TD
    subgraph BAR["Barra inferior (4 tabs + FAB)"]
        HOY["Hoy"]:::a
        FIN["Finanzas"]:::f
        ADD["+ (QuickAdd)"]
        AGE["Agenda"]:::a
        YO["Yo"]:::y
    end
    HOY --> AG["Agenda"]
    HOY --> TA["Tareas"]
    HOY --> LI["Listas"]
    HOY --> HA["Hábitos"]
    HOY --> NO["Notas"]
    FIN --> MO["Movimientos"]
    FIN --> TJ["Tarjetas"] --> TD["Detalle tarjeta"]
    FIN --> CU["Cuentas"]
    FIN --> CA["Categorías"]
    FIN --> RE["Recurrentes"]
    FIN -. "categoría → filtro" .-> MO
    FIN -. "en cuotas →" .-> RE
    YO --> PE["Perfil"]
    YO --> SH["Compartir/privacidad"]
    YO --> NT["Notificaciones/instalar"]
    YO --> CAL["Calendario .ics"]
    YO --> VI["Vincular WA/TG"]
    YO --> AD["Admin (si admin)"]
    TOP["TopBar: 🔍 Buscar"] --> BU["Buscar"]
    classDef a fill:#eef;classDef f fill:#eaffea,stroke:#2bee4b;classDef y fill:#fef;
```

---

## 8. Justificación / consistencia

- **Descubribilidad:** todo está a un toque desde la barra o desde rieles visibles; nada detrás de un cajón.
- **Modelo mental único:** 3 dominios claros (Asistente=Hoy, Finanzas, Yo) + Agenda + Add. Mobile y desktop comparten taxonomía.
- **Contexto:** los datos llevan a su gestión (categoría→movimientos, cuota→recurrentes) — menos saltos, más natural.
- **Pulgar primero:** acciones en la barra inferior; el TopBar solo marca + scope + buscar.

---

## 9. Plan de implementación (cuando se apruebe)

1. **`Yo` hub** (`/yo`): mover Perfil + Compartir + Notificaciones + Calendario + Vincular + Admin + Logout; redirect `/perfil`→`/yo`.
2. **BottomNav**: nuevo set `Hoy · Finanzas · [+] · Agenda · Yo` sobre la pill glass.
3. **TopBar**: quitar `☰`; borrar `MenuDrawer` + estado en `AppLayout`.
4. **Hub Hoy**: riel de accesos (Agenda/Tareas/Listas/Hábitos/Notas).
5. **Hub Finanzas**: riel + KPIs/categorías clickeables (deep-links con filtros).
6. **Sidebar**: alinear a la nueva taxonomía.
7. Tests de navegación + verificación en mobile real.

---

## 10. Decisiones abiertas (para confirmar)

- **A) Nombre del hub de usuario:** `Yo` (claro) · `Vos` (más argentino/on-brand) · `Perfil` (conservador).
- **B) Set de tabs:** *Recomendado* `Hoy · Finanzas · [+] · Agenda · Yo` (Tareas/Listas/Hábitos/Notas bajo Hoy). *Alternativa B:* `Hoy · Finanzas · [+] · Tareas · Yo` (Agenda bajo Hoy) si Tareas pesa más que Agenda en el uso.
- **C) Buscar:** queda como `🔍` en TopBar (recomendado) o se mueve a un hub.
