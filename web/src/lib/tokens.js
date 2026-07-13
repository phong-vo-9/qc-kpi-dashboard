// Chart color tokens — the entity palette from ui.md §18, validated CVD-safe
// with the dataviz skill's validator (light worst-adjacent ΔE 20.4, dark 16.7).
// Charts also carry legends + direct labels as secondary encoding.

export const ENTITY = {
  light: { task: '#2a78d6', review: '#16a34a', tc: '#7c3aed', td: '#eb6834', qc: '#4f46e5', bug: '#e34948' },
  dark: { task: '#3987e5', review: '#12965a', tc: '#9085e9', td: '#d95926', qc: '#6366f1', bug: '#e66767' },
}

// Chart chrome (grid / axis / surface) per mode — from the dataviz reference palette.
export const CHROME = {
  light: { grid: '#e1e0d9', axis: '#898781', tooltipBg: '#ffffff', tooltipBorder: 'rgba(11,11,11,0.10)', text: '#0b0b0b' },
  dark: { grid: '#2c2c2a', axis: '#898781', tooltipBg: '#1a1a19', tooltipBorder: 'rgba(255,255,255,0.10)', text: '#ffffff' },
}

// Status badge colors (Tailwind class fragments) — ui.md §10 Status badges.
export const STATUS_STYLE = {
  Released: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Done: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Testing: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'Ready to Test': 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'In Progress': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Todo: 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300',
}
export const statusStyle = (s) => STATUS_STYLE[s] || 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300'

// Return an ordinal n-step ramp (light→dark) for a given entity hue — used for
// ordered levels (R1/R2/R3, TC/TD 1–3) and the bug-count bands, which are
// ordered magnitudes rather than distinct identities. Steps vary opacity of the
// base hue from ~40% (lowest) to 100% (highest).
export function ramp(mode, entity, n = 3) {
  const base = ENTITY[mode][entity]
  const toHex = (a) => Math.round(a * 255).toString(16).padStart(2, '0')
  if (n === 1) return [base]
  return Array.from({ length: n }, (_, i) => {
    const alpha = 0.4 + (0.6 * i) / (n - 1) // 0.4 → 1.0
    return i === n - 1 ? base : `${base}${toHex(alpha)}`
  })
}
