import Link from "next/link";

// One footer for every text page, so they stop drifting apart.
export function PageFooter() {
  return (
    <nav className="mt-6 flex flex-wrap gap-4 text-[12px] opacity-60">
      <Link href="/">the map</Link>
      <Link href="/about">about</Link>
      <Link href="/newsletter">newsletter</Link>
      <Link href="/privacy">privacy</Link>
      <a href="mailto:hello@gigainvestors.com">contact</a>
      <a href="/llms.txt">llms.txt</a>
    </nav>
  );
}
