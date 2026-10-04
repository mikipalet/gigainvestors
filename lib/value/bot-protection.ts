import 'server-only';
import {checkBotId} from 'botid/server';

/** BotID gates origin misses; the WAF must protect CDN hits and initial HTML. */
export async function checkDataBot(request: Request): Promise<Response | null> {
  if (!process.env.VERCEL) return null;
  try {
    const result = await checkBotId({advancedOptions: {
      checkLevel: 'basic', headers: Object.fromEntries(request.headers),
    }});
    if (result.isVerifiedBot || result.bypassed || !result.isBot) return null;
    return Response.json({error: 'Browser verification required. Agents can use /api/v1 or Markdown.'}, {
      status: 403, headers: {'Cache-Control': 'no-store'},
    });
  } catch {
    return Response.json({error: 'Verification temporarily unavailable'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
