'use client';
import { useState, type ReactNode } from 'react';
export function DataTable({ caption, headers, rows, summary = 'Show data' }: { caption: string; headers: string[]; rows: ReactNode[][]; summary?: string }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={e => setOpen(e.currentTarget.open)} className="viz-data mt-2 text-xs"><summary className="w-fit cursor-pointer text-ink/55">{summary}</summary>{open && <table className="mt-2 w-full table-fixed text-left"><caption className="sr-only">{caption}</caption><thead><tr>{headers.map(h => <th key={h} scope="col" className="border-b border-ink/20 py-2 pr-2 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th key={j} scope="row" className="break-words border-b border-ink/10 py-1.5 pr-2 font-normal">{cell}</th> : <td key={j} className="break-words border-b border-ink/10 py-1.5 pr-2 tabular-nums">{cell}</td>)}</tr>)}</tbody></table>}</details>;
}
