// Browser-local preferences and confirmed receipts. Never stores wallet secrets.
const modes = ['demo', 'devnet', 'mainnet'];
export function readList(storage, key) {
  try { const rows = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(rows) ? rows : []; } catch { return []; }
}
export function watchKey(mode) { return `clique-watch-${mode}-v1`; }
export function readWatch(storage, mode) { return readList(storage, watchKey(mode)).filter(x => typeof x === 'string').slice(0,100); }
export function toggleWatch(ids, id) { return ids.includes(id) ? ids.filter(x => x !== id) : [id,...ids].slice(0,100); }
export function appendActivity(rows, item) {
  if (!modes.includes(item.mode) || !item.wallet || !item.marketId || !Number.isFinite(item.at)) throw new Error('Invalid activity receipt');
  if (item.mode !== 'demo' && !item.signature) throw new Error('Onchain activity requires a confirmed receipt');
  if (item.signature && rows.some(x => x.mode === item.mode && x.signature === item.signature)) return rows;
  return [item,...rows].slice(0,200);
}
export function readActivity(storage) {
  return readList(storage,'clique-activity-v1').filter(x => x && modes.includes(x.mode) && typeof x.wallet === 'string' && typeof x.marketId === 'string' && typeof x.title === 'string' && typeof x.action === 'string' && Number.isFinite(x.at) && (x.mode === 'demo' || typeof x.signature === 'string')).slice(0,200);
}
export function routeFromUrl(href) {
  const u = new URL(href); const mode = modes.includes(u.searchParams.get('mode')) ? u.searchParams.get('mode') : 'devnet';
  const id = u.searchParams.get('vault');
  if (!id) return {mode, vault:null, error:''};
  const valid = mode === 'demo' ? /^(sample|demo)-[a-zA-Z0-9-]{1,80}$/.test(id) : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(id);
  return valid ? {mode,vault:id,error:''} : {mode,vault:null,error:'This market link is invalid. Check its address and network.'};
}
export function marketLink(origin, mode, id) {
  const u = new URL('/',origin);u.searchParams.set('mode',mode);u.searchParams.set('vault',id);return u.toString();
}
