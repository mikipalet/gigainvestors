import { getIndex } from "@/lib/data";
import { Home } from "./Home";

export const revalidate = 86400;

export default async function Page(props: { searchParams: Promise<{ q?: string }> }) {
  const [index, sp] = await Promise.all([getIndex(), props.searchParams]);
  if (!index) return null;
  return <Home index={index} initialQ={sp.q} />;
}
