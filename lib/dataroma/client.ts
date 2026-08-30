const BASE = "https://www.dataroma.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const GAP_MS = 250;

let last = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchHtml(path: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(BASE + path, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`http ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`http ${res.status}`), { fatal: true });
      return await res.text();
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal || attempt === 2) throw e;
      await sleep(1000 * 2 ** attempt);
    }
  }
  throw new Error("unreachable");
}

export const paths = {
  managers: "/m/managers.php",
  holdings: (code: string) => `/m/holdings.php?m=${encodeURIComponent(code)}`,
  hist: (code: string, ticker: string) =>
    `/m/hist/hist.php?f=${encodeURIComponent(code)}&s=${encodeURIComponent(ticker)}`,
  activity: (code: string) => `/m/m_activity.php?m=${encodeURIComponent(code)}&typ=a`,
};
