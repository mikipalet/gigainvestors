import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

describe("value host routing", () => {
  it.each([
    ["https://value.gigainvestors.com/ko.us", "https://value.gigainvestors.com/value/ko.us"],
    ["https://value.gigainvestors.com/", "https://value.gigainvestors.com/value"],
    ["https://value.gigainvestors.com/sitemap.xml", "https://value.gigainvestors.com/value/sitemap.xml"],
  ])("rewrites %s", (url, target) => {
    expect(proxy(new NextRequest(url)).headers.get("x-middleware-rewrite")).toBe(target);
  });
  it.each(["gigainvestors.com", "www.gigainvestors.com"])("redirects the main host %s", (host) => {
    const response = proxy(new NextRequest(`https://${host}/value/ko.us?country=US`));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://value.gigainvestors.com/ko.us?country=US");
  });
  it.each([
    "https://gigainvestors.com/s/KO", "https://gigainvestors.com/valuable",
    "https://value.gigainvestors.com/api/search", "https://value.gigainvestors.com/_next/static/a.js",
    "https://value.gigainvestors.com/faces/v3/buffett.webp", "https://value.gigainvestors.com/favicon.ico", "https://value.gigainvestors.com/LOGO.PNG",
    "https://value.gigainvestors.com/value/ko.us",
    "https://value.gigainvestors.com/newsletter/2026-q2.html",
  ])("leaves %s untouched", (url) => {
    expect(proxy(new NextRequest(url)).headers.get("x-middleware-next")).toBe("1");
  });
});

 it.each(["/ko.us", "/value/ko.us", "/sitemap.xml"])("routes %s through the proxy matcher", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
});
it.each(["/_next/static/a.js", "/_next/image", "/faces/v3/buffett.webp", "/favicon.ico", "/newsletter/2026-q2.html"])("excludes asset %s from the matcher", (url) => {
  expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
});
