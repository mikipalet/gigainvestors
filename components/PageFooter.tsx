import Link from "next/link";

// One footer for every text page, so they stop drifting apart.
export function PageFooter() {
  return (
    <nav className="supporting-links" aria-label="Further reading">
      <Link href="/about">About</Link>
      <Link href="/privacy">Privacy</Link>
      <a href="/llms.txt">llms.txt</a>
    </nav>
  );
}
