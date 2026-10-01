/** Offline v1/v2 evaluation; existing buffett-1 evidence is read-only. */
export default async function buffettCheck(): Promise<void> {
  process.env.VALUE_CHECK_VERSION = '2';
  await import('../buffett-calibrate');
}
