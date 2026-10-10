// Страницы приложения ресепшена и кассира. Тексты идут через t() (русский / узбекский).
import { t, months, weekdays, getLang } from './i18n.js';
import { esc, fmt } from './util.js';
import { fmtDate } from './datepicker.js';
import { todayTz, isoAt, hhmmOf, isoDow, slotsOf, addDays } from './time.js';

export const TABS = [['queue', 'Очередь'], ['clients', 'Клиенты'], ['cash', 'Касса'], ['report', 'Сводка'], ['set', 'Настройки']];
export const BUSY = ['booked', 'came', 'done', 'blocked'];
const STATUS = { booked: 'Записан', came: 'Пришёл', done: 'Оплачено', cancelled: 'Отменён', no_show: 'Не пришёл', blocked: 'Время закрыто' };
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
export function dayLabel(iso) { return weekdays()[isoDow(iso) - 1] + ', ' + +iso.slice(8, 10) + ' ' + lcMonth(iso).toLowerCase() + ' ' + iso.slice(0, 4); }
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
  if (S.tab !== 'queue' && S.tab !== 'cash') return '';
  return '<div class="top"><div class="mnav daynav"><button class="btn ghost sq" data-act="day-prev" aria-label="' + esc(t('Предыдущий день')) + '">‹</button>' +
    '<div class="daymid">' + dateField('day-input', S.day) + '<span class="small muted">' + esc(dayLabel(S.day)) + '</span></div>' +
    '<button class="btn ghost sq" data-act="day-next" aria-label="' + esc(t('Следующий день')) + '">›</button></div>' +
    (S.day !== todayTz() ? '<div class="row"><button class="btn ghost" data-act="day-today">' + t('Сегодня') + '</button></div>' : '') + '</div>';
}
export function vTabs(S) {
  return TABS.map((x) => '<button class="tab" role="tab" data-act="tab" data-id="' + x[0] + '" aria-selected="' + (S.tab === x[0]) + '">' + t(x[1]) + '</button>').join('');
}

/* ---------- очередь ---------- */
function queue(S) {
  const st = S.settings, docs = S.doctors.filter((d) => d.active), rows = slotsOf(st), day = S.day, slot = st.slot_minutes, now = Date.now();
  const off = st.work_days.indexOf(isoDow(day)) < 0;
  const busy = S.appts.filter((a) => BUSY.indexOf(a.status) >= 0);
  if (!docs.length) return '<p class="empty">' + t('Нет активных врачей. Добавьте их в «Настройки».') + '</p>';
  const cols = docs.map((d) => ({ d, a: busy.filter((a) => a.doctor_id === d.id).map((a) => ({ a, s: Date.parse(a.starts_at), e: Date.parse(a.ends_at) })), free: 0, next: '' }));
  let body = '';
  rows.forEach((tm) => {
    const sMs = Date.parse(isoAt(day, tm)), eMs = sMs + slot * 60000;
    body += '<div class="qt">' + tm + '</div>';
    cols.forEach((c) => {
      const hit = c.a.filter((x) => x.s < eMs && x.e > sMs)[0];
      const style = ' style="--c:' + esc(c.d.color) + '"';
      if (!hit) {
        const past = eMs <= now;
        if (!past && !off) { c.free++; if (!c.next) c.next = tm; }
        body += '<button class="slot free' + (past ? ' past' : '') + '"' + style + ' data-act="slot" data-doc="' + esc(c.d.id) + '" data-t="' + tm + '" aria-label="' + esc(c.d.name + ' ' + tm) + '">+</button>';
      } else if (hit.s >= sMs && hit.s < eMs) {
        const a = hit.a, label = a.status === 'blocked' ? (a.note || t('Закрыто')) : (a.client_name || '—');
        body += '<button class="slot st-' + a.status + '"' + style + ' data-act="appt" data-id="' + esc(a.id) + '"><b>' + esc(label) + '</b>' +
          '<small>' + (a.status === 'done' ? '✓ ' + fmt(a.amount) : a.status === 'came' ? '● ' + t('ждёт') : a.status === 'blocked' ? '' : srcTag(a.source)) + '</small></button>';
      } else {
        body += '<span class="slot cont"' + style + '></span>';
      }
    });
  });
  const sums = cols.map((c) => '<span><i style="--c:' + esc(c.d.color) + '"></i><b>' + esc(c.d.name) + '</b> · ' + t('свободно: {n}', { n: c.free }) + (c.next ? ' · ' + t('ближайшее {t}', { t: c.next }) : '') + '</span>').join('');
  return (off ? '<p class="alert">' + t('Выходной день по настройкам. Записаться можно только вручную.') + '</p>' : '') +
    '<div class="qsum">' + sums + '</div>' +
    '<div class="qlegend"><span class="lg st-booked">' + t('Записан') + '</span><span class="lg st-came">' + t('Пришёл') + '</span><span class="lg st-done">' + t('Оплачено') + '</span><span class="lg st-blocked">' + t('Закрыто') + '</span></div>' +
    '<div class="qgrid" style="grid-template-columns:40px repeat(' + cols.length + ',minmax(0,1fr))"><div></div>' +
    cols.map((c) => '<div class="qh"><i style="--c:' + esc(c.d.color) + '"></i>' + esc(c.d.name) + '</div>').join('') + body + '</div>' +
    '<p class="note">' + t('Нажмите на свободную клетку, чтобы записать клиента. Занятое время записать нельзя: это защищено в базе, в том числе для сайта и бота.') + '</p>';
}

/* ---------- клиенты ---------- */
export function clientList(S) {
  const q = (S.cq || '').trim().toLowerCase(), qd = q.replace(/\D/g, '');
  const list = S.clients.filter((c) => !q || (c.name || '').toLowerCase().indexOf(q) >= 0 || (qd && (c.phone || '').replace(/\D/g, '').indexOf(qd) >= 0)).slice(0, 80);
  if (!list.length) return '<p class="empty">' + t('Клиентов не найдено.') + '</p>';
  return '<ul class="list">' + list.map((c) => '<li><div class="li-main"><b>' + esc(c.name) + '</b><span class="small muted">' + esc(c.phone || '') + (c.source !== 'reception' ? ' · ' + t(c.source === 'site' ? 'сайт' : 'бот') : '') + '</span></div><button class="btn ghost" data-act="client" data-id="' + esc(c.id) + '">' + t('Открыть') + '</button></li>').join('') + '</ul>';
}
function clients(S) {
  return '<section><h2>' + t('Клиенты') + '</h2>' +
    '<div class="panel">' + fld(t('Поиск по имени или телефону'), '<input id="cq" type="text" data-f="cq" value="' + esc(S.cq || '') + '" autocomplete="off">') +
    '<div class="row"><button class="btn" data-act="new-client">' + t('Новый клиент') + '</button></div></div>' +
    '<div id="clist">' + clientList(S) + '</div></section>';
}

/* ---------- касса ---------- */
function cash(S) {
  const day = S.appts.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show' && a.status !== 'blocked');
  const waiting = day.filter((a) => a.status === 'came'), expected = day.filter((a) => a.status === 'booked'), paid = day.filter((a) => a.status === 'done');
  const by = { cash: 0, card: 0, transfer: 0 }; let total = 0;
  paid.forEach((a) => { total += +a.amount; if (by[a.pay_method] !== undefined) by[a.pay_method] += +a.amount; });
  const row = (a, btns) => '<li><div class="li-main"><b>' + esc(a.client_name || '—') + '</b><span class="small muted">' + hhmmOf(a.starts_at) + ' · ' + esc(docName(S, a.doctor_id)) + (a.status === 'done' ? ' · ' + t(METHODS.filter((m) => m[0] === a.pay_method)[0] ? METHODS.filter((m) => m[0] === a.pay_method)[0][1] : 'Наличные') : '') + '</span></div>' +
    (a.status === 'done' ? '<span class="num pos">' + fmt(a.amount) + '</span>' : '') + btns + '</li>';
  return '<section><h2>' + t('Касса за день') + '</h2>' +
    '<div class="kpis"><div class="kpi"><span>' + t('Принято клиентов') + '</span><b>' + paid.length + '</b></div><div class="kpi"><span>' + t('Сумма') + '</span><b>' + fmt(total) + '</b></div>' +
    '<div class="kpi"><span>' + t('Наличные') + '</span><b>' + fmt(by.cash) + '</b></div><div class="kpi"><span>' + t('Карта и перевод') + '</span><b>' + fmt(by.card + by.transfer) + '</b></div></div>' +
    '<div class="row"><button class="btn" data-act="walkin">' + t('Приём без записи') + '</button></div></section>' +
    '<section><h2>' + t('Ждут оплаты') + '</h2>' + (waiting.length ? '<ul class="list">' + waiting.map((a) => row(a, '<button class="btn" data-act="pay" data-id="' + esc(a.id) + '">' + t('Оплата') + '</button>')).join('') + '</ul>' : '<p class="empty">' + t('Никто не ждёт оплаты.') + '</p>') + '</section>' +
    '<section><h2>' + t('Записаны, ещё не пришли') + '</h2>' + (expected.length ? '<ul class="list">' + expected.map((a) => row(a, '<button class="btn ghost" data-act="came" data-id="' + esc(a.id) + '">' + t('Пришёл') + '</button>')).join('') + '</ul>' : '<p class="empty">' + t('Нет записанных.') + '</p>') + '</section>' +
    '<section><h2>' + t('Оплачено') + '</h2>' + (paid.length ? '<ul class="list">' + paid.map((a) => row(a, '<button class="btn ghost" data-act="pay" data-id="' + esc(a.id) + '">' + t('Изменить') + '</button>')).join('') + '</ul>' : '<p class="empty">' + t('Оплат пока нет.') + '</p>') + '</section>';
}

/* ---------- сводка по врачам ---------- */
function report(S) {
  const r = S.rep, rows = r.rows;
  let h = '<section><h2>' + t('Сколько клиентов принял каждый врач') + '</h2><div class="panel">' +
    '<div class="pills">' + [['today', 'Сегодня'], ['week', '7 дней'], ['month', 'Месяц'], ['custom', 'Период']].map((x) => pill('rep-preset', x[0], r.preset === x[0], t(x[1]))).join('') + '</div>' +
    '<div class="grid">' + fld(t('С'), dateField('rep-from', r.from)) + fld(t('По'), dateField('rep-to', r.to)) + '</div></div>';
  if (!rows) return h + '<p class="empty">' + t('Загрузка…') + '</p></section>';
  let tc = 0, tt = 0;
  rows.forEach((x) => { tc += +x.clients; tt += +x.total; });
  h += '<div class="scroll"><table><thead><tr><th>' + t('Врач') + '</th><th>' + t('Клиентов') + '</th><th>' + t('Сумма') + '</th></tr></thead><tbody>' +
    rows.map((x) => '<tr><td class="lbl">' + esc(x.doctor_name) + '<br><span class="small muted">' + t('Нал.') + ' ' + fmt(x.cash) + ' · ' + t('Карта') + ' ' + fmt(x.card) + ' · ' + t('Перев.') + ' ' + fmt(x.transfer) + '</span></td><td class="num">' + x.clients + '</td><td class="num">' + fmt(x.total) + '</td></tr>').join('') +
    '<tr class="sum"><td>' + t('Итого') + '</td><td class="num">' + tc + '</td><td class="num">' + fmt(tt) + '</td></tr></tbody></table></div>' +
    '<p class="note">' + t('Считаются клиенты со статусом «Оплачено». Процент врачей настраивается в приложении «Митти юракча».') + '</p></section>';
  return h;
}

/* ---------- настройки ---------- */
function settings(S) {
  const st = S.settings, own = S.role === 'owner';
  const look = '<section><h2>' + t('Язык и тема') + '</h2><div class="panel">' +
    fld(t('Язык'), '<div class="seg"><button type="button" data-act="lang-set" data-id="ru" aria-pressed="' + (getLang() === 'ru') + '">Русский</button><button type="button" data-act="lang-set" data-id="uz" aria-pressed="' + (getLang() === 'uz') + '">Ўзбекча</button></div>') +
    fld(t('Тема'), '<div class="seg three">' + [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']].map((x) => '<button type="button" data-act="theme-set" data-id="' + x[0] + '" aria-pressed="' + (S.theme === x[0]) + '">' + t(x[1]) + '</button>').join('') + '</div>') +
    '</div></section>';
  const account = '<section><h2>' + t('Аккаунт') + '</h2><div class="panel"><p>' + t('Вы вошли как {e}.', { e: '<b>' + esc(S.user.email || '') + '</b>' }) + ' ' + (own ? t('Роль: владелец.') : t('Роль: ресепшен.')) + '</p><div class="row"><button class="btn ghost" data-act="logout">' + t('Выйти') + '</button></div></div></section>';
  if (!own) return look + account + '<p class="note">' + t('Остальные настройки доступны только владельцу.') + '</p>';
  const days = [1, 2, 3, 4, 5, 6, 7].map((n) => pill('wd', n, st.work_days.indexOf(n) >= 0, weekdays()[n - 1])).join('');
  const clinic = '<section><h2>' + t('Приём') + '</h2><div class="panel"><div class="grid">' +
    fld(t('Длительность записи, минут'), '<input type="text" inputmode="numeric" class="n" data-s="slot_minutes" data-kind="int" value="' + st.slot_minutes + '">') +
    fld(t('Записывать вперёд, дней'), '<input type="text" inputmode="numeric" class="n" data-s="days_ahead" data-kind="int" value="' + st.days_ahead + '">') +
    fld(t('Начало работы'), '<input type="text" inputmode="numeric" class="n" data-s="work_start" data-kind="hm" maxlength="5" value="' + esc(String(st.work_start).slice(0, 5)) + '">') +
    fld(t('Конец работы'), '<input type="text" inputmode="numeric" class="n" data-s="work_end" data-kind="hm" maxlength="5" value="' + esc(String(st.work_end).slice(0, 5)) + '">') +
    '</div>' + fld(t('Рабочие дни'), '<div class="pills">' + days + '</div>') + '</div>' +
    '<p class="note">' + t('Эти настройки действуют и для сайта, и для бота: клиенты увидят только свободное время в рабочие часы.') + '</p></section>';
  const doctors = '<section><h2>' + t('Врачи') + '</h2><div class="panel">' + S.doctors.map((d) =>
    '<div class="rowline"><input type="text" data-doc-name="' + esc(d.id) + '" value="' + esc(d.name) + '">' + pill('doc-active', d.id, d.active, d.active ? t('Принимает') : t('Не принимает')) + '</div>').join('') +
    '<div class="row"><button class="btn ghost" data-act="add-doctor">' + t('Добавить врача') + '</button></div></div></section>';
  const services = '<section><h2>' + t('Услуги и цены') + '</h2><div class="panel">' + (S.services.length ? S.services.map((s) =>
    '<div class="rowline"><input type="text" data-svc-name="' + esc(s.id) + '" value="' + esc(s.name) + '"><input type="text" inputmode="numeric" class="n" data-svc-price="' + esc(s.id) + '" data-kind="money" value="' + (s.price ? fmt(s.price) : '') + '" placeholder="0"><button class="btn del" data-act="del-svc" data-id="' + esc(s.id) + '" aria-label="' + esc(t('Удалить')) + '">×</button></div>').join('') : '<p class="empty">' + t('Услуг пока нет. Добавьте виды УЗИ и цены, чтобы кассир выбирал их в один клик.') + '</p>') +
    '<div class="row"><button class="btn ghost" data-act="add-svc">' + t('Добавить услугу') + '</button></div></div></section>';
  const staff = '<section><h2>' + t('Сотрудники') + '</h2><div class="panel">' + (S.staff || []).map((u) =>
    '<div class="rowline"><span class="grow">' + esc(u.email) + ' <span class="chip">' + (u.role === 'owner' ? t('владелец') : t('ресепшен')) + '</span></span>' + (u.user_id !== S.user.id ? '<button class="btn del" data-act="del-staff" data-id="' + esc(u.user_id) + '" aria-label="' + esc(t('Удалить')) + '">×</button>' : '') + '</div>').join('') +
    fld(t('Почта нового сотрудника'), '<input id="staff-email" type="email" inputmode="email" data-f="newStaff" value="' + esc(S.newStaff || '') + '">') +
    '<div class="row"><button class="btn" data-act="add-staff">' + t('Дать доступ ресепшену') + '</button></div></div>' +
    '<p class="note">' + t('Сотрудник сначала сам создаёт аккаунт в этом приложении, потом вы добавляете его почту.') + '</p></section>';
  return look + clinic + doctors + services + staff + account;
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
      '<div class="row"><button class="btn" data-act="save-new">' + t('Записать') + '</button><button class="btn ghost" data-act="save-block">' + t('Закрыть время') + '</button></div>';
  } else if (sh.k === 'appt') {
    const a = S.appts.filter((x) => x.id === sh.id)[0]; if (!a) return '';
    const btns = a.status === 'booked' ? '<button class="btn" data-act="came" data-id="' + esc(a.id) + '">' + t('Пришёл') + '</button><button class="btn" data-act="pay" data-id="' + esc(a.id) + '">' + t('Оплата') + '</button><button class="btn ghost" data-act="noshow" data-id="' + esc(a.id) + '">' + t('Не пришёл') + '</button><button class="btn ghost" data-act="cancel" data-id="' + esc(a.id) + '">' + t('Отменить запись') + '</button>'
      : a.status === 'came' ? '<button class="btn" data-act="pay" data-id="' + esc(a.id) + '">' + t('Оплата') + '</button><button class="btn ghost" data-act="cancel" data-id="' + esc(a.id) + '">' + t('Отменить запись') + '</button>'
      : a.status === 'done' ? '<button class="btn ghost" data-act="pay" data-id="' + esc(a.id) + '">' + t('Изменить оплату') + '</button>'
      : a.status === 'blocked' ? '<button class="btn" data-act="unblock" data-id="' + esc(a.id) + '">' + t('Открыть время') + '</button>' : '';
    h = '<h2>' + esc(a.status === 'blocked' ? (a.note || t('Закрыто')) : (a.client_name || '—')) + '</h2>' +
      '<ul class="list"><li><div class="li-main"><b>' + t('Врач') + '</b></div><span>' + esc(docName(S, a.doctor_id)) + '</span></li>' +
      '<li><div class="li-main"><b>' + t('Время') + '</b></div><span class="num">' + hhmmOf(a.starts_at) + ' – ' + hhmmOf(a.ends_at) + '</span></li>' +
      '<li><div class="li-main"><b>' + t('Статус') + '</b></div><span>' + t(STATUS[a.status]) + '</span></li>' +
      (a.client_phone ? '<li><div class="li-main"><b>' + t('Телефон') + '</b></div><a class="tel" href="tel:' + esc(a.client_phone) + '">' + esc(a.client_phone) + '</a></li>' : '') +
      '<li><div class="li-main"><b>' + t('Откуда запись') + '</b></div><span>' + t(a.source === 'site' ? 'Сайт' : a.source === 'bot' ? 'Бот' : 'Ресепшен') + '</span></li>' +
      (a.status === 'done' ? '<li><div class="li-main"><b>' + t('Оплата') + '</b></div><span class="num">' + fmt(a.amount) + ' · ' + t(METHODS.filter((m) => m[0] === a.pay_method)[0] ? METHODS.filter((m) => m[0] === a.pay_method)[0][1] : 'Наличные') + '</span></li>' : '') +
      (a.note && a.status !== 'blocked' ? '<li><div class="li-main"><b>' + t('Комментарий') + '</b></div><span>' + esc(a.note) + '</span></li>' : '') + '</ul>' +
      '<div class="row">' + btns + '</div>';
  } else if (sh.k === 'pay' || sh.k === 'walkin') {
    const who = sh.k === 'walkin' ? '<h2>' + t('Приём без записи') + '</h2>' + fld(t('Врач'), sel('f-doctor', S.doctors.filter((d) => d.active).map((d) => [d.id, d.name]), f.doctorId || '', 'data-f="doctorId"')) + field(t('Имя клиента'), 'name', f.name, 'autocomplete="off"') + field(t('Телефон'), 'phone', f.phone, 'inputmode="tel" autocomplete="off" placeholder="+998"')
      : '<h2>' + t('Оплата') + '</h2><p class="small muted">' + esc((S.appts.filter((x) => x.id === sh.id)[0] || {}).client_name || '') + '</p>';
    h = who + fld(t('Услуга'), sel('f-service', svcOpts, f.serviceId || '', 'data-f="serviceId"')) +
      fld(t('Сумма, сум'), '<input id="f-amount" type="text" inputmode="numeric" class="n" data-f="amount" data-kind="money" value="' + esc(f.amount || '') + '" placeholder="0">') +
      fld(t('Способ оплаты'), '<div class="seg three">' + METHODS.map((m) => '<button type="button" data-act="pay-m" data-id="' + m[0] + '" aria-pressed="' + ((f.method || 'cash') === m[0]) + '">' + t(m[1]) + '</button>').join('') + '</div>') +
      '<div class="row"><button class="btn" data-act="save-pay">' + t('Принять оплату') + '</button></div>';
  } else if (sh.k === 'client' || sh.k === 'newclient') {
    const c = sh.k === 'client' ? S.clients.filter((x) => x.id === sh.id)[0] : null;
    h = '<h2>' + (c ? esc(c.name) : t('Новый клиент')) + '</h2>' + field(t('Имя клиента'), 'name', f.name, 'autocomplete="off"') + field(t('Телефон'), 'phone', f.phone, 'inputmode="tel" autocomplete="off" placeholder="+998"') + field(t('Комментарий'), 'note', f.note, 'autocomplete="off"') +
      '<div class="row"><button class="btn" data-act="save-client">' + t('Сохранить') + '</button></div>';
    if (c) {
      const hist = S.hist || [];
      let paid = 0, n = 0; hist.forEach((a) => { if (a.status === 'done') { n++; paid += +a.amount; } });
      h += '<h2>' + t('История') + '</h2><p class="small muted">' + t('Приёмов: {n}, оплачено: {s}', { n: n, s: money(paid) }) + '</p>' +
        (hist.length ? '<ul class="list">' + hist.slice(0, 30).map((a) => '<li><div class="li-main"><b>' + fmtDate(hhmmDate(a.starts_at)) + ' ' + hhmmOf(a.starts_at) + '</b><span class="small muted">' + esc(docName(S, a.doctor_id)) + ' · ' + t(STATUS[a.status]) + '</span></div>' + (a.status === 'done' ? '<span class="num">' + fmt(a.amount) + '</span>' : '') + '</li>').join('') + '</ul>' : '<p class="empty">' + t('Приёмов ещё не было.') + '</p>');
    }
  }
  return '<div class="sheet" data-sheet><div class="sheet-card" role="dialog" aria-modal="true">' + close + h + '</div></div>';
}
function hhmmDate(iso) { return new Date(Date.parse(iso) + 5 * 3600 * 1000).toISOString().slice(0, 10); }

export function vView(S) {
  const tab = S.tab;
  return tab === 'queue' ? '<section><h2>' + t('Очередь на приём') + '</h2>' + queue(S) + '</section>' : tab === 'clients' ? clients(S) : tab === 'cash' ? cash(S) : tab === 'report' ? report(S) : settings(S);
}
export { addDays };
