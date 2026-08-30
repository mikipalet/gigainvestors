import { getIndex } from "@/lib/data";
import { Home } from "./Home";

export const revalidate = 86400;

export default async function Page() {
  const index = await getIndex();
  if (!index) return null;
  return <Home index={index} />;
}
