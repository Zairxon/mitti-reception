import { describe, it, expect } from 'vitest';
import { fmtPhoneInput, fmtPhone, cleanPhone, localDigits } from '../src/phone.js';

describe('телефон +998 12 123 12 12', () => {
  it('группирует цифры при наборе', () => {
    expect(fmtPhoneInput('9')).toBe('+998 9');
    expect(fmtPhoneInput('901')).toBe('+998 90 1');
    expect(fmtPhoneInput('90123')).toBe('+998 90 123');
    expect(fmtPhoneInput('9012345')).toBe('+998 90 123 45');
    expect(fmtPhoneInput('901234567')).toBe('+998 90 123 45 67');
  });
  it('понимает вставку с кодом страны и лишними знаками', () => {
    expect(fmtPhoneInput('+998901234567')).toBe('+998 90 123 45 67');
    expect(fmtPhoneInput('998 (90) 123-45-67')).toBe('+998 90 123 45 67');
    expect(fmtPhoneInput('+998 90 123 45 67 89')).toBe('+998 90 123 45 67');
  });
  it('+998 можно стереть, а при фокусе он ставится сам', () => {
    expect(fmtPhoneInput('+998', true)).toBe('');
    expect(fmtPhoneInput('', false)).toBe('');
    expect(fmtPhoneInput('+998', false)).toBe('+998 ');
  });
  it('хранится без пробелов, показывается с пробелами', () => {
    expect(cleanPhone('+998 90 123 45 67')).toBe('+998901234567');
    expect(cleanPhone('+998 ')).toBe('');
    expect(fmtPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(fmtPhone('12345')).toBe('12345');
    expect(localDigits('+998 90')).toBe('90');
  });
});
