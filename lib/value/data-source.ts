import type { PriceMap } from './types';
export const VALUE_DATA_URL = process.env.NEXT_PUBLIC_VALUE_DATA_URL ?? 'https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/';
export async function fetchValueData<T>(file: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${VALUE_DATA_URL}${file}`, {signal, cache:'no-store'});
  if (!response.ok) throw new Error(`Value data unavailable (${response.status})`);
  return response.json() as Promise<T>;
}
export function validQuote(value: unknown): PriceMap[string] | null {
  if (!Array.isArray(value) || typeof value[0] !== 'number' || !Number.isFinite(value[0]) || value[0] <= 0 || typeof value[1] !== 'string') return null;
  return value[2] === 'seed' ? [value[0],value[1],'seed'] : [value[0],value[1]];
}
