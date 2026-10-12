// Оповещения для ресепшена: новый чек и приближающееся время приёма. Звук + заметное окошко сверху.
import { esc } from './util.js';
import { t } from './i18n.js';
import { hhmmOf } from './time.js';

let ctx = null;
export function unlockAudio() {
  try { if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) { /* без звука */ }
}
function beep(kind) {
  try {
    unlockAudio(); if (!ctx) return;
    const notes = kind === 'receipt' ? [880, 1175, 880, 1175] : [660, 880];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + i * 0.22;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + 0.21);
    });
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(kind === 'receipt' ? [200, 100, 200, 100, 200] : [200]);
  } catch (e) { /* без звука */ }
}

const known = { receipt: new Set(), soon: new Set() };
let first = true, lastRepeat = 0;
const SOON_MS = 5 * 60000;

// Что сейчас требует внимания
export function pending(S) {
  const now = Date.now(), seen = {};
  const rc = (S.online || []).concat(S.appts || []).filter((a) => a.pay_status === 'review' && a.status === 'booked' && !seen[a.id] && (seen[a.id] = 1));
  const soon = (S.appts || []).filter((a) => a.status !== 'blocked' && a.client_name !== undefined && (a.status === 'booked' || a.status === 'came') && !a.room_at && !a.finished_at && a.pay_status !== 'review' && Date.parse(a.starts_at) - now <= SOON_MS && Date.parse(a.ends_at) > now);
  return { rc, soon };
}

export function checkAlerts(S) {
  const el = document.getElementById('alerts'); if (!el) return;
  if (!S.role) { el.innerHTML = ''; return; }
  const p = pending(S);
  let fresh = null;
  p.rc.forEach((a) => { if (!known.receipt.has(a.id)) { known.receipt.add(a.id); if (!first) fresh = 'receipt'; } });
  p.soon.forEach((a) => { const k = a.id + ':' + a.status; if (!known.soon.has(k)) { known.soon.add(k); if (!fresh) fresh = 'soon'; } });
  first = false;
  const now = Date.now();
  if (fresh) { beep(fresh); lastRepeat = now; } else if (p.rc.length && now - lastRepeat > 30000) { beep('receipt'); lastRepeat = now; }
  const docs = (S.doctors || []);
  const dn = (id) => (docs.filter((d) => d.id === id)[0] || {}).name || '';
  el.innerHTML = p.rc.map((a) => '<div class="al al-rc" role="alert"><span class="al-ic" aria-hidden="true">🧾</span><div class="al-tx"><b>' + t('Клиент прислал чек') + '</b><span>' + esc(a.client_name || '—') + ' · ' + hhmmOf(a.starts_at) + '</span></div><button class="btn" data-act="rc-open" data-id="' + esc(a.id) + '">' + t('Проверить') + '</button></div>').join('') +
    p.soon.map((a) => '<div class="al al-soon" role="alert"><span class="al-ic" aria-hidden="true">⏰</span><div class="al-tx"><b>' + t('Скоро приём') + ' · ' + hhmmOf(a.starts_at) + '</b><span>' + esc(a.client_name || '—') + (dn(a.doctor_id) ? ' · ' + esc(dn(a.doctor_id)) : '') + '</span></div><button class="btn" data-act="al-go" data-id="' + esc(a.id) + '">' + t(a.status === 'came' ? 'Вошёл к врачу' : 'Открыть') + '</button></div>').join('');
}
