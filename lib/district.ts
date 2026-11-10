import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export function districtURL(value: string): URL {
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || isIP(url.hostname) || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)) {
    throw new Error('Enter a public HTTPS StudentVUE district URL.');
  }
  url.pathname = url.pathname.replace(/\/PXP2_.*\.aspx$/i, '').replace(/\/+$/, '');
  return url;
}
export async function validateDistrict(value: string): Promise<string> {
  const url = districtURL(value);
  // Reject local/private targets before forwarding a password or contacting a district.
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => {
    if (address.includes(':')) return !/^2[0-9a-f]{3}:/i.test(address) && !/^3[0-9a-f]{3}:/i.test(address);
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19));
  })) throw new Error('The district address must resolve to a public server.');
  return url.toString().replace(/\/$/, '');
}
