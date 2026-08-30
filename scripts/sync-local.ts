import "dotenv/config";
import { runSync } from "../lib/sync/run";

const full = process.argv.includes("--full");
const only = process.argv.filter((a) => /^[A-Za-z]+$/.test(a) && a !== "--full");

runSync({ full, only: only.length ? only : undefined })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
