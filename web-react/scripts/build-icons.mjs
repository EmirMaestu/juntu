// Genera un SUBSET de la webfont de Tabler con SOLO los iconos que usa la app.
// Pasa de ~447 KB (5800 iconos) a unos pocos KB (los que están en uso) → los iconos
// cargan casi al instante, incluso en primera carga / hard-refresh.
//
// Escanea src/ buscando clases `ti-...`, mapea cada una a su codepoint desde el CSS
// de Tabler, recorta la fuente y escribe:
//   - public/fonts/tabler-subset.woff2   (la fuente recortada)
//   - src/styles/tabler-icons-subset.css (@font-face + reglas de los iconos usados)
//
// Se corre solo en cada build (ver package.json). Para regenerar a mano: npm run icons
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import subsetFont from 'subset-font'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')
const TABLER = join(ROOT, 'node_modules/@tabler/icons-webfont/dist')
const FONT_PUBLIC = '/app/fonts/tabler-subset.woff2' // base /app/ (ver vite.config base)

// 1) Recolectar las clases ti-* usadas en el código
function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, acc)
    else if (/\.(tsx?|jsx?|html|css)$/.test(e)) acc.push(p)
  }
  return acc
}
const used = new Set()
for (const f of walk(SRC)) {
  const txt = readFileSync(f, 'utf8')
  for (const m of txt.matchAll(/\bti-([a-z0-9]+(?:-[a-z0-9]+)*)\b/g)) used.add('ti-' + m[1])
}

// 2) Mapear nombre → codepoint desde el CSS de Tabler
const css = readFileSync(join(TABLER, 'tabler-icons.css'), 'utf8')
const codepoint = new Map() // 'ti-users' -> 'f1ee'
for (const m of css.matchAll(/\.(ti-[a-z0-9-]+):+before\s*\{\s*content:\s*"\\([0-9a-fA-F]+)"/g)) {
  codepoint.set(m[1], m[2].toLowerCase())
}

// 3) Filtrar a los usados que existen en la fuente (avisar de los que no)
const rules = []
const chars = []
const missing = []
for (const name of [...used].sort()) {
  const cp = codepoint.get(name)
  if (!cp) { if (name !== 'ti') missing.push(name); continue }
  rules.push(`.${name}:before{content:"\\${cp}"}`)
  chars.push(String.fromCodePoint(parseInt(cp, 16)))
}
if (missing.length) console.warn('⚠ iconos no encontrados en Tabler (se ignoran):', missing.join(', '))
if (!chars.length) { console.error('✗ no se detectaron iconos ti-* en src/'); process.exit(1) }

// 4) Subset de la fuente
const srcFont = readFileSync(join(TABLER, 'fonts/tabler-icons.woff2'))
const subset = await subsetFont(srcFont, chars.join(''), { targetFormat: 'woff2' })

mkdirSync(join(ROOT, 'public/fonts'), { recursive: true })
writeFileSync(join(ROOT, 'public/fonts/tabler-subset.woff2'), subset)

// 5) CSS con @font-face (font-display: block → sin "tofu", aparece apenas baja la fuente)
const out = `/* GENERADO por scripts/build-icons.mjs — NO editar. ${rules.length} iconos. */
@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;src:url("${FONT_PUBLIC}") format("woff2")}
.ti{font-family:"tabler-icons"!important;speak:none;font-style:normal;font-weight:normal;font-variant:normal;text-transform:none;line-height:1;display:inline-block;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
${rules.join('\n')}
`
mkdirSync(join(SRC, 'styles'), { recursive: true })
writeFileSync(join(SRC, 'styles/tabler-icons-subset.css'), out)

console.log(`✓ subset: ${rules.length} iconos, ${(subset.length / 1024).toFixed(1)} KB (de ${(srcFont.length / 1024).toFixed(0)} KB)`)
