import { HomeContent } from "@/components/AgentContent";
import { getIndex } from "@/lib/data";
import { Home } from "./Home";

export const dynamic = "force-static";
export const metadata = { alternates: { canonical: "https://gigainvestors.com/" } };

export default async function Page() {
  const index = await getIndex();
  if (!index) return null;
  return (
    <>
      <HomeContent index={index} />
      <Home index={index} />
    </>
  );
}
