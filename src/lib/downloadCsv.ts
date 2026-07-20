/** Trigger a CSV file download in the browser. */
export function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const escape = (cell: string | number) => {
    const s = String(cell ?? '')
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
    return s
  }
  const lines = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
