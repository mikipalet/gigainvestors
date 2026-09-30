import { waitForEodhdReset } from '../../../lib/value/eodhd-reset';

export default async function waitEodhdReset(): Promise<void> {
  await waitForEodhdReset();
}
