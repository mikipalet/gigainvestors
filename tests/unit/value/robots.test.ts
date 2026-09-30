import { expect, it, vi } from 'vitest';
import { headers } from 'next/headers';
import robots from '@/app/robots';
import { generateStaticParams, revalidate } from '@/app/value/[id]/page';
import { getTopIds } from '@/lib/value/store';
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/value/store', () => ({ getTopIds: vi.fn(), getDossier: vi.fn() }));
it.each(['gigainvestors.com', 'value.gigainvestors.com'])('uses the sitemap belonging to %s', async host => {
  vi.mocked(headers).mockResolvedValue(new Headers({ host }) as Awaited<ReturnType<typeof headers>>);
  expect(await robots()).toMatchObject({ sitemap: `https://${host}/sitemap.xml`, host: `https://${host}` });
});
it('survives upstream failure during static params and refreshes dossier quotes daily', async () => {
  vi.mocked(getTopIds).mockRejectedValue(new Error('503'));
  expect(await generateStaticParams()).toEqual([]);
  expect(revalidate).toBe(86400);
});
