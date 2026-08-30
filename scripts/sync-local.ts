import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const full = process.argv.includes("--full");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

import("../lib/sync/run")
  .then(({ runSync }) => runSync({ full, only: only.length ? only : undefined }))
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
