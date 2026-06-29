// Cuántos desplegables de Radix (Select/Popover) están abiertos ahora mismo.
//
// Lo usan Modal.tsx / Sheet.tsx: mientras hay uno abierto, una "interacción afuera"
// del Dialog es casi siempre el desplegable cerrándose — NO la intención de cerrar el
// modal — así que el guard del Dialog la ignora.
//
// Por qué un flag y no e.target.closest(...): el contenido del Select abre con
// `disableOutsidePointerEvents`, que pone pointer-events:none en todo menos el
// desplegable. Al tocar de nuevo el trigger (para cerrarlo), el target del tap puede
// terminar siendo <html>/<body>, así que closest() no encuentra el select y el modal
// se cerraba (desktop). El flag no depende del target → robusto.
let openCount = 0

export function radixPopperOpened() {
  openCount++
}

export function radixPopperClosed() {
  // Diferido: el Dialog detecta el "click afuera" de forma diferida
  // (deferPointerDownOutside, sobre el evento `click` posterior al pointerdown).
  // Mantenemos el flag unos ms para que el guard todavía lo vea y no cierre el modal.
  setTimeout(() => { openCount = Math.max(0, openCount - 1) }, 300)
}

export function isRadixPopperOpen() {
  return openCount > 0
}
