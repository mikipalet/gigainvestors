import { getIndex } from "@/lib/data";
import { Home } from "./Home";

export const dynamic = "force-static";

export default async function Page() {
  const index = await getIndex();
  if (!index) return null;
  return <Home index={index} />;
}
