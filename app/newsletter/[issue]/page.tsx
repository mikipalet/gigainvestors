import Link from "next/link";
import { notFound } from "next/navigation";
import { listIssues, readIssue } from "@/lib/newsletter/store";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  return listIssues().map((i) => ({ issue: i.slug }));
}

export async function generateMetadata(props: { params: Promise<{ issue: string }> }) {
  const { issue } = await props.params;
  const found = readIssue(issue);
  return { title: found ? `${found.manifest.quarter} · GigaInvestors` : "GigaInvestors", alternates: { canonical: `https://gigainvestors.com/newsletter/${issue}` } };
}

export default async function Page(props: { params: Promise<{ issue: string }> }) {
  const { issue } = await props.params;
  const found = readIssue(issue);
  if (!found) notFound();
  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex max-w-[640px] items-baseline justify-between px-6 pt-6 text-[12px]">
        <Link href="/newsletter" className="font-semibold tracking-wide opacity-45 hover:opacity-100">
          ← all issues
        </Link>
        <span className="opacity-45">{found.manifest.sentAt ? `sent ${new Date(found.manifest.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "preview"}</span>
      </div>
      <iframe title={found.manifest.subject} srcDoc={found.html} className="mx-auto block h-[calc(100dvh-60px)] w-full max-w-[680px] border-0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
    </main>
  );
}
