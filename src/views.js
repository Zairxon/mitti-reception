// Страницы приложения ресепшена и кассира. Тексты идут через t() (русский / узбекский).
import { t, months, weekdays, weekdaysFull, monthsGen, getLang } from './i18n.js';
import { esc, fmt } from './util.js';
import { fmtDate } from './datepicker.js';
import { todayTz, isoAt, hhmmOf, isoDow, slotsOf, addDays, toMin, fromMin } from './time.js';
import { APP_LINKS } from './config.js';
import { fmtPhone } from './phone.js';

export const TABS = [['queue', 'Очередь'], ['cash', 'Касса'], ['clients', 'Клиенты'], ['set', 'Настройки']];
export const BUSY = ['booked', 'came', 'done', 'blocked'];
const STATUS = { booked: 'Записан', came: 'Пришёл', room: 'У врача', done: 'Оплачено', finished: 'Прошёл', cancelled: 'Отменён', no_show: 'Не пришёл', blocked: 'Время закрыто' };
// Этап визита: записан → пришёл → у врача → оплачено → прошёл (приём завершён)
export const phase = (a) => a.status === 'blocked' ? 'blocked' : a.finished_at ? 'finished' : a.status === 'done' ? 'done' : a.status === 'came' ? (a.room_at ? 'room' : 'came') : a.status;
const svcPrice = (S, a) => { const x = (S.bsvc || []).filter((b) => b.id === a.bsvc_id)[0]; return x ? +x.price : Infinity; };
// клиент уже оплатил всё вперёд: кнопка «Оплата» ему не нужна
export const fullPre = (S, a) => a.pay_status === 'paid' && +a.deposit >= svcPrice(S, a);
const METHODS = [['cash', 'Наличные'], ['card', 'Карта'], ['transfer', 'Перевод']];
const CAL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

/* ---------- мелкие помощники ---------- */
function sel(id, opts, val, attr) {
  const cur = opts.filter((o) => o[0] === val)[0] || opts[0];
  return '<button type="button" class="sel-btn" id="' + id + '" value="' + esc(cur[0]) + '" aria-haspopup="listbox" ' + (attr || '') + ' data-opts="' + esc(JSON.stringify(opts.map((o) => [o[0], t(o[1])]))) + '"><span>' + esc(t(cur[1])) + '</span>' + CHEV + '</button>';
}
function dateField(id, iso, extra) {
  return '<span class="dt"><input id="' + id + '" type="text" inputmode="numeric" maxlength="10" autocomplete="off" data-kind="date" ' + (extra || '') + ' placeholder="' + esc(t('дд.мм.гггг')) + '" value="' + esc(fmtDate(iso)) + '"><button type="button" class="dt-btn" data-cal="' + id + '" aria-label="' + esc(t('Календарь')) + '">' + CAL + '</button></span>';
}
const fld = (label, inner, cls) => '<div class="fld' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + inner + '</div>';
const field = (label, name, val, attrs, cls) => fld(label, '<input type="text" data-f="' + name + '" value="' + esc(val || '') + '" ' + (attrs || '') + '>', cls);
const pill = (act, id, on, label) => '<button type="button" class="pill" data-act="' + act + '" data-id="' + esc(id) + '" aria-pressed="' + !!on + '">' + label + '</button>';
const lcMonth = (iso) => months()[+iso.slice(5, 7) - 1];
// Полная подпись дня: «Понедельник, 12 октября 2026»
export function dayLabel(iso) { return weekdaysFull()[isoDow(iso) - 1] + ', ' + +iso.slice(8, 10) + ' ' + monthsGen()[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4); }
const doc = (S, id) => S.doctors.filter((d) => d.id === id)[0];
const docName = (S, id) => (doc(S, id) || { name: '—' }).name;
const srcTag = (s) => (s === 'site' ? '<small>' + t('сайт') + '</small>' : s === 'bot' ? '<small>' + t('бот') + '</small>' : '');
const money = (n) => fmt(n) + ' ' + t('сум');

/* ---------- вход ---------- */
export function vLogin(S) {
  const y = S.auth;
  return '<section><h2>' + t('Вход для сотрудников') + '</h2><div class="panel">' +
    fld(t('Почта'), '<input id="auth-email" type="email" autocomplete="username" inputmode="email" value="' + esc(y.email) + '">') +
    fld(t('Пароль (не меньше 8 символов)'), '<input id="auth-pass" type="password" autocomplete="current-password" value="' + esc(y.pass) + '">') +
    '<div class="row"><button class="btn" data-act="login"' + (y.busy ? ' disabled' : '') + '>' + t('Войти') + '</button><button class="btn ghost" data-act="signup"' + (y.busy ? ' disabled' : '') + '>' + t('Создать аккаунт') + '</button></div></div>' +
    '<p class="note">' + t('Если вы новый сотрудник, создайте аккаунт и сообщите почту владельцу: он откроет вам доступ.') + '</p></section>';
}
export function vNoAccess(S) {
  return '<section><h2>' + t('Доступ не выдан') + '</h2><div class="panel"><p>' + t('Вы вошли как {e}, но у этой почты нет доступа. Попросите владельца добавить вас в «Настройки» → «Сотрудники».', { e: '<b>' + esc(S.user.email || '') + '</b>' }) + '</p>' +
    '<div class="row"><button class="btn ghost" data-act="logout">' + t('Выйти') + '</button></div></div></section>';
}

/* ---------- верхняя навигация ---------- */
export function vNav(S) {
  return '<div class="top"><div class="daynav"><button class="btn ghost navbtn" data-act="day-prev" aria-label="' + esc(t('Предыдущий день')) + '">‹</button>' +
    '<div class="daymid">' + dateField('day-input', S.day) + '<span class="daylabel">' + esc(dayLabel(S.day)) + '</span></div>' +
    '<button class="btn ghost navbtn" data-act="day-next" aria-label="' + esc(t('Следующий день')) + '">›</button></div>' +
    (S.day !== todayTz() ? '<div class="row"><button class="btn ghost" data-act="day-today">' + t('Сегодня') + '</button></div>' : '') + '</div>';
}
export function vTabs(S) {
  return TABS.map((x) => '<button class="tab" role="tab" data-act="tab" data-id="' + x[0] + '" aria-selected="' + (S.tab === x[0]) + '">' + t(x[1]) + '</button>').join('');
}

/* ---------- очередь ---------- */
const effOf = (S, d) => ({ bs: d.break_start ? toMin(String(d.break_start).slice(0, 5)) : null, be: d.break_end ? toMin(String(d.break_end).slice(0, 5)) : null, a: toMin(String(d.work_start || S.settings.work_start).slice(0, 5)), b: toMin(String(d.work_end || S.settings.work_end).slice(0, 5)), days: d.work_days || S.settings.work_days });
// Кнопки быстрого действия прямо в клетке клиента: следующий шаг без открытия окна
function quick(S, a, now) {
  if (a.status === 'blocked' || a.finished_at || a.status === 'cancelled' || a.status === 'no_show') return '';
  const paid = a.status === 'done' || fullPre(S, a), btn = (act, label, cls) => '<button type="button" class="qa ' + (cls || '') + '" data-act="' + act + '" data-id="' + esc(a.id) + '">' + t(label) + '</button>';
  if (a.status === 'booked') {
    if (a.pay_status === 'review') return ''; // чек на проверке: открывается окно проверки чека
    return '<span class="qrow">' + btn('came', 'Пришёл') + (Date.parse(a.starts_at) + 10 * 60000 < now ? '<button type="button" class="qa ghost qx" data-act="noshow" data-id="' + esc(a.id) + '" title="' + esc(t('Не пришёл')) + '" aria-label="' + esc(t('Не пришёл')) + '">✕</button>' : '') + '</span>';
  }
  if (!a.room_at) return '<span class="qrow">' + btn('room', 'К врачу') + '</span>';
  return '<span class="qrow">' + (paid ? btn('finish', 'Завершить') : btn('pay', 'Оплата', 'pay')) + '</span>';
}
// Бронь с сайта или бота, пока клиент ещё не отправил чек: время удержано, но клиентом это ещё не стало (в таблице без имени)
export const isHold = (a) => a.status === 'booked' && a.pay_status === 'pending' && (a.source === 'site' || a.source === 'bot');
function queue(S) {
  const st = S.settings, docs = S.doctors.filter((d) => d.active), day = S.day, slot = st.slot_minutes, now = Date.now(), dow = isoDow(day);
  if (!docs.length) return '<p class="empty">' + t('Нет активных врачей. Добавьте их в «Настройки».') + '</p>';
  const busy = S.appts.filter((a) => BUSY.indexOf(a.status) >= 0);
  const cols = docs.map((d) => { const e = effOf(S, d); return { d, e, works: e.days.indexOf(dow) >= 0, a: busy.filter((a) => a.doctor_id === d.id).map((a) => ({ a, s: Date.parse(a.starts_at), e: Date.parse(a.ends_at) })), free: 0, next: '' }; });
  const rows = [];
  for (let m = Math.min.apply(null, cols.map((c) => c.e.a)); m + slot <= Math.max.apply(null, cols.map((c) => c.e.b)); m += slot) rows.push(fromMin(m));
  let body = '';
  rows.forEach((tm) => {
    const sMs = Date.parse(isoAt(day, tm)), eMs = sMs + slot * 60000, mn = toMin(tm);
    body += '<div class="qt">' + tm + '</div>';
    cols.forEach((c) => {
      const hit = c.a.filter((x) => x.s < eMs && x.e > sMs)[0];
      const style = ' style="--c:' + esc(c.d.color) + '"';
      if (!hit) {
        if (!c.works || mn < c.e.a || mn + slot > c.e.b) { body += '<span class="slot off"' + style + '></span>'; return; }
        if (c.e.bs !== null && mn < c.e.be && mn + slot > c.e.bs) { body += '<span class="slot off lunch"' + style + '><small>' + t('обед') + '</small></span>'; return; }
        const past = eMs <= now;
        if (!past) { c.free++; if (!c.next) c.next = tm; }
        body += '<button class="slot free' + (past ? ' past' : '') + '"' + style + ' data-act="slot" data-doc="' + esc(c.d.id) + '" data-t="' + tm + '" aria-label="' + esc(c.d.name + ' ' + tm) + '">+</button>';
      } else if (hit.s >= sMs && hit.s < eMs) {
        if (isHold(hit.a)) { body += '<span class="slot hold"' + style + '><b>⏳ ' + t('Оформляется') + '</b><small>' + (hit.a.hold_until ? t('до {h}', { h: hhmmOf(hit.a.hold_until) }) : '') + '</small></span>'; return; }
        const a = hit.a, label = a.status === 'blocked' ? (a.note || t('Закрыто')) : (a.client_name || '—');
        const pp = ppTag(a);
        body += '<div class="slot st-' + phase(a) + (pp ? ' ' + pp[0] : '') + '"' + style + ' role="button" tabindex="0" data-act="appt" data-id="' + esc(a.id) + '"><b>' + esc(label) + '</b>' +
          '<small>' + (a.finished_at ? '✔ ' + t('прошёл') : a.status === 'done' ? '✓ ' + fmt(a.amount) : a.room_at && a.status === 'came' ? '🩺 ' + t('у врача') : a.status === 'came' ? '● ' + t('ждёт') : a.status === 'blocked' ? '' : pp ? pp[1] : srcTag(a.source)) + '</small>' + quick(S, a, now) + '</div>';
      } else {
        body += '<span class="slot cont st-' + phase(hit.a) + (ppTag(hit.a) ? ' ' + ppTag(hit.a)[0] : '') + '"' + style + '></span>';
      }
    });
  });
  const sums = cols.map((c) => '<span><i style="--c:' + esc(c.d.color) + '"></i><b>' + esc(c.d.name) + '</b> · ' + (c.works ? t('свободно: {n}', { n: c.free }) + (c.next ? ' · ' + t('ближайшее {t}', { t: c.next }) : '') + ' · ' + fromMin(c.e.a) + '–' + fromMin(c.e.b) + (c.e.bs !== null ? ' · ' + t('обед') + ' ' + fromMin(c.e.bs) + '–' + fromMin(c.e.be) : '') : t('выходной')) + '</span>').join('');
  return (cols.some((c) => c.works) ? '' : '<p class="alert">' + t('Выходной день по настройкам. Записаться можно только вручную.') + '</p>') +
    '<div class="qsum">' + sums + '</div>' +
    '<div class="qlegend">' + [['booked', 'Записан'], ['came', 'Пришёл'], ['room', 'У врача'], ['done', 'Оплачено'], ['finished', 'Прошёл'], ['pp-paid', '💳 Предоплата'], ['pp-wait', '⏳ Ждёт оплату'], ['blocked', 'Закрыто'], ['off', 'Не работает']].map((x) => '<span class="lg k-' + x[0] + '">' + t(x[1]) + '</span>').join('') + '</div>' +
    '<div class="qgrid" style="grid-template-columns:40px repeat(' + cols.length + ',minmax(0,1fr))"><div></div>' +
    cols.map((c) => '<div class="qh"><i style="--c:' + esc(c.d.color) + '"></i>' + esc(c.d.name) + '</div>').join('') + body + '</div>' +
    '<p class="note">' + t('Нажмите на свободную клетку, чтобы записать клиента. Занятое время записать нельзя: это защищено в базе, в том числе для сайта и бота.') + '</p>';
}

/* ---------- клиенты ---------- */
export function clientList(S) {
  const q = (S.cq || '').trim().toLowerCase(), qd = q.replace(/\D/g, '');
  const list = S.clients.filter((c) => !q || (c.name || '').toLowerCase().indexOf(q) >= 0 || (qd && (c.phone || '').replace(/\D/g, '').indexOf(qd) >= 0)).slice(0, 80);
  if (!list.length) return '<p class="empty">' + t('Клиентов не найдено.') + '</p>';
  return '<ul class="list">' + list.map((c) => '<li><div class="li-main"><b>' + esc(c.name) + '</b><span class="small muted">' + esc(fmtPhone(c.phone)) + (c.source !== 'reception' ? ' · ' + t(c.source === 'site' ? 'сайт' : 'бот') : '') + '</span></div><button class="btn ghost" data-act="client" data-id="' + esc(c.id) + '">' + t('Открыть') + '</button></li>').join('') + '</ul>';
}
function clients(S) {
  return '<section><h2>' + t('Клиенты') + '</h2>' +
    '<div class="panel">' + fld(t('Поиск по имени или телефону'), '<input id="cq" type="text" data-f="cq" value="' + esc(S.cq || '') + '" autocomplete="off">') +
    '<div class="row gaptop"><button class="btn" data-act="new-client">' + t('Новый клиент') + '</button></div></div>' +
    '<div id="clist">' + clientList(S) + '</div></section>';
}

/* ---------- касса ---------- */
// Касса и отчёт по врачам в одной вкладке: переключатель «Сегодня» / «По врачам за период»
function cash(S) {
  const sw = '<div class="seg cashsw" role="tablist">' + [['day', 'Касса дня'], ['period', 'Отчёт по врачам']].map((x) => '<button type="button" role="tab" data-act="cash-view" data-id="' + x[0] + '" aria-pressed="' + ((S.cashView || 'day') === x[0]) + '">' + t(x[1]) + '</button>').join('') + '</div>';
  return sw + ((S.cashView || 'day') === 'period' ? report(S) : cashDay(S));
}
function cashDay(S) {
  const day = S.appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && a.status !== 'blocked');
  const paidA = (a) => a.status === 'done' || fullPre(S, a);
  const expected = day.filter((a) => a.status === 'booked' && !isHold(a)), waiting = day.filter((a) => a.status === 'came' && !paidA(a));
  const paidNow = day.filter((a) => a.status !== 'booked' && paidA(a) && !a.finished_at), finished = day.filter((a) => a.finished_at && paidA(a));
  const done = day.filter((a) => a.status === 'done'), by = { cash: 0, card: 0, transfer: 0 }; let total = 0;
  done.forEach((a) => { total += +a.amount; if (by[a.pay_method] !== undefined) by[a.pay_method] += +a.amount; });
  const noChk = done.filter((a) => !a.check_no).length;
  const mname = (a) => (METHODS.filter((m) => m[0] === a.pay_method)[0] || ['', 'Наличные'])[1];
  const B = (act, label, cls, a) => '<button class="btn ' + (cls || '') + '" data-act="' + act + '" data-id="' + esc(a.id) + '">' + t(label) + '</button>';
  const row = (a, btns) => '<li><div class="li-main"><b>' + esc(a.client_name || '—') + '</b><span class="small muted">' + hhmmOf(a.starts_at) + ' · ' + esc(docName(S, a.doctor_id)) + (a.status === 'done' ? ' · ' + t(mname(a)) : fullPre(S, a) ? ' · 💳 ' + t('оплачено вперёд') : '') + (a.room_at && !a.finished_at ? ' · 🩺 ' + t('у врача') : '') + '</span></div>' +
    (a.status === 'done' ? '<span class="num pos">' + fmt(a.amount) + '</span>' : '') + btns + '</li>';
  const sec = (cls, title, list, make, empty) => '<section class="ksec ' + cls + '"><h2><i class="kdot"></i>' + t(title) + ' <span class="kcnt">' + list.length + '</span></h2>' + (list.length ? '<ul class="list">' + list.map(make).join('') + '</ul>' : '<p class="empty">' + t(empty) + '</p>') + '</section>';
  return '<section><h2>' + t('Касса за день') + '</h2>' +
    '<div class="kpis"><div class="kpi"><span>' + t('Принято клиентов') + '</span><b>' + finished.length + '</b></div><div class="kpi"><span>' + t('Сумма') + '</span><b>' + fmt(total) + '</b></div>' +
    '<div class="kpi"><span>' + t('Наличные') + '</span><b>' + fmt(by.cash) + '</b></div><div class="kpi"><span>' + t('Карта и перевод') + '</span><b>' + fmt(by.card + by.transfer) + '</b></div></div>' +
    (noChk ? '<p class="note">' + t('Оплат без номера фискального чека: {n}. Номер указывается в окне оплаты, чек нужен на каждую оплату.', { n: noChk }) + '</p>' : '') +
    '<div class="row gaptop"><button class="btn" data-act="walkin">' + t('Приём без записи') + '</button></div></section>' +
    sec('k-wait', 'Ждут оплаты', waiting, (a) => row(a, (a.room_at ? '' : B('room', 'Вошёл к врачу', 'ghost', a)) + B('pay', 'Оплата', 'pay', a)), 'Никто не ждёт оплаты.') +
    sec('k-exp', 'Записаны, ещё не пришли', expected, (a) => row(a, B('came', 'Пришёл', 'ghost', a)), 'Нет записанных.') +
    sec('k-paid', 'Оплачено, ждут врача', paidNow, (a) => row(a, (a.room_at ? '' : B('room', 'Вошёл к врачу', 'ghost', a)) + B('finish', 'Приём завершён', '', a)), 'Оплаченных без приёма нет.') +
    sec('k-fin', 'Прошли приём', finished, (a) => row(a, B('reopen', 'Вернуть', 'ghost', a)), 'Пока никто не прошёл.');
}

/* ---------- сводка по врачам ---------- */
function report(S) {
  const r = S.rep, rows = r.rows;
  let h = '<section><h2>' + t('Сколько клиентов принял каждый врач') + '</h2><div class="panel">' +
    '<div class="pills">' + [['today', S.day === todayTz() ? 'Сегодня' : 'День'], ['week', '7 дней'], ['month', 'Месяц'], ['custom', 'Период']].map((x) => pill('rep-preset', x[0], r.preset === x[0], t(x[1]))).join('') + '</div>' +
    '<div class="grid">' + fld(t('С'), dateField('rep-from', r.from)) + fld(t('По'), dateField('rep-to', r.to)) + '</div></div>';
  if (r.from && r.to) h += '<p class="small muted">' + (r.from === r.to ? t('Период: {a}', { a: esc(dayLabel(r.from)) }) : t('Период: {a} — {b}', { a: esc(dayLabel(r.from)), b: esc(dayLabel(r.to)) })) + '</p>';
  if (!rows) return h + '<p class="empty">' + t('Загрузка…') + '</p></section>';
  let tc = 0, tt = 0;
  rows.forEach((x) => { tc += +x.clients; tt += +x.total; });
  h += '<div class="scroll"><table><thead><tr><th>' + t('Врач') + '</th><th>' + t('Клиентов') + '</th><th>' + t('Сумма') + '</th></tr></thead><tbody>' +
    rows.map((x) => '<tr><td class="lbl">' + esc(x.doctor_name) + '<br><span class="small muted">' + t('Нал.') + ' ' + fmt(x.cash) + ' · ' + t('Карта') + ' ' + fmt(x.card) + ' · ' + t('Перев.') + ' ' + fmt(x.transfer) + '</span></td><td class="num">' + x.clients + '</td><td class="num">' + fmt(x.total) + '</td></tr>').join('') +
    '<tr class="sum"><td>' + t('Итого') + '</td><td class="num">' + tc + '</td><td class="num">' + fmt(tt) + '</td></tr></tbody></table></div>' +
    '<p class="note">' + t('Считаются клиенты со статусом «Оплачено». Процент врачей настраивается в приложении «Главный».') + '</p></section>';
  return h;
}

/* ---------- ссылки на приложения клиники ---------- */
function appsBlock(S) {
  const row = (name, desc, url) => '<li><div class="li-main"><b>' + t(name) + '</b><span class="small muted">' + t(desc) + '</span></div><a class="btn ghost" href="' + url + '" target="_blank" rel="noopener">' + t('Открыть') + '</a></li>';
  return '<section><h2>' + t('Приложения клиники') + '</h2><ul class="list">' +
    (S.role === 'owner' ? row('Главный', 'бухгалтерия, зарплата, отчёты', APP_LINKS.main) : '') +
    row('Очередь', 'запись для клиентов: ссылка для Instagram и бота', APP_LINKS.queue) + '</ul></section>';
}

/* ---------- настройки ---------- */
function settings(S) {
  const st = S.settings, own = S.role === 'owner';
  const look = ''; const _lookOld = '<section><h2>' + t('Язык и тема') + '</h2><div class="panel">' +
    fld(t('Язык'), '<div class="seg"><button type="button" data-act="lang-set" data-id="ru" aria-pressed="' + (getLang() === 'ru') + '">Русский</button><button type="button" data-act="lang-set" data-id="uz" aria-pressed="' + (getLang() === 'uz') + '">Ўзбекча</button></div>') +
    fld(t('Тема'), '<div class="seg three">' + [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map((x) => '<button type="button" data-act="theme-set" data-id="' + x[0] + '" aria-pressed="' + (S.theme === x[0]) + '">' + t(x[1]) + '</button>').join('') + '</div>') +
    '</div></section>';
  const account = '<section><h2>' + t('Аккаунт') + '</h2><div class="panel"><p>' + t('Вы вошли как {e}.', { e: '<b>' + esc(S.user.email || '') + '</b>' }) + ' ' + (own ? t('Роль: владелец.') : t('Роль: ресепшен.')) + '</p><div class="row"><button class="btn ghost" data-act="logout">' + t('Выйти') + '</button></div></div></section>';
  if (!own) return appsBlock(S) + account + look + '<p class="note">' + t('Остальные настройки доступны только владельцу.') + '</p>';
  const days = [1, 2, 3, 4, 5, 6, 7].map((n) => pill('wd', n, st.work_days.indexOf(n) >= 0, weekdays()[n - 1])).join('');
  const clinic = '<section><h2>' + t('Приём') + '</h2><div class="panel"><div class="grid">' +
    fld(t('Длительность записи, минут'), '<input type="text" inputmode="numeric" class="n" data-s="slot_minutes" data-kind="int" value="' + st.slot_minutes + '">') +
    fld(t('Записывать вперёд, дней'), '<input type="text" inputmode="numeric" class="n" data-s="days_ahead" data-kind="int" value="' + st.days_ahead + '">') +
    fld(t('Начало работы'), '<input type="text" inputmode="numeric" class="n" data-s="work_start" data-kind="hm" maxlength="5" value="' + esc(String(st.work_start).slice(0, 5)) + '">') +
    fld(t('Конец работы'), '<input type="text" inputmode="numeric" class="n" data-s="work_end" data-kind="hm" maxlength="5" value="' + esc(String(st.work_end).slice(0, 5)) + '">') +
    '</div>' + fld(t('Рабочие дни'), '<div class="pills week">' + days + '</div>') + '</div>' +
    '<p class="note">' + t('Эти настройки действуют и для сайта, и для бота: клиенты увидят только свободное время в рабочие часы.') + '</p></section>';
  const doctors = '<section><h2>' + t('Врачи') + '</h2>' + S.doctors.map((d) => {
    const own = !!(d.work_start || d.work_days), e = effOf(S, d);
    const days = [1, 2, 3, 4, 5, 6, 7].map((n) => '<button type="button" class="pill" data-act="doc-wd" data-id="' + esc(d.id) + '" data-n="' + n + '" aria-pressed="' + (e.days.indexOf(n) >= 0) + '">' + weekdays()[n - 1] + '</button>').join('');
    return '<div class="panel docbox"><div class="rowline"><input type="text" data-doc-name="' + esc(d.id) + '" value="' + esc(d.name) + '">' + '<span class="yn" role="group" aria-label="' + esc(t('Принимает')) + '"><button type="button" class="yes' + (d.active ? ' on' : '') + '" data-act="doc-set" data-id="' + esc(d.id) + '" data-v="1" aria-pressed="' + d.active + '" aria-label="' + esc(t('Принимает')) + '">✓</button><button type="button" class="no' + (!d.active ? ' on' : '') + '" data-act="doc-set" data-id="' + esc(d.id) + '" data-v="0" aria-pressed="' + !d.active + '" aria-label="' + esc(t('Не принимает')) + '">✕</button></span>' + '</div>' +
      '<div class="grid">' + fld(t('Начало'), '<input type="text" inputmode="numeric" class="n" id="ws-' + esc(d.id) + '" data-doc-ws="' + esc(d.id) + '" data-kind="hm" maxlength="5" placeholder="' + fromMin(toMin(String(S.settings.work_start).slice(0, 5))) + '" value="' + (d.work_start ? esc(String(d.work_start).slice(0, 5)) : '') + '">') +
      fld(t('Конец'), '<input type="text" inputmode="numeric" class="n" id="we-' + esc(d.id) + '" data-doc-we="' + esc(d.id) + '" data-kind="hm" maxlength="5" placeholder="' + fromMin(toMin(String(S.settings.work_end).slice(0, 5))) + '" value="' + (d.work_end ? esc(String(d.work_end).slice(0, 5)) : '') + '">') + '</div>' +
      '<div class="grid">' + fld(t('Обед: начало'), '<input type="text" inputmode="numeric" class="n" id="bs-' + esc(d.id) + '" data-doc-bs="' + esc(d.id) + '" data-kind="hm" maxlength="5" placeholder="--:--" value="' + (d.break_start ? esc(String(d.break_start).slice(0, 5)) : '') + '">') +
      fld(t('Обед: конец'), '<input type="text" inputmode="numeric" class="n" id="be-' + esc(d.id) + '" data-doc-be="' + esc(d.id) + '" data-kind="hm" maxlength="5" placeholder="--:--" value="' + (d.break_end ? esc(String(d.break_end).slice(0, 5)) : '') + '">') + '</div>' +
      fld(t('Рабочие дни врача'), '<div class="pills week">' + days + '</div>') +
      '<div class="row"><button class="btn ghost danger small" data-act="doc-del" data-id="' + esc(d.id) + '" data-name="' + esc(d.name) + '">' + t('Удалить врача') + '</button>' + (own ? '<span class="chip">' + t('свои часы') + '</span><button class="btn ghost small" data-act="doc-reset" data-id="' + esc(d.id) + '">' + t('Как у клиники') + '</button>' : '<span class="small muted">' + t('Сейчас часы как у клиники.') + '</span>') + '</div></div>';
  }).join('') +
    '<div class="row gaptop"><button class="btn ghost" data-act="add-doctor">' + t('Добавить врача') + '</button></div>' +
    '<p class="note">' + t('Время работы врача: пустые поля значат часы клиники. Вне часов врача клетки закрыты, и сайт с ботом тоже не покажут это время.') + '</p>' +
    '<p class="note">' + t('«Не принимает» временно скрывает врача из расписания, сайта и бота (отпуск, болезнь): записи сохраняются. Обед закрывает это время для записи. Кнопка «Удалить врача» убирает врача совсем.') + '</p></section>';
  const services = '<section><h2>' + t('Услуги и цены') + '</h2><div class="panel">' + (S.services.length ? S.services.map((s) =>
    '<div class="rowline"><input type="text" data-svc-name="' + esc(s.id) + '" value="' + esc(s.name) + '"><input type="text" inputmode="numeric" class="n" data-svc-price="' + esc(s.id) + '" data-kind="money" value="' + (s.price ? fmt(s.price) : '') + '" placeholder="0"><button class="btn del" data-act="del-svc" data-id="' + esc(s.id) + '" aria-label="' + esc(t('Удалить')) + '">×</button></div>').join('') : '<p class="empty">' + t('Услуг пока нет. Добавьте виды УЗИ и цены, чтобы кассир выбирал их в один клик.') + '</p>') +
    '<div class="row gaptop"><button class="btn ghost" data-act="add-svc">' + t('Добавить услугу') + '</button></div></div></section>';
  const inv = S.invite || { name: '', link: '' };
  const staff = '<section><h2>' + t('Сотрудники') + '</h2><div class="panel">' + (S.staff || []).map((u) =>
    '<div class="rowline"><span class="grow"><b>' + esc(u.name || u.email) + '</b> <span class="chip">' + (u.role === 'owner' ? t('владелец') : t('ресепшен')) + '</span></span>' + (u.user_id !== S.user.id && u.role !== 'owner' ? '<button class="btn ghost small" data-act="staff-link" data-id="' + esc(u.user_id) + '">' + t('Новая ссылка') + '</button><button class="btn del" data-act="del-staff" data-id="' + esc(u.user_id) + '" aria-label="' + esc(t('Удалить')) + '">×</button>' : '') + '</div>').join('') + '</div>' +
    '<div class="panel">' + fld(t('Имя нового сотрудника'), '<input id="staff-name" type="text" autocomplete="off" data-f="inviteName" value="' + esc(inv.name || '') + '">') +
    '<div class="row"><button class="btn" data-act="invite">' + t('Создать ссылку для входа') + '</button></div>' +
    (inv.link ? '<div class="invbox"><p class="small"><b>' + t('Ссылка для сотрудника') + '</b></p><input type="text" readonly value="' + esc(inv.link) + '" data-select><div class="row"><button class="btn" data-act="copy-link">' + t('Скопировать') + '</button><a class="btn ghost" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + encodeURIComponent(inv.link) + '&text=' + encodeURIComponent(t('Ссылка для входа в «Ресепшен»')) + '">' + t('Отправить в Telegram') + '</a></div></div>' : '') + '</div>' +
    '<p class="note">' + t('Сотрудник открывает ссылку на своём телефоне и сразу входит, без пароля. Ссылка одноразовая и действует недолго. Если не успел, создайте новую. «×» закрывает доступ сразу.') + '</p></section>';
  return clinic + doctors + services + staff + appsBlock(S) + account + look;
}

/* ---------- лист (окно снизу) ---------- */
export function vSheet(S) {
  const sh = S.sheet; if (!sh) return '';
  const f = S.form, svcOpts = [['', '—']].concat(S.services.filter((s) => s.active).map((s) => [s.id, s.name]));
  const close = '<button type="button" class="sheet-x" data-act="sheet-close" aria-label="' + esc(t('Закрыть')) + '">×</button>';
  let h = '';
  if (sh.k === 'new') {
    h = '<h2>' + t('Новая запись') + '</h2><p class="small muted">' + esc(docName(S, sh.doctor)) + ' · ' + esc(dayLabel(S.day)) + ' · <b>' + sh.t + '</b></p>' +
      field(t('Имя клиента'), 'name', f.name, 'autocomplete="off" id="f-name"') + field(t('Телефон'), 'phone', f.phone, 'inputmode="tel" autocomplete="off" placeholder="+998" id="f-phone"') +
      '<div id="sug" class="sug"></div>' +
      fld(t('Услуга'), sel('f-service', svcOpts, f.serviceId || '', 'data-f="serviceId"')) + field(t('Комментарий'), 'note', f.note, 'autocomplete="off"') +
      fld(t('Откуда клиент'), '<div class="seg">' + [['call', 'По звонку'], ['walkin', 'Живая очередь']].map((x) => '<button type="button" data-act="ch-set" data-id="' + x[0] + '" aria-pressed="' + ((f.channel || 'call') === x[0]) + '">' + t(x[1]) + '</button>').join('') + '</div>') +
      '<div class="row"><button class="btn" data-act="save-new">' + t('Записать') + '</button><button class="btn ghost" data-act="save-block">' + t('Закрыть время') + '</button></div>';
  } else if (sh.k === 'receipt') {
    const a = anyAppt(S, sh.id); if (!a) return '';
    h = '<h2>🧾 ' + t('Чек на проверку') + '</h2><ul class="list"><li><div class="li-main"><b>' + esc(a.client_name || '—') + '</b><span class="small muted">' + esc(fmtPhone(a.client_phone || '')) + '</span></div></li>' +
      '<li><div class="li-main"><b>' + esc(dayLabel(hhmmDate(a.starts_at))) + ' · ' + hhmmOf(a.starts_at) + '</b><span class="small muted">' + esc(docName(S, a.doctor_id)) + '</span></div></li>' +
      '<li><div class="li-main"><b>' + t('К оплате') + '</b></div><span class="num">' + fmt(a.deposit) + ' ' + t('сум') + '</span></li></ul>' +
      (sh.url ? '<a href="' + esc(sh.url) + '" target="_blank" rel="noopener"><img class="rcimg" src="' + esc(sh.url) + '" alt="' + esc(t('Чек')) + '"></a>' : '<p class="empty">' + t(sh.url === '' ? 'Не удалось загрузить фото чека' : 'Загружаю фото…') + '</p>') +
      '<div class="row gaptop"><button class="btn pay" data-act="rc-ok" data-id="' + esc(a.id) + '"' + (sh.busy ? ' disabled' : '') + '>' + t('Подтвердить') + '</button><button class="btn danger solid" data-act="rc-no" data-id="' + esc(a.id) + '"' + (sh.busy ? ' disabled' : '') + '>' + t('Не подтверждён') + '</button></div>';
  } else if (sh.k === 'appt') {
    const a = S.appts.filter((x) => x.id === sh.id)[0]; if (!a) return '';
    const paidA = a.status === 'done' || fullPre(S, a), prePaid = a.pay_status === 'paid', B = (act, label, cls) => '<button class="btn ' + (cls || '') + '" data-act="' + act + '" data-id="' + esc(a.id) + '">' + t(label) + '</button>';
    let btns = '';
    if (a.status === 'booked') btns = B('came', 'Пришёл') + ((paidA || prePaid) ? '' : B('pay', 'Оплата', 'pay')) + B('noshow', 'Не пришёл', 'ghost') + ((paidA || prePaid) ? '' : B('cancel', 'Отменить запись', 'ghost'));
    else if (a.status === 'came' || a.status === 'done') {
      if (a.finished_at) btns = B('reopen', 'Вернуть в очередь', 'ghost') + (a.status === 'done' ? B('pay', 'Изменить оплату', 'ghost pay') : '');
      else btns = (a.room_at ? '' : B('room', 'Вошёл к врачу')) + B('finish', 'Приём завершён', a.room_at ? '' : 'ghost') + (paidA ? (a.status === 'done' ? B('pay', 'Изменить оплату', 'ghost pay') : '') : B('pay', a.pay_status === 'paid' ? 'Доплата' : 'Оплата', 'pay')) + ((a.status === 'came' && !paidA) ? B('cancel', 'Отменить запись', 'ghost') : '');
    } else if (a.status === 'blocked') btns = B('unblock', 'Открыть время');
    // приём завершён: окно только показывает итог, кнопки исправления прячутся за «Исправить» (чтобы не нажать случайно)
    const fixHidden = !!a.finished_at && !sh.fix; if (fixHidden) btns = '';
    if ((a.status === 'booked' || a.status === 'came') && !a.finished_at) btns += B('move', 'Перенести', 'ghost');
    const paidSum = a.status === 'done' ? +a.amount || 0 : a.pay_status === 'paid' ? +a.deposit || 0 : 0;
    if (fixHidden) btns = B('fix-open', 'Исправить', 'ghost'); else if (a.status !== 'blocked' && paidSum > 0 && !(+a.refund_amount > 0)) btns += B('refund', 'Вернуть деньги', 'ghost danger');
    h = '<h2>' + esc(a.status === 'blocked' ? (a.note || t('Закрыто')) : (a.client_name || '—')) + '</h2>' +
      '<ul class="list"><li><div class="li-main"><b>' + t('Врач') + '</b></div><span>' + esc(docName(S, a.doctor_id)) + '</span></li>' +
      '<li><div class="li-main"><b>' + t('Время') + '</b></div><span class="num">' + hhmmOf(a.starts_at) + ' – ' + hhmmOf(a.ends_at) + '</span></li>' +
      '<li><div class="li-main"><b>' + t('Статус') + '</b></div><span>' + t(STATUS[phase(a)]) + '</span></li>' +
      (a.client_phone ? '<li><div class="li-main"><b>' + t('Телефон') + '</b></div><a class="tel" href="tel:' + esc(a.client_phone) + '">' + esc(fmtPhone(a.client_phone)) + '</a></li>' : '') +
      '<li><div class="li-main"><b>' + t('Откуда запись') + '</b></div><span>' + t(a.source === 'site' ? 'Сайт' : a.source === 'bot' ? 'Бот' : 'Ресепшен') + '</span></li>' +
      (a.status === 'done' ? '<li><div class="li-main"><b>' + t('Оплата') + '</b></div><span class="num">' + fmt(a.amount) + ' · ' + t(METHODS.filter((m) => m[0] === a.pay_method)[0] ? METHODS.filter((m) => m[0] === a.pay_method)[0][1] : 'Наличные') + '</span></li>' : '') +
      (a.pay_status && a.pay_status !== 'none' ? '<li><div class="li-main"><b>' + t('Предоплата') + '</b><span class="small muted">' + esc(bsvcName(S, a.bsvc_id)) + '</span></div><span class="num">' + fmt(a.deposit) + ' ' + t('сум') + '</span></li>' + '<li><div class="li-main"><b>' + t('Состояние оплаты') + '</b></div>' + payChip(a) + '</li>' : '') +
      (+a.refund_amount > 0 ? '<li><div class="li-main"><b>↩ ' + t('Возврат денег') + '</b><span class="small muted">' + t(METHODS.filter((m) => m[0] === a.refund_method)[0] ? METHODS.filter((m) => m[0] === a.refund_method)[0][1] : 'Наличные') + (a.refund_note ? ' · ' + esc(a.refund_note) : '') + '</span></div><span class="num">−' + fmt(a.refund_amount) + '</span></li>' : '') +
      (a.note && a.status !== 'blocked' ? '<li><div class="li-main"><b>' + t('Комментарий') + '</b></div><span>' + esc(a.note) + '</span></li>' : '') + '</ul>' +
      (a.status === 'booked' && (a.pay_status === 'pending' || a.pay_status === 'rejected') ? '<p class="note">' + t('Клиент ещё не оплатил. Если оплата не придёт до {h}, бронь снимется сама.', { h: a.hold_until ? hhmmOf(a.hold_until) : '—' }) + '</p>' : '') +
      (a.status === 'booked' && a.pay_status === 'paid' ? '<p class="note">' + t('Предоплата подтверждена. Она входит в стоимость услуги: при оплате на приёме укажите полную сумму.') + '</p>' : '') +
      '<div class="row">' + (a.pay_status === 'review' ? '<button class="btn pay" data-act="rc-open" data-id="' + esc(a.id) + '">' + t('Проверить чек') + '</button>' : '') + ((a.pay_status === 'pending' || a.pay_status === 'rejected') && a.status === 'booked' ? '<button class="btn ghost" data-act="pp-waive" data-id="' + esc(a.id) + '">' + t('Принять без предоплаты') + '</button>' : '') + btns + '</div>';
  } else if (sh.k === 'refund') {
    const a = anyAppt(S, sh.id); if (!a) return '';
    const paidSum = a.status === 'done' ? +a.amount || 0 : +a.deposit || 0, canCancel = (a.status === 'booked' || a.status === 'came') && !a.finished_at;
    h = '<h2>↩ ' + t('Вернуть деньги') + '</h2><p class="small muted">' + esc(a.client_name || '') + ' · ' + hhmmOf(a.starts_at) + ' · ' + t('Оплачено: {n} сум', { n: fmt(paidSum) }) + '</p>' +
      fld(t('Сумма возврата, сум'), '<input id="f-amount" type="text" inputmode="numeric" class="n" data-f="amount" data-kind="money" value="' + esc(f.amount || '') + '" placeholder="0">') +
      fld(t('Как вернули'), '<div class="seg three">' + METHODS.map((m) => '<button type="button" data-act="pay-m" data-id="' + m[0] + '" aria-pressed="' + ((f.method || 'card') === m[0]) + '">' + t(m[1]) + '</button>').join('') + '</div>') +
      field(t('Причина (необязательно)'), 'note', f.note, 'autocomplete="off"') +
      (canCancel ? '<div class="fld"><button type="button" class="chk' + (f.cancel ? ' on' : '') + '" data-act="rf-cancel" aria-pressed="' + !!f.cancel + '"><span class="box">' + (f.cancel ? '✓' : '') + '</span>' + t('Отменить запись, освободить время') + '</button></div>' : '') +
      '<div class="row payrow"><button class="btn danger solid" data-act="save-refund"' + (sh.busy ? ' disabled' : '') + '>' + t('Вернуть деньги') + '</button></div>';
  } else if (sh.k === 'pay' || sh.k === 'walkin') {
    const who = sh.k === 'walkin' ? '<h2>' + t('Приём без записи') + '</h2>' + fld(t('Врач'), sel('f-doctor', S.doctors.filter((d) => d.active).map((d) => [d.id, d.name]), f.doctorId || '', 'data-f="doctorId"')) + field(t('Имя клиента'), 'name', f.name, 'autocomplete="off"') + field(t('Телефон'), 'phone', f.phone, 'inputmode="tel" autocomplete="off" placeholder="+998"')
      : '<h2>' + t('Оплата') + '</h2><p class="small muted">' + esc((S.appts.filter((x) => x.id === sh.id)[0] || {}).client_name || '') + '</p>' + (((S.appts.filter((x) => x.id === sh.id)[0] || {}).pay_status === 'paid') ? '<p class="note">💳 ' + t('Клиент уже внёс предоплату {n} сум на карту. Она входит в стоимость: укажите полную сумму услуги.', { n: fmt((S.appts.filter((x) => x.id === sh.id)[0] || {}).deposit) }) + '</p>' : '');
    h = who + fld(t('Услуга'), sel('f-service', svcOpts, f.serviceId || '', 'data-f="serviceId"')) +
      fld(t('Сумма, сум'), '<input id="f-amount" type="text" inputmode="numeric" class="n" data-f="amount" data-kind="money" value="' + esc(f.amount || '') + '" placeholder="0">') +
      fld(t('Способ оплаты'), '<div class="seg three">' + METHODS.map((m) => '<button type="button" data-act="pay-m" data-id="' + m[0] + '" aria-pressed="' + ((f.method || 'cash') === m[0]) + '">' + t(m[1]) + '</button>').join('') + '</div>') +
      field(t('Номер фискального чека (необязательно)'), 'checkNo', f.checkNo, 'autocomplete="off"') +
      '<div class="row payrow"><button class="btn pay" data-act="save-pay">' + t('Принять оплату') + '</button></div>';
  } else if (sh.k === 'client' || sh.k === 'newclient') {
    const c = sh.k === 'client' ? S.clients.filter((x) => x.id === sh.id)[0] : null;
    h = '<h2>' + (c ? esc(c.name) : t('Новый клиент')) + '</h2>' + field(t('Имя клиента'), 'name', f.name, 'autocomplete="off"') + field(t('Телефон'), 'phone', f.phone, 'inputmode="tel" autocomplete="off" placeholder="+998"') + field(t('Комментарий'), 'note', f.note, 'autocomplete="off"') +
      '<div class="row"><button class="btn" data-act="save-client">' + t('Сохранить') + '</button></div>';
    if (c) {
      const hist = S.hist || [];
      let paid = 0, n = 0, lastV = ''; hist.forEach((a) => { if (a.status === 'done') { n++; paid += +a.amount; } if (a.finished_at && a.starts_at > lastV) lastV = a.starts_at; });
      h += '<h2>' + t('История') + '</h2><p class="small muted">' + t('Приёмов: {n}, оплачено: {s}', { n: n, s: money(paid) }) + '</p>' +
        (lastV ? '<p class="small muted">' + t('Последний визит') + ': ' + fmtDate(hhmmDate(lastV)) + '</p>' : '') +
        (hist.length ? '<ul class="list">' + hist.slice(0, 30).map((a) => '<li><div class="li-main"><b>' + fmtDate(hhmmDate(a.starts_at)) + ' ' + hhmmOf(a.starts_at) + '</b><span class="small muted">' + esc(docName(S, a.doctor_id)) + ' · ' + t(STATUS[a.status]) + '</span><span class="small muted">📞 ' + esc(fmtPhone(a.client_phone || '') || '—') + ' · ' + t(a.source === 'site' ? 'Сайт' : a.source === 'bot' ? 'Бот' : 'Ресепшен') + '</span></div>' + (a.status === 'done' ? '<span class="num">' + fmt(a.amount) + '</span>' : '') + '</li>').join('') + '</ul>' : '<p class="empty">' + t('Приёмов ещё не было.') + '</p>');
    }
  }
  return '<div class="sheet" data-sheet><div class="sheet-card" role="dialog" aria-modal="true">' + close + h + '</div></div>';
}
// Предоплата в клетке очереди: чем бронь отличается от обычной (класс, подпись)
const ppTag = (a) => a.status !== 'booked' ? null : a.pay_status === 'paid' ? ['pp-paid', '💳 ' + t('предоплата')] : a.pay_status === 'review' ? ['pp-wait', '🧾 ' + t('чек')] : a.pay_status === 'pending' ? ['pp-wait', '⏳ ' + t('ждёт оплату')] : a.pay_status === 'rejected' ? ['pp-wait', '⚠ ' + t('чек не принят')] : null;
const anyAppt = (S, id) => (S.online || []).concat(S.appts || [], S.refundReqs || []).filter((x) => x.id === id)[0];
const bsvcName = (S, id) => { const x = (S.bsvc || []).filter((b) => b.id === id)[0]; return x ? (getLang() === 'ru' ? x.name_ru : (x.name_uz || x.name_ru)) : ''; };
function hhmmDate(iso) { return new Date(Date.parse(iso) + 5 * 3600 * 1000).toISOString().slice(0, 10); }

const PAYCHIP = { pending: ['ждёт оплату', 'warn'], review: ['чек на проверке', 'warn'], rejected: ['чек не принят', 'bad'], paid: ['оплачено вперёд', 'ok'] };
const payChip = (a) => { const c = PAYCHIP[a.pay_status]; return c ? '<span class="chip ' + c[1] + '">' + t(c[0]) + (a.pay_status === 'paid' ? ' ' + fmt(a.deposit) : a.pay_status === 'pending' && a.hold_until ? ' ' + t('до {h}', { h: hhmmOf(a.hold_until) }) : '') + '</span>' : ''; };
// Чеки, которые клиенты уже отправили и ждут решения сотрудника
function receiptsBlock(S) {
  const list = (S.online || []).filter((a) => a.pay_status === 'review'); if (!list.length) return '';
  return '<section class="rcpt"><h2>🧾 ' + t('Чеки на проверке') + ' <span class="chip warn">' + list.length + '</span></h2><ul class="list">' + list.map((a) => {
    const day = hhmmDate(a.starts_at);
    return '<li><div class="li-main"><b>' + esc(a.client_name || '—') + '</b><span class="small muted">' + esc(dayLabel(day)) + ' · ' + hhmmOf(a.starts_at) + ' · ' + esc(docName(S, a.doctor_id)) + ' · ' + fmt(a.deposit) + ' ' + t('сум') + '</span></div><button class="btn" data-act="rc-open" data-id="' + esc(a.id) + '">' + t('Проверить чек') + '</button></li>';
  }).join('') + '</ul></section>';
}

// Записи, сделанные клиентами на сайте и в боте (ближайшие), независимо от выбранного дня
function onlineList(S) {
  const list = (S.online || []).filter((a) => !isHold(a));
  return '<section><h2>' + t('Онлайн-записи (сайт и бот)') + '</h2>' + (list.length ? '<ul class="list">' + list.slice(0, 30).map((a) => {
    const day = new Date(Date.parse(a.starts_at) + 5 * 3600e3).toISOString().slice(0, 10);
    return '<li><div class="li-main"><b>' + esc(a.client_name || '—') + '</b><span class="small muted">' + esc(dayLabel(day)) + ' · ' + hhmmOf(a.starts_at) + ' · ' + esc(docName(S, a.doctor_id)) + ' · ' + t(a.source === 'bot' ? 'бот' : 'сайт') + '</span>' + payChip(a) + '</div><button class="btn ghost" data-act="goto-day" data-day="' + day + '">' + t('Открыть день') + '</button></li>';
  }).join('') + '</ul>' : '<p class="empty">' + t('Нет онлайн-записей.') + '</p>') + '</section>';
}

function moveBar(S) {
  if (!S.moving) return '';
  const a = (S.appts || []).concat(S.online || []).filter((x) => x.id === S.moving.id)[0];
  return '<div class="movebar" role="status"><span>' + t('Куда перенести: {n}? Выберите свободное время в таблице (можно перейти на другой день).', { n: esc(a ? a.client_name || '—' : '') }) + '</span><button type="button" class="btn ghost" data-act="move-cancel">' + t('Отмена') + '</button></div>';
}
export function vView(S) {
  const tab = S.tab;
  return tab === 'queue' ? moveBar(S) + receiptsBlock(S) + '<section><h2>' + t('Очередь на приём') + '</h2>' + queue(S) + '</section>' + onlineList(S) : tab === 'clients' ? clients(S) : tab === 'cash' ? cash(S) : tab === 'report' ? report(S) : settings(S);
}
export { addDays };
