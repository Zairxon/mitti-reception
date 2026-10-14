// Публичные параметры подключения к Supabase. Ключ «publishable» предназначен для браузера:
// данные защищены правилами доступа в базе (каждый пользователь видит только свои строки).
export const SUPABASE_URL = 'https://fiphqnbvnlbsgoqdewae.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_EyHYtGPAe9ay86lCCW9ONA_VbbsHx4e';

// Адреса приложений клиники: Главный, Ресепшен, Очередь
export const APP_LINKS = {
  main: 'https://mitti-glavniy.vercel.app/',
  reception: 'https://mitti-resepshen.vercel.app/',
  queue: 'https://mitti-navbat.vercel.app/',
  // ссылка из кнопки «Отправить ссылку»: с меткой, чтобы в «Главном» было видно, сколько человек перешло отсюда
  queueShare: 'https://mitti-navbat.vercel.app/?utm_source=ssilkasnavbat&utm_medium=other',
};
