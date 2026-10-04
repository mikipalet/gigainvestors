import { expect, it, vi } from 'vitest';
import { headers } from 'next/headers';
import robots from '@/app/robots';
import { generateStaticParams, revalidate } from '@/app/s/[ticker]/page';
import { getTopIds } from '@/lib/value/store';
vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('@/lib/value/store', () => ({ getTopIds: vi.fn(), getDossier: vi.fn() }));
it.each(['gigainvestors.com', 'value.gigainvestors.com'])('uses the sitemap belonging to %s', async host => {
  vi.mocked(headers).mockResolvedValue(new Headers({ host }) as Awaited<ReturnType<typeof headers>>);
  expect(await robots()).toMatchObject({ sitemap: 'https://gigainvestors.com/sitemap.xml', host: 'https://gigainvestors.com' });
});
it('survives upstream failure during static params and refreshes dossier quotes daily', async () => {
  vi.mocked(getTopIds).mockRejectedValue(new Error('503'));
  expect(await generateStaticParams()).toContainEqual({ticker:'AAPL'});
  expect(revalidate).toBe(86400);
});
