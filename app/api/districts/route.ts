import { NextResponse } from 'next/server';
import { SynergyClient } from '@/lib/synergy';
export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get('zip') ?? '';
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: 'Enter a five-digit ZIP code.' }, { status: 400 });
  try {
    const districts = await SynergyClient.districtLookup(zip);
    return NextResponse.json({ districts: districts.map(d => ({ name: d.name, url: d.host, address: d.address })) });
  } catch {
    return NextResponse.json({ error: 'District search is unavailable. You can enter your StudentVUE URL instead.' }, { status: 502 });
  }
}
