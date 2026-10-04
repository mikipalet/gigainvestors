// Old cached clients use this URL. Redirect them into the same firewall/cache policy.
export async function GET(_request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const file = (await params).path.map(encodeURIComponent).join('/');
  return new Response(null, {status: 308, headers: {Location: `/data/v/${file}`, 'Cache-Control': 'public, max-age=3600'}});
}
