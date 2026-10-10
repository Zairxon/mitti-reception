// Время клиники всегда ташкентское (UTC+5, без перехода на летнее время), независимо от телефона.
const TZ_MS = 5 * 3600 * 1000;
const pad = (n) => String(n).padStart(2, '0');

export function todayTz() { return new Date(Date.now() + TZ_MS).toISOString().slice(0, 10); }
export function isoAt(date, hm) { return date + 'T' + hm + ':00+05:00'; }
export function hhmmOf(iso) { return new Date(Date.parse(iso) + TZ_MS).toISOString().slice(11, 16); }
export function dateOf(iso) { return new Date(Date.parse(iso) + TZ_MS).toISOString().slice(0, 10); }
export function addDays(date, n) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function isoDow(date) { const d = new Date(date + 'T00:00:00Z').getUTCDay(); return d === 0 ? 7 : d; }
export function toMin(hm) { return +hm.slice(0, 2) * 60 + +hm.slice(3, 5); }
export function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
export function monthStart(date) { return date.slice(0, 8) + '01'; }
export function dayEnd(date) { return isoAt(addDays(date, 1), '00:00'); }

// Сетка времени дня по настройкам: ['09:00','09:15',…]
export function slotsOf(st) {
  const out = [], a = toMin(String(st.work_start).slice(0, 5)), b = toMin(String(st.work_end).slice(0, 5)), s = st.slot_minutes;
  for (let m = a; m + s <= b; m += s) out.push(fromMin(m));
  return out;
}

export function validHM(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
export function maskHM(s) { const d = String(s || '').replace(/\D/g, '').slice(0, 4); return d.slice(0, 2) + (d.length > 2 ? ':' + d.slice(2) : ''); }
