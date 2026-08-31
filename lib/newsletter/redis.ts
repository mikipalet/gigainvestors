import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

// One lazily connected client per function instance; REDIS_URL is injected by the marketplace integration.
export async function redis(): Promise<RedisClientType> {
  if (client?.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", () => {});
  await client.connect();
  return client;
}
