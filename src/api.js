// Работа с базой (Supabase). Права и защита от двойной записи заданы в самой базе.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { t } from './i18n.js';
import { isoAt, addDays, dayEnd } from './time.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

function fail(error) {
  const code = error && error.code, msg = String((error && error.message) || error || '');
  if (code === '23P01' || /appointments_no_overlap|slot_taken/.test(msg)) throw new Error(t('Это время уже занято'));
  if (/Invalid login credentials/i.test(msg)) throw new Error(t('Неверная почта или пароль.'));
  if (/Email not confirmed/i.test(msg)) throw new Error(t('Почта не подтверждена: откройте письмо от сервиса и перейдите по ссылке.'));
  if (/already registered|already been registered/i.test(msg)) throw new Error(t('Такая почта уже зарегистрирована. Нажмите «Войти».'));
  if (/Password should be/i.test(msg)) throw new Error(t('Пароль слишком простой: нужно не меньше 8 символов.'));
  if (code === '23503' || /foreign key|violates foreign/i.test(msg)) throw new Error(t('У врача есть записи. Скройте его кнопкой «Не принимает».'));
  if (/user_not_found/.test(msg)) throw new Error(t('Пользователь с такой почтой не найден: пусть сначала создаст аккаунт.'));
  if (/rate limit/i.test(msg)) throw new Error(t('Слишком много попыток. Подождите немного.'));
  if (/fetch|network|Failed/i.test(msg)) throw new Error(t('Нет связи с сервером.'));
  throw new Error(msg || t('Ошибка'));
}
const ok = (r) => { if (r.error) fail(r.error); return r.data; };

/* вход */
export async function getUser() { try { const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; } catch (e) { return null; } }
export function onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s ? s.user : null)); }
export async function signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) fail(error); }
export async function signUp(email, password) { const { data, error } = await sb.auth.signUp({ email, password }); if (error) fail(error); return !!data.session; }
export async function signOut() { await sb.auth.signOut(); }

/* роль: первый вход владельца закрепляется функцией claim_owner */
export async function loadRole() {
  let r = ok(await sb.rpc('my_role'));
  if (!r) r = ok(await sb.rpc('claim_owner'));
  return r || null;
}

export async function loadBase() {
  const [st, docs, svc, bsv] = await Promise.all([
    sb.from('clinic_settings').select('*').eq('id', 1).single(),
    sb.from('doctors').select('*').order('sort').order('name'),
    sb.from('services').select('*').order('sort').order('name'),
    sb.from('booking_services').select('id,name_ru,name_uz,price').order('sort'),
  ]);
  return { settings: ok(st), doctors: ok(docs), services: ok(svc), bsvc: bsv.error ? [] : bsv.data };
}

export async function loadDay(date) {
  return ok(await sb.from('appointments').select('*').gte('starts_at', isoAt(date, '00:00')).lt('starts_at', dayEnd(date)).order('starts_at'));
}
export async function loadClients() { return ok(await sb.from('clients').select('*').order('created_at', { ascending: false }).limit(1000)); }
export async function loadClientHistory(id) { return ok(await sb.from('appointments').select('*').eq('client_id', id).order('starts_at', { ascending: false }).limit(200)); }

export async function addClient(row) { return ok(await sb.from('clients').insert(row).select().single()); }
export async function updateClient(id, patch) { return ok(await sb.from('clients').update(patch).eq('id', id).select().single()); }
export async function addAppt(row) { return ok(await sb.from('appointments').insert(row).select().single()); }
export async function updateAppt(id, patch) { return ok(await sb.from('appointments').update(patch).eq('id', id).select().single()); }
export async function deleteAppt(id) { ok(await sb.from('appointments').delete().eq('id', id)); }

export async function doctorReport(from, to) { return ok(await sb.rpc('doctor_report', { p_from: from, p_to: to })); }

/* настройки (только владелец) */
export async function saveSettings(patch) { return ok(await sb.from('clinic_settings').update(patch).eq('id', 1).select().single()); }
export async function addDoctor(row) { return ok(await sb.from('doctors').insert(row).select().single()); }
export async function deleteDoctor(id) { ok(await sb.from('doctors').delete().eq('id', id)); }
// Предоплата: освобождаем просроченные брони, смотрим чек, решаем подтвердить или отклонить
export async function expireHolds() { try { await sb.rpc('expire_holds'); } catch (e) { /* не страшно */ } }
export async function receiptUrl(path) { const r = await sb.storage.from('receipts').createSignedUrl(path, 900); return r.error ? '' : r.data.signedUrl; }
export async function decideReceipt(id, okFlag) {
  const { data } = await sb.auth.getSession(); const tok = data.session && data.session.access_token;
  const res = await fetch(SUPABASE_URL + '/functions/v1/telegram-bot?op=decide', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + tok }, body: JSON.stringify({ id, ok: okFlag }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error === 'already' ? t('Уже обработано другим сотрудником') : t('Не удалось сохранить решение'));
}
export async function loadOnline() {
  return ok(await sb.from('appointments').select('*').in('source', ['site', 'bot']).eq('status', 'booked').gte('starts_at', new Date().toISOString()).order('starts_at').limit(60));
}
export async function updateDoctor(id, patch) { return ok(await sb.from('doctors').update(patch).eq('id', id).select().single()); }
export async function addService(row) { return ok(await sb.from('services').insert(row).select().single()); }
export async function updateService(id, patch) { return ok(await sb.from('services').update(patch).eq('id', id).select().single()); }
export async function deleteService(id) { ok(await sb.from('services').delete().eq('id', id)); }
export async function listStaff() { return ok(await sb.rpc('list_staff')); }
export async function addStaff(email) { ok(await sb.rpc('add_staff', { p_email: email, p_role: 'reception' })); }
export async function removeStaff(id) { ok(await sb.rpc('remove_staff', { p_user: id })); }

/* новые записи с сайта и бота приходят сразу */
export function subscribe(cb) {
  return sb.channel('appts-live').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, cb).subscribe();
}
export { addDays };
