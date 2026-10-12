import '@fontsource/onest/cyrillic-400.css';
import '@fontsource/onest/latin-400.css';
import '@fontsource/onest/cyrillic-500.css';
import '@fontsource/onest/latin-500.css';
import '@fontsource/onest/cyrillic-600.css';
import '@fontsource/onest/latin-600.css';
import '@fontsource/onest/cyrillic-700.css';
import '@fontsource/onest/latin-700.css';
import '@fontsource/jetbrains-mono/cyrillic-400.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/cyrillic-600.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './style.css';
import heroUrl from './assets/hero.jpg';

import { registerSW } from 'virtual:pwa-register';
import * as api from './api.js';
import { t as T, getLang, setLang, brand } from './i18n.js';
import { mountFooter } from './footer.js';
import { parseDate, maskDate, openCal, closeCal } from './datepicker.js';
import { openSelect, closeSelect, askConfirm } from './ui.js';
import { vLogin, vNoAccess, vNav, vTabs, vView, vSheet, clientList, TABS, fullPre } from './views.js';
import { checkAlerts, unlockAudio } from './alerts.js';
import { todayTz, isoAt, addDays, monthStart, maskHM, validHM } from './time.js';
import { fmtPhoneInput, cleanPhone } from './phone.js';
import { num, fmt } from './util.js';

const $ = (id) => document.getElementById(id);
const COLORS = ['#bd5a17', '#2f7d8c', '#7a5bb5', '#3f8a4f', '#c0392b'];
const S = {
  ready: false, user: null, role: null, auth: { email: '', pass: '', busy: false },
  settings: null, doctors: [], services: [], clients: [], staff: [], day: todayTz(), appts: [],
  tab: 'queue', online: [], sheet: null, form: {}, cq: '', hist: [], newStaff: '', invite: { name: '', link: '' }, theme: 'auto',
  rep: { preset: 'today', from: todayTz(), to: todayTz(), rows: null },
};
// при входе всегда открывается «Очередь»

/* ---------- тема ---------- */
const THEMES = ['auto', 'light', 'dark'];
function getTheme() { try { const x = localStorage.getItem('uzi-theme'); return THEMES.indexOf(x) < 0 ? 'auto' : x; } catch (e) { return 'auto'; } }
function applyTheme(x) {
  const el = document.documentElement;
  if (x === 'auto') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', x);
  S.theme = x;
}
applyTheme(getTheme());
$('hero').src = heroUrl;
var SUN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
var MOON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
function effDark() { var th = getTheme(); return th === 'dark' || (th === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
function setChrome() {
  var l = getLang(), lb = document.getElementById('langbtn'), tb = document.getElementById('themebtn'); if (!lb || !tb) return;
  lb.textContent = l === 'ru' ? 'РУ' : l === 'uz' ? 'ЎЗ' : 'UZ';
  document.querySelectorAll('#langmenu button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === l)); });
  tb.innerHTML = effDark() ? SUN : MOON; tb.setAttribute('aria-label', T('Тема'));
}
document.addEventListener('click', function (ev) { var m = document.getElementById('langmenu'); if (m && !m.hidden && !ev.target.closest('#langmenu') && !ev.target.closest('#langbtn')) m.hidden = true; });


/* ---------- мелочи ---------- */
function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3500); }
const fail = (e) => { console.error(e); toast(e && e.message ? e.message : T('Ошибка')); };
const digits = (p) => String(p || '').replace(/\D/g, '');

/* ---------- отрисовка ---------- */
function applyStatic() {
  document.title = brand() + ': ' + T('Ресепшен'); document.querySelector('.hero-title').textContent = brand();
  $('hero-sub').textContent = T('Ресепшен'); setChrome(); mountFooter(T('Ресепшен'));
}
function render() {
  closeCal(); closeSelect(); applyStatic();
  const app = $('app');
  if (!S.ready) app.innerHTML = '<p class="empty">' + T('Загрузка…') + '</p>';
  else if (!S.user) app.innerHTML = vLogin(S);
  else if (!S.role) app.innerHTML = vNoAccess(S);
  else app.innerHTML = '<div id="nav">' + vNav(S) + '</div><div class="tabs"><div class="tabs-in" id="tabs" role="tablist">' + vTabs(S) + '</div></div><main id="view">' + vView(S) + '</main>';
  renderSheet(); checkAlerts(S);
}
function renderView() { setTimeout(() => checkAlerts(S), 0); if (!S.user || !S.role || !$('view')) return; $('nav').innerHTML = vNav(S); $('view').innerHTML = vView(S); }
function renderSheet() {
  $('sheet').innerHTML = vSheet(S);
  if (S.sheet && !(history.state && history.state.sheet)) history.pushState({ tab: S.tab, sheet: 1 }, ''); // «назад» сначала закроет окно
}
function closeSheet() { const had = !!S.sheet; S.sheet = null; S.form = {}; renderSheet(); if (had && history.state && history.state.sheet) history.back(); }
// «Назад» на телефоне: окно закрывается, затем возвращаемся на «Очередь», затем выход из приложения
history.replaceState({ root: 1 }, '');
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  if (S.sheet && !st.sheet) { S.sheet = null; S.form = {}; renderSheet(); return; }
  if (st.sheet) return;
  const t = st.tab || 'queue';
  if (t !== S.tab) { S.tab = t; render(); window.scrollTo(0, 0); if (t === 'report') loadReport(); }
});
function openTab(id) {
  S.tab = id; render(); window.scrollTo(0, 0);
  const cur = history.state || {};
  if (id === 'queue') { if (cur.tab) history.back(); } else if (cur.tab) history.replaceState({ tab: id }, ''); else history.pushState({ tab: id }, '');
  if (id === 'report') loadReport(); if (id === 'set' && S.role === 'owner') loadStaff().then(renderView);
}

/* ---------- загрузка данных ---------- */
function dayChanged() { return loadDay().then(() => { render(); if (S.tab === 'report') loadReport(); }).catch(fail); }
async function loadDay() { await api.expireHolds(); S.appts = await api.loadDay(S.day); try { S.online = await api.loadOnline(); } catch (e) { /* список онлайн-записей необязателен */ } }
async function refreshDay() {
  if (!S.role) return;
  try {
    await loadDay();
    renderView(); checkAlerts(S);
    if (S.sheet && S.sheet.k === 'appt') { if (S.appts.some((a) => a.id === S.sheet.id)) renderSheet(); else closeSheet(); }
  } catch (e) { /* нет сети: покажем старое */ }
}
async function loadReport() {
  const r = S.rep;
  const lastOf = (d) => addDays(addDays(monthStart(d), 32).slice(0, 8) + '01', -1); // последний день месяца
  if (r.preset === 'today') { r.from = r.to = S.day; }
  else if (r.preset === 'week') { r.to = S.day; r.from = addDays(r.to, -6); }
  else if (r.preset === 'month') { r.from = monthStart(S.day); r.to = S.day.slice(0, 7) === todayTz().slice(0, 7) ? todayTz() : lastOf(S.day); }
  r.rows = null; renderView();
  try { if (r.from && r.to && r.from <= r.to) r.rows = await api.doctorReport(r.from, r.to); else r.rows = []; } catch (e) { fail(e); r.rows = []; }
  renderView();
}
async function loadStaff() { try { S.staff = await api.listStaff(); } catch (e) { S.staff = []; } }
async function reloadBase() { const b = await api.loadBase(); S.settings = b.settings; S.doctors = b.doctors; S.services = b.services; S.bsvc = b.bsvc || []; }

let subscribed = false, liveTimer = null;
async function afterLogin() {
  try {
    S.role = await api.loadRole();
    if (!S.role) return;
    await reloadBase();
    await Promise.all([loadDay(), api.loadClients().then((c) => { S.clients = c; })]);
    if (S.role === 'owner') await loadStaff();
    if (!subscribed) { subscribed = true; api.subscribe(() => { clearTimeout(liveTimer); liveTimer = setTimeout(refreshDay, 300); }); }
    if (S.tab === 'report') loadReport();
  } catch (e) { fail(e); }
}

/* ---------- вход ---------- */
function authAction(kind) {
  const y = S.auth, email = (y.email || '').trim(), pass = y.pass || '';
  if (!email || !pass) { toast(T('Введите почту и пароль')); return; }
  if (pass.length < 8 && kind === 'up') { toast(T('Пароль: не меньше 8 символов')); return; }
  y.busy = true; render();
  (kind === 'up' ? api.signUp(email, pass) : api.signIn(email, pass).then(() => true)).then((signedIn) => {
    y.busy = false; y.pass = '';
    if (!signedIn) { toast(T('Мы отправили письмо. Подтвердите почту и нажмите «Войти»')); render(); }
  }).catch((e) => { y.busy = false; render(); fail(e); });
}

/* ---------- запись, приход, оплата ---------- */
const slotMs = () => S.settings.slot_minutes * 60000;
const apptById = (id) => S.appts.filter((a) => a.id === id)[0];

async function ensureClient(name, phone, clientId) {
  if (clientId) return clientId;
  if (!phone) return null;
  const hit = S.clients.filter((c) => digits(c.phone) === digits(phone))[0];
  if (hit) return hit.id;
  const c = await api.addClient({ name, phone, source: 'reception' });
  S.clients.unshift(c);
  return c.id;
}
function openNew(doctor, tm) { S.sheet = { k: 'new', doctor, t: tm }; S.form = { name: '', phone: '', note: '', serviceId: '', clientId: '' }; renderSheet(); }
function openPay(id) {
  const a = apptById(id); if (!a) return;
  const svc = S.services.filter((s) => s.id === a.service_id)[0];
  S.sheet = { k: 'pay', id };
  S.form = { serviceId: a.service_id || '', amount: +a.amount > 0 ? fmt(a.amount) : (svc && svc.price ? fmt(svc.price) : ''), method: a.pay_method || 'cash' };
  renderSheet();
}
async function saveNew() {
  const f = S.form, sh = S.sheet, name = (f.name || '').trim();
  if (!name) { toast(T('Введите имя клиента')); return; }
  try {
    const phone = cleanPhone(f.phone);
    const cid = await ensureClient(name, phone, f.clientId);
    const st = isoAt(S.day, sh.t);
    await api.addAppt({ doctor_id: sh.doctor, starts_at: st, ends_at: new Date(Date.parse(st) + slotMs()).toISOString(), client_id: cid, client_name: name, client_phone: phone || null, service_id: f.serviceId || null, note: (f.note || '').trim() || null, source: 'reception', status: 'booked' });
    closeSheet(); toast(T('Записано')); await refreshDay();
  } catch (e) { fail(e); closeSheet(); await refreshDay(); }
}
async function saveBlock() {
  const sh = S.sheet;
  try {
    const st = isoAt(S.day, sh.t);
    await api.addAppt({ doctor_id: sh.doctor, starts_at: st, ends_at: new Date(Date.parse(st) + slotMs()).toISOString(), client_name: '', note: (S.form.note || '').trim() || T('Закрыто'), source: 'reception', status: 'blocked' });
    closeSheet(); await refreshDay();
  } catch (e) { fail(e); closeSheet(); await refreshDay(); }
}
async function setStatus(id, status) {
  try { await api.updateAppt(id, { status }); closeSheet(); await refreshDay(); } catch (e) { fail(e); }
}
async function savePay() {
  const f = S.form, sh = S.sheet, amount = num(f.amount);
  if (!(amount > 0)) { toast(T('Введите сумму больше нуля')); return; }
  const payload = { amount, pay_method: f.method || 'cash', service_id: f.serviceId || null, paid_at: new Date().toISOString() };
  try {
    if (sh.k === 'walkin') {
      const name = (f.name || '').trim() || T('Без записи'), phone = cleanPhone(f.phone), cid = await ensureClient(name, phone, '');
      const base = Math.floor(Date.now() / slotMs()) * slotMs();
      let done = false, last = null;
      for (let k = 0; k < 16 && !done; k++) { // ближайшее свободное время у выбранного врача
        const st = new Date(base + k * slotMs()).toISOString();
        try { await api.addAppt({ doctor_id: f.doctorId, starts_at: st, ends_at: new Date(base + (k + 1) * slotMs()).toISOString(), client_id: cid, client_name: name, client_phone: phone || null, source: 'reception', status: 'done', ...payload }); done = true; } catch (e) { last = e; }
      }
      if (!done) throw last || new Error(T('Это время уже занято'));
    } else {
      await api.updateAppt(sh.id, { status: 'done', ...payload });
    }
    closeSheet(); toast(T('Оплата принята')); await refreshDay();
  } catch (e) { fail(e); }
}
async function saveRefund() {
  const f = S.form, sh = S.sheet, a = apptById(sh.id); if (!a || sh.busy) return;
  const paidSum = a.status === 'done' ? +a.amount || 0 : +a.deposit || 0, amount = num(f.amount);
  if (!(amount > 0)) { toast(T('Введите сумму больше нуля')); return; }
  if (amount > paidSum) { toast(T('Нельзя вернуть больше, чем оплачено: {n} сум', { n: fmt(paidSum) })); return; }
  const patch = { refund_amount: amount, refund_method: f.method || 'card', refunded_at: new Date().toISOString(), refund_note: (f.note || '').trim() || null };
  if (f.cancel && (a.status === 'booked' || a.status === 'came') && !a.finished_at) patch.status = 'cancelled';
  const ok = await askConfirm(T('Вернуть клиенту {n} сум?', { n: fmt(amount) }) + (patch.status ? ' ' + T('Запись будет отменена.') : ''), T('Вернуть деньги'), T('Назад'));
  if (!ok) return;
  sh.busy = true;
  try { await api.updateAppt(a.id, patch); closeSheet(); toast(T('Возврат записан')); await refreshDay(); } catch (e) { if (S.sheet) S.sheet.busy = false; fail(e); }
}
async function saveClient() {
  const f = S.form, sh = S.sheet, name = (f.name || '').trim();
  if (!name) { toast(T('Введите имя клиента')); return; }
  try {
    const row = { name, phone: cleanPhone(f.phone) || null, note: (f.note || '').trim() || null };
    if (sh.k === 'client') { const c = await api.updateClient(sh.id, row); S.clients = S.clients.map((x) => (x.id === c.id ? c : x)); }
    else { const c = await api.addClient({ ...row, source: 'reception' }); S.clients.unshift(c); }
    closeSheet(); renderView(); toast(T('Сохранено'));
  } catch (e) { fail(e); }
}
function openClient(id) {
  const c = S.clients.filter((x) => x.id === id)[0]; if (!c) return;
  S.sheet = { k: 'client', id }; S.form = { name: c.name, phone: c.phone || '', note: c.note || '' }; S.hist = []; renderSheet();
  api.loadClientHistory(id).then((h) => { if (S.sheet && S.sheet.id === id) { S.hist = h; renderSheet(); } }).catch(() => {});
}
function showSuggestions() {
  const box = $('sug'); if (!box) return;
  const q = (S.form.name || '').trim().toLowerCase(), qd = digits(S.form.phone);
  if (S.form.clientId || (q.length < 2 && qd.length < 4)) { box.innerHTML = ''; return; }
  const list = S.clients.filter((c) => (q.length >= 2 && (c.name || '').toLowerCase().indexOf(q) >= 0) || (qd.length >= 4 && digits(c.phone).indexOf(qd) >= 0)).slice(0, 4);
  box.innerHTML = list.map((c) => '<button type="button" class="sug-i" data-act="pick-client" data-id="' + c.id + '">' + c.name.replace(/</g, '&lt;') + ' · ' + (c.phone || '').replace(/</g, '&lt;') + '</button>').join('');
}

/* ---------- настройки (владелец) ---------- */
async function saveSetting(key, value) {
  try { S.settings = await api.saveSettings({ [key]: value }); renderView(); } catch (e) { fail(e); renderView(); }
}

/* ---------- события ---------- */
const hhmmDateOf = (iso) => new Date(Date.parse(iso) + 5 * 3600e3).toISOString().slice(0, 10);
['click', 'touchstart', 'keydown'].forEach((e) => document.addEventListener(e, unlockAudio, { passive: true }));
document.addEventListener('click', (ev) => {
  const sb = ev.target.closest('.sel-btn'); if (sb) { openSelect(sb); return; }
  const cb = ev.target.closest('[data-cal]'); if (cb) { const i = $(cb.dataset.cal); if (i) openCal(i); return; }
  if (ev.target.dataset && ev.target.dataset.sheet !== undefined) { closeSheet(); return; }
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  switch (act) {
    case 'login': authAction('in'); break;
    case 'signup': authAction('up'); break;
    case 'logout': api.signOut().then(() => { S.user = null; S.role = null; closeSheet(); render(); }); break;
    case 'tab': openTab(id); break;
    case 'day-prev': S.day = addDays(S.day, -1); dayChanged(); break;
    case 'day-next': S.day = addDays(S.day, 1); dayChanged(); break;
    case 'day-today': S.day = todayTz(); dayChanged(); break;
    case 'slot': openNew(b.dataset.doc, b.dataset.t); break;
    case 'appt': { const ap = apptById(id); if (ap && ap.pay_status === 'review' && ap.status === 'booked' && ap.receipt_path) { b.dataset.act = 'rc-open'; b.click(); break; } S.sheet = { k: 'appt', id }; S.form = {}; renderSheet(); break; }
    case 'al-go': { const ap = apptById(id); if (ap && ap.status === 'came') { b.dataset.act = 'room'; b.click(); break; } S.day = ap ? hhmmDateOf(ap.starts_at) : S.day; S.sheet = { k: 'appt', id }; S.form = {}; if (ap) renderSheet(); else dayChanged().then(() => { S.sheet = { k: 'appt', id }; renderSheet(); }); break; }
    case 'sheet-close': closeSheet(); break;
    case 'save-new': saveNew(); break;
    case 'save-block': saveBlock(); break;
    case 'came': setStatus(id, 'came'); break;
    case 'room': { const a = apptById(id); if (a) api.updateAppt(id, { status: a.status === 'booked' ? 'came' : a.status, room_at: new Date().toISOString() }).then(async () => { closeSheet(); await refreshDay(); toast(T('Клиент у врача')); }).catch(fail); break; }
    case 'finish': {
      const a = apptById(id); if (!a) break;
      const go = () => { const now = new Date().toISOString(), patch = { finished_at: now }; if (a.status === 'booked') patch.status = 'came'; if (a.status !== 'done' && fullPre(S, a)) Object.assign(patch, { status: 'done', amount: +a.deposit, pay_method: 'card', paid_at: now }); return api.updateAppt(id, patch).then(async () => { closeSheet(); await refreshDay(); toast(T('Приём завершён')); }).catch(fail); };
      if (a.status !== 'done' && !fullPre(S, a)) askConfirm(T('Клиент ещё не оплатил. Всё равно отметить, что приём завершён?'), T('Приём завершён'), T('Назад')).then((ok) => { if (ok) go(); }); else go();
      break;
    }
    case 'reopen': api.updateAppt(id, { finished_at: null }).then(async () => { closeSheet(); await refreshDay(); }).catch(fail); break;
    case 'doc-set': { const d = S.doctors.filter((x) => x.id === id)[0], v = b.dataset.v === '1'; if (d && d.active !== v) api.updateDoctor(id, { active: v }).then(reloadBase).then(renderView).catch(fail); break; }
    case 'noshow': setStatus(id, 'no_show'); break;
    case 'cancel': askConfirm((apptById(id) || {}).pay_status === 'paid' ? T('Отменить эту запись? Клиент уже внёс предоплату {n} сум: верните её или перенесите запись.', { n: fmt((apptById(id) || {}).deposit) }) : T('Отменить эту запись? Время снова станет свободным.'), T('Отменить запись'), T('Назад')).then((ok) => { if (ok) setStatus(id, 'cancelled'); }); break;
    case 'unblock': api.deleteAppt(id).then(() => { closeSheet(); return refreshDay(); }).catch(fail); break;
    case 'pay': openPay(id); break;
    case 'refund': { const a = apptById(id); if (!a) break; const sum = a.status === 'done' ? +a.amount || 0 : +a.deposit || 0; S.sheet = { k: 'refund', id }; S.form = { amount: fmt(sum), method: a.status === 'done' ? (a.pay_method || 'cash') : 'card', note: '', cancel: (a.status === 'booked' || a.status === 'came') && !a.finished_at }; renderSheet(); break; }
    case 'rf-cancel': S.form.cancel = !S.form.cancel; renderSheet(); break;
    case 'save-refund': saveRefund(); break;
    case 'pp-waive': askConfirm(T('Клиент придёт без предоплаты и оплатит на месте? Бронь перестанет ждать оплату.'), T('Принять без предоплаты'), T('Назад')).then((ok) => { if (ok) api.updateAppt(id, { pay_status: 'none', hold_until: null }).then(async () => { toast(T('Готово')); await refreshDay(); }).catch(fail); }); break;
    case 'rc-open': { const a = (S.online || []).concat(S.appts || []).filter((x) => x.id === id)[0]; if (!a || !a.receipt_path) { toast(T('Чек ещё не прислан')); break; } S.sheet = { k: 'receipt', id, url: null }; renderSheet(); api.receiptUrl(a.receipt_path).then((u) => { if (S.sheet && S.sheet.id === id) { S.sheet.url = u; renderSheet(); } }); break; }
    case 'rc-ok': case 'rc-no': { if (!S.sheet || S.sheet.busy) break; S.sheet.busy = true; renderSheet(); api.decideReceipt(id, act === 'rc-ok').then(async () => { toast(T(act === 'rc-ok' ? 'Оплата подтверждена, клиент уведомлён' : 'Чек отклонён, клиент уведомлён')); closeSheet(); await refreshDay(); }).catch((e) => { if (S.sheet) S.sheet.busy = false; renderSheet(); fail(e); }); break; }
    case 'pay-m': S.form.method = id; renderSheet(); break;
    case 'save-pay': savePay(); break;
    case 'walkin': S.sheet = { k: 'walkin' }; S.form = { doctorId: (S.doctors.filter((d) => d.active)[0] || {}).id, name: '', phone: '', serviceId: '', amount: '', method: 'cash' }; renderSheet(); break;
    case 'new-client': S.sheet = { k: 'newclient' }; S.form = { name: '', phone: '', note: '' }; renderSheet(); break;
    case 'client': openClient(id); break;
    case 'save-client': saveClient(); break;
    case 'pick-client': { const c = S.clients.filter((x) => x.id === id)[0]; if (c) { S.form.name = c.name; S.form.phone = c.phone || ''; S.form.clientId = c.id; if ($('f-name')) $('f-name').value = c.name; if ($('f-phone')) $('f-phone').value = c.phone || ''; $('sug').innerHTML = ''; } break; }
    case 'rep-preset': S.rep.preset = id; loadReport(); break;
    case 'wd': { const n = +id, cur = S.settings.work_days.slice(), i = cur.indexOf(n); if (i >= 0) cur.splice(i, 1); else cur.push(n); cur.sort(); if (cur.length) saveSetting('work_days', cur); break; }
    case 'doc-active': { const d = S.doctors.filter((x) => x.id === id)[0]; api.updateDoctor(id, { active: !d.active }).then(reloadBase).then(renderView).catch(fail); break; }
    case 'doc-wd': {
      const d = S.doctors.filter((x) => x.id === id)[0], n = +b.dataset.n, cur = (d.work_days || S.settings.work_days).slice(), i = cur.indexOf(n);
      if (i >= 0) cur.splice(i, 1); else cur.push(n);
      cur.sort();
      if (!cur.length) { toast(T('Нужен хотя бы один рабочий день')); break; }
      api.updateDoctor(id, { work_days: cur }).then(reloadBase).then(renderView).catch(fail); break;
    }
    case 'doc-reset': api.updateDoctor(id, { work_start: null, work_end: null, work_days: null }).then(reloadBase).then(renderView).catch(fail); break;
    case 'goto-day': S.day = b.dataset.day; openTab('queue'); dayChanged(); break;
    case 'doc-del': askConfirm(T('Удалить врача «{n}»? Это нельзя отменить.', { n: b.dataset.name }), T('Удалить врача'), T('Назад')).then((ok) => { if (ok) api.deleteDoctor(id).then(reloadBase).then(() => { renderView(); toast(T('Врач удалён')); }).catch(fail); }); break;
    case 'add-doctor': api.addDoctor({ name: T('Врач') + ' ' + (S.doctors.length + 1), sort: S.doctors.length + 1, color: COLORS[S.doctors.length % COLORS.length] }).then(reloadBase).then(renderView).catch(fail); break;
    case 'add-svc': api.addService({ name: T('Новая услуга'), price: 0, sort: S.services.length + 1 }).then(reloadBase).then(renderView).catch(fail); break;
    case 'del-svc': api.deleteService(id).then(reloadBase).then(renderView).catch(fail); break;
    case 'invite': { const nm = (S.invite.name || '').trim(); if (nm.length < 2) { toast(T('Введите имя сотрудника')); break; } api.inviteStaff(nm).then((r) => { S.invite = { name: '', link: r.link }; return loadStaff(); }).then(renderView).catch(fail); break; }
    case 'staff-link': api.relinkStaff(id).then((r) => { S.invite = { name: '', link: r.link }; renderView(); }).catch(fail); break;
    case 'copy-link': { try { navigator.clipboard.writeText(S.invite.link).then(() => toast(T('Скопировано'))); } catch (e) { const i = document.querySelector('[data-select]'); if (i) { i.select(); } } break; }
    case 'del-staff': askConfirm(T('Закрыть доступ этому сотруднику? Он сразу выйдет из приложения.'), T('Закрыть доступ'), T('Назад')).then((ok) => { if (ok) api.revokeStaff(id).then(loadStaff).then(renderView).catch(fail); }); break;
    case 'lang-set': setLang(id); $('langmenu').hidden = true; render(); break;
    case 'lang-menu': $('langmenu').hidden = !$('langmenu').hidden; break;
    case 'theme-flip': { const nx = effDark() ? 'light' : 'dark'; try { localStorage.setItem('uzi-theme', nx); } catch (e) { /* не страшно */ } applyTheme(nx); render(); break; }
    case 'theme-set': try { localStorage.setItem('uzi-theme', id); } catch (e) { /* не страшно */ } applyTheme(id); render(); break;
    default: break;
  }
});

document.addEventListener('focusin', (ev) => { const el = ev.target; if (el.dataset && el.dataset.f === 'phone' && !el.value) { el.value = '+998 '; S.form.phone = el.value; } });
document.addEventListener('focusout', (ev) => { const el = ev.target; if (el.dataset && el.dataset.f === 'phone' && el.value.trim() === '+998') { el.value = ''; S.form.phone = ''; } });
document.addEventListener('input', (ev) => {
  const el = ev.target, k = el.dataset.kind, f = el.dataset.f;
  if (f === 'phone') el.value = fmtPhoneInput(el.value, !!(ev.inputType && ev.inputType.indexOf('delete') === 0));
  if (k === 'date') el.value = maskDate(el.value);
  if (k === 'hm') el.value = maskHM(el.value);
  if (k === 'money') { const dg = el.value.replace(/\D/g, ''); el.value = dg ? Number(dg).toLocaleString('ru-RU') : ''; }
  if (k === 'int') el.value = el.value.replace(/\D/g, '').slice(0, 3);
  if (el.id === 'auth-email') S.auth.email = el.value;
  if (el.id === 'auth-pass') S.auth.pass = el.value;
  if (f === 'cq') { S.cq = el.value; const l = $('clist'); if (l) l.innerHTML = clientList(S); return; }
  if (f === 'newStaff') { S.newStaff = el.value; return; }
  if (f === 'inviteName') { S.invite.name = el.value; return; }
  if (f) {
    S.form[f] = el.value;
    if ((f === 'name' || f === 'phone') && S.sheet && S.sheet.k === 'new') { S.form.clientId = ''; showSuggestions(); }
    if (f === 'serviceId' && (S.sheet.k === 'pay' || S.sheet.k === 'walkin')) {
      const s = S.services.filter((x) => x.id === el.value)[0];
      if (s && s.price) { S.form.amount = fmt(s.price); if ($('f-amount')) $('f-amount').value = S.form.amount; }
    }
  }
});

document.addEventListener('change', (ev) => {
  const el = ev.target, k = el.dataset.kind;
  if (k === 'date') {
    const iso = parseDate(el.value);
    if (el.value.trim() && !iso) { toast(T('Введите дату в формате дд.мм.гггг, год от 2000 до 2100')); render(); return; }
    if (el.id === 'day-input' && iso) { S.day = iso; dayChanged(); }
    else if (el.id === 'rep-from' || el.id === 'rep-to') { S.rep[el.id === 'rep-from' ? 'from' : 'to'] = iso; S.rep.preset = 'custom'; loadReport(); }
    return;
  }
  if (el.dataset.s) {
    const key = el.dataset.s;
    if (k === 'hm') { if (!validHM(el.value)) { toast(T('Время в формате чч:мм')); renderView(); return; } saveSetting(key, el.value); return; }
    let v = +el.value;
    if (key === 'slot_minutes' && !(v >= 5 && v <= 120)) { toast(T('Длительность записи от 5 до 120 минут')); renderView(); return; }
    if (key === 'days_ahead' && !(v >= 1 && v <= 90)) { toast(T('Дней вперёд: от 1 до 90')); renderView(); return; }
    saveSetting(key, v); return;
  }
  if (el.dataset.docWs !== undefined || el.dataset.docWe !== undefined) {
    const id = el.dataset.docWs !== undefined ? el.dataset.docWs : el.dataset.docWe, ws = $('ws-' + id).value.trim(), we = $('we-' + id).value.trim();
    if (!ws && !we) { api.updateDoctor(id, { work_start: null, work_end: null }).then(reloadBase).then(renderView).catch(fail); return; }
    const a = ws || String(S.settings.work_start).slice(0, 5), b = we || String(S.settings.work_end).slice(0, 5);
    if (!validHM(a) || !validHM(b)) { toast(T('Время в формате чч:мм')); renderView(); return; }
    if (a >= b) { toast(T('Конец работы должен быть позже начала')); renderView(); return; }
    api.updateDoctor(id, { work_start: a, work_end: b }).then(reloadBase).then(renderView).catch(fail); return;
  }
  if (el.dataset.docBs !== undefined || el.dataset.docBe !== undefined) {
    const id = el.dataset.docBs !== undefined ? el.dataset.docBs : el.dataset.docBe, bs = $('bs-' + id).value.trim(), be = $('be-' + id).value.trim();
    if (!bs && !be) { api.updateDoctor(id, { break_start: null, break_end: null }).then(reloadBase).then(renderView).catch(fail); return; }
    if (!bs || !be) { if (bs && be === '') return; toast(T('Укажите начало и конец обеда')); return; }
    if (!validHM(bs) || !validHM(be)) { toast(T('Время в формате чч:мм')); renderView(); return; }
    if (bs >= be) { toast(T('Конец обеда должен быть позже начала')); renderView(); return; }
    api.updateDoctor(id, { break_start: bs, break_end: be }).then(reloadBase).then(renderView).catch(fail); return;
  }
  if (el.dataset.docName) { const name = el.value.trim(); if (name) api.updateDoctor(el.dataset.docName, { name }).then(reloadBase).catch(fail); return; }
  if (el.dataset.svcName) { const name = el.value.trim(); if (name) api.updateService(el.dataset.svcName, { name }).then(reloadBase).catch(fail); return; }
  if (el.dataset.svcPrice) { api.updateService(el.dataset.svcPrice, { price: num(el.value) }).then(reloadBase).catch(fail); }
});

/* ---------- запуск ---------- */
registerSW({ immediate: true });
(async () => {
  render();
  const invTok = new URLSearchParams(location.search).get('invite'); // вход сотрудника по ссылке-приглашению
  if (invTok) { try { await api.verifyInvite(invTok); } catch (e) { toast(T('Ссылка устарела. Попросите владельца создать новую.')); } history.replaceState({ root: 1 }, '', location.pathname); }
  S.user = await api.getUser();
  if (S.user) await afterLogin();
  S.ready = true; render();
  api.onAuth(async (u) => {
    const was = S.user && S.user.id;
    S.user = u;
    if (!u) { S.role = null; render(); return; }
    if (was !== u.id) { S.role = null; await afterLogin(); render(); }
  });
  setInterval(() => { if (document.visibilityState === 'visible' && S.role) refreshDay(); }, 60000);
  setInterval(() => { if (S.role) checkAlerts(S); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshDay(); });
})();
