// Trust pages: one source of truth rendered as HTML and as Markdown.
export const PAGES: Record<string, { title: string; paragraphs: string[] }> = {
  about: {
    title: "About GigaInvestors",
    paragraphs: [
      "GigaInvestors shows what 82 of the world's most followed investors own, and how that changes every quarter. Each investor's portfolio is drawn as a treemap: rectangles sized by dollar value, coloured green where they bought and red where they sold, scrubbable back through every quarter since 2006. Every stock has a page showing which of these investors hold it, how much, and since when.",
      "The data comes from quarterly 13F filings, the reports institutional managers file with the SEC, as compiled by dataroma.com. Values are the quarter-end reported values; prices are derived from value divided by shares and adjusted for splits. 13F filings cover US-listed long positions only, are published up to 45 days after quarter end, and do not include short positions, cash, or non-US holdings, so a portfolio here is the reported slice, not the whole fund.",
      "The portraits are pencil sketches generated from public photographs in a single house style. Norbert Lou of Punch Card Management has no public photograph anywhere, so he is drawn as a mystery man. The site has no accounts, no tracking, and no advertising; it is a static site rebuilt whenever new filings arrive.",
      "GigaInvestors is an independent project and is not affiliated with dataroma, the SEC, or any of the investors shown. Nothing here is investment advice: it is a record of what other people reported owning, weeks after they owned it.",
    ],
  },
  contact: {
    title: "Contact",
    paragraphs: [
      "GigaInvestors is built and maintained by a single independent developer. For corrections to an investor's data, a wrong portrait, a missing investor, or a bug, please write to hello@gigainvestors.com and include the page URL you are referring to. Data issues are checked against the underlying 13F filing before anything is changed.",
      "For press, partnership, or licensing questions, the same address works. There is no support team, no phone line, and no office to visit; replies usually arrive within a few days. If you would rather not email, the sketches and data pipeline are described on the About page, and machine-readable representations of every page are available to any client that sends an Accept: text/markdown header.",
      "If you are an agent or crawler: the site map is at /sitemap.xml, the agent guide is at /llms.txt, and every investor and stock page has a markdown twin at the same URL via content negotiation. There is no write API and nothing to authenticate against.",
    ],
  },
  privacy: {
    title: "Privacy",
    paragraphs: [
      "GigaInvestors does not collect personal data. There are no accounts, no sign-ups, no forms that store what you type, no analytics scripts, no advertising networks, and no cookies set by the site. Search runs entirely in your browser against a public index file. The only thing your browser remembers is what it remembers for any website: nothing is written to local storage on your behalf beyond standard HTTP caching of public files.",
      "The site is hosted on Vercel, whose edge network handles requests and may log IP addresses and request metadata for operational and security purposes under Vercel's own privacy policy; GigaInvestors does not access, export, or analyse those logs for tracking. Face images and data files are served as static assets with long cache lifetimes so repeat visits do not re-download them.",
      "The people shown on the site are public figures, and the information about them is drawn from public regulatory filings (SEC Form 13F) and public photographs used only as references for hand-style sketches. If you are one of the investors shown and would like a portrait changed or removed, write to hello@gigainvestors.com and it will be handled promptly.",
      "This page describes the site as it is today; if anything about data collection ever changes, this page will change first.",
    ],
  },
};
