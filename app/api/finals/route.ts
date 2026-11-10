import { NextResponse } from 'next/server';
import { SynergyClient } from '@/lib/synergy';
import { validateDistrict } from '@/lib/district';
import { parseFinalGradebook } from '@/lib/finals';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
  try {
    const body = await request.json();
    if (!body || ['district_url', 'username', 'password'].some(k => typeof body[k] !== 'string' || !body[k].trim())) {
      return NextResponse.json({ error: 'District, username, and password are required.' }, { status: 400, headers });
    }
    if (body.reportPeriod != null && (!Number.isInteger(Number(body.reportPeriod)) || Number(body.reportPeriod) < 0)) return NextResponse.json({ error: 'Invalid reporting period.' }, { status: 400, headers });
    const district = await validateDistrict(body.district_url);
    const client = new SynergyClient(district, body.username, body.password);
    const raw = await client.getGradebook(body.reportPeriod == null ? undefined : Number(body.reportPeriod));
    return NextResponse.json(parseFinalGradebook(raw), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/403/.test(message)) return NextResponse.json({ error: 'Your district denied access (403). Try again later or check that this is your StudentVUE district URL.' }, { status: 403, headers });
    if (/401|invalid.*(?:password|login)|login.*failed|incorrect/i.test(message)) return NextResponse.json({ error: 'Sign-in failed. Check your username and password.' }, { status: 401, headers });
    if (/HTTPS|public|Invalid URL/i.test(message)) return NextResponse.json({ error: 'Enter a valid public HTTPS StudentVUE district URL.' }, { status: 400, headers });
    return NextResponse.json({ error: 'Could not load grades from your district. Check the district URL and your connection, then try again.' }, { status: 502, headers });
  }
}
