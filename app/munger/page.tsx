import {pageAlternates} from '@/lib/agents/urls';
import { Munger } from "./Munger";

export const metadata = { title: "I have nothing to add.", description:"A playful Charlie Munger quote page from GigaInvestors.", alternates:pageAlternates("main","/munger") };

export default function Page() {
  return <Munger />;
}
