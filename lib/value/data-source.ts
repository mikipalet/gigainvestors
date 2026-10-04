import type { PriceMap } from './types';
export const VALUE_DATA_TAG = 'value-data';
const requests = new Map<string,Promise<unknown>>();
export async function fetchValueData<T>(file: string, signal?: AbortSignal): Promise<T> {
  if (!requests.has(file)) requests.set(file, fetch(`/data/v/${file}`, {priority:'high'}).then(response=>{
    if (!response.ok) throw new Error(`Value data unavailable (${response.status})`);
    return response.json();
  }).catch(error=>{requests.delete(file);throw error;}));
  // A component cancelling must not cancel another consumer of the same request.
  const data=await requests.get(file) as T;
  if(signal?.aborted) throw new DOMException('Aborted','AbortError');
  return data;
}
export function validQuote(value: unknown): PriceMap[string] | null {
  if (!Array.isArray(value) || typeof value[0] !== 'number' || !Number.isFinite(value[0]) || value[0] <= 0 || typeof value[1] !== 'string') return null;
  return value[2] === 'seed' ? [value[0],value[1],'seed'] : [value[0],value[1]];
}
