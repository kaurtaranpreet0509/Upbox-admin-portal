/** Warehouse location: Quadrant.Aisle.Rack.Bay.Shelf e.g. W.A.R1.B1.3 */

export type LocationParts = {
  quadrant: string
  aisle: string
  rack: string
  bay: string
  shelf: string
}

const QUADRANTS = ['N', 'S', 'E', 'W'] as const
export type QuadrantCode = (typeof QUADRANTS)[number]

export function isQuadrant(value: string): value is QuadrantCode {
  return (QUADRANTS as readonly string[]).includes(value.toUpperCase())
}

/** Normalize dashes/spaces to dotted form for comparison. */
export function normalizeLocationCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[-_\s]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
}

export function formatLocationCode(
  quadrant: string,
  aisle: string,
  rack: string,
  bay: string,
  shelf: string | number
): string {
  const q = quadrant.trim().toUpperCase()
  const a = aisle.trim().toUpperCase()
  let r = rack.trim().toUpperCase()
  if (r && !r.startsWith('R')) r = `R${r.replace(/^R/i, '')}`
  let b = bay.trim().toUpperCase()
  if (b && !b.startsWith('B')) b = `B${b.replace(/^B/i, '')}`
  const s = String(shelf).trim()
  return `${q}.${a}.${r}.${b}.${s}`
}

const LOCATION_RE = /^([NSEW])\.([A-Z]+)\.(R\d+)\.(B\d+)\.(\d+)$/

export function parseLocationCode(raw: string): LocationParts | null {
  const code = normalizeLocationCode(raw)
  const m = code.match(LOCATION_RE)
  if (!m) return null
  return {
    quadrant: m[1]!,
    aisle: m[2]!,
    rack: m[3]!,
    bay: m[4]!,
    shelf: m[5]!,
  }
}

export function isPickLocationCode(raw: string): boolean {
  return parseLocationCode(raw) !== null
}

/** Hierarchy path ids for a pick shelf location. */
export function hierarchyPathForLocation(parts: LocationParts): string[] {
  const q = parts.quadrant.toLowerCase()
  const a = parts.aisle.toLowerCase()
  const r = parts.rack.toLowerCase()
  const b = parts.bay.toLowerCase()
  const s = parts.shelf
  return [
    'wh-main',
    `quad-${q}`,
    `aisle-${q}-${a}`,
    `rack-${q}-${a}-${r}`,
    `bay-${q}-${a}-${r}-${b}`,
    `shelf-${q}-${a}-${r}-${b}-${s}`,
  ]
}

export function quadrantLabel(code: string): string {
  switch (code.toUpperCase()) {
    case 'N':
      return 'North'
    case 'S':
      return 'South'
    case 'E':
      return 'East'
    case 'W':
      return 'West'
    default:
      return code
  }
}
