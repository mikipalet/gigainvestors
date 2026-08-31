"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const looksLikeEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function UnsubscribeClient() {
  const [email, setEmail] = useState("");
  const [known, setKnown] = useState(false);
  const [oneClick, setOneClick] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "check" | "done" | "error">("idle");

  // The address arrives from the email's own link. If the merge tag did not resolve, ask for it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("done")) return setState("done");
    if (params.get("error")) return setState("error");
    // Their URL can contain & of its own, so take everything after ?u= verbatim.
    const raw = window.location.search;
    const at = raw.indexOf("?u=");
    if (at === 0 && raw.length > 3) {
      const u = decodeURIComponent(raw.slice(3));
      if (u.startsWith("https://") && !u.includes("{{{")) {
        setOneClick(u);
        setKnown(true);
        return;
      }
    }
    const e = params.get("e") ?? "";
    if (looksLikeEmail(e)) {
      setEmail(e);
      setKnown(true);
    }
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setState("busy");
    const body = oneClick ? { url: oneClick } : { email };
    const r = await fetch("/api/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setState(r?.ok ? (oneClick ? "done" : "check") : "error");
  };

  if (state === "check") {
    return (
      <>
        <h1 className="text-[26px] font-semibold leading-tight">Check your inbox.</h1>
        <p className="opacity-60">
          A link is on its way to {email}. One click on it and the letters stop. The step exists so that nobody can take someone else off the list by typing their address here.
        </p>
      </>
    );
  }

  if (state === "done") {
    return (
      <>
        <h1 className="text-[26px] font-semibold leading-tight">Unsubscribed.</h1>
        <p className="opacity-60">
          No more quarterly letters{email ? ` to ${email}` : ""}. The archive stays open if you want to read one without subscribing.
        </p>
        <div className="flex gap-3">
          <Link href="/newsletter" className="inline-block rounded-[3px] bg-ink px-4 py-2 text-[15px] font-semibold text-paper transition-opacity hover:opacity-80">
            back to the archive
          </Link>
          <Link href="/" className="inline-block rounded-[3px] px-4 py-2 text-[15px] shadow-[inset_0_0_0_1.5px_var(--ink)] transition-opacity hover:opacity-70">
            the treemaps
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold leading-tight">Stop the quarterly letter?</h1>
      <p className="opacity-60">
        {known ? (
          <>
            {oneClick ? "One click and the letters stop, and the address comes off the list along with whether anything was opened." : <>Confirm and the letters stop for <span className="font-semibold opacity-100">{email}</span>.</>}
          </>
        ) : (
          "Type the address you subscribed with. A confirmation link follows, so that nobody can unsubscribe anyone else."
        )}
      </p>
      <form onSubmit={submit} className="flex items-center gap-2">
        {!known && (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-[3px] bg-paper px-3 py-2.5 text-[16px] shadow-[inset_0_0_0_1.5px_var(--ink)] outline-none placeholder:opacity-40"
          />
        )}
        <button
          type="submit"
          disabled={state === "busy" || (!oneClick && !looksLikeEmail(email))}
          className="shrink-0 rounded-[3px] bg-ink px-4 py-2 text-[15px] font-semibold text-paper transition-opacity hover:opacity-80 disabled:opacity-40"
        >
          unsubscribe
        </button>
      </form>
      {state === "error" && (
        <p className="text-[13px] text-sell">
          That link has expired or did not go through. Try again, or write to hello@gigainvestors.com and the address comes off the list by hand.
        </p>
      )}
      <p className="text-[13px] opacity-45">
        Landed here by mistake? <Link href="/newsletter" className="underline">Keep the subscription</Link> and nothing changes.
      </p>
    </>
  );
}
