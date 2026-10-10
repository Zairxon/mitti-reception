import { describe, it, expect } from 'vitest';
import { isoAt, hhmmOf, dateOf, addDays, isoDow, slotsOf, maskHM, validHM } from '../src/time.js';

describe('время клиники (Ташкент, UTC+5)', () => {
  it('переводит между ташкентским временем и ISO', () => {
    expect(isoAt('2026-10-12', '10:15')).toBe('2026-10-12T10:15:00+05:00');
    expect(hhmmOf('2026-10-12T05:15:00Z')).toBe('10:15');
    expect(dateOf('2026-10-11T20:30:00Z')).toBe('2026-10-12');
  });
  it('дни недели с понедельника и сдвиг даты', () => {
    expect(isoDow('2026-10-12')).toBe(1);
    expect(isoDow('2026-10-18')).toBe(7);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('строит сетку по настройкам', () => {
    const s = slotsOf({ work_start: '09:00:00', work_end: '18:00:00', slot_minutes: 15 });
    expect(s).toHaveLength(36);
    expect(s[0]).toBe('09:00');
    expect(s[35]).toBe('17:45');
    expect(slotsOf({ work_start: '09:00', work_end: '10:00', slot_minutes: 20 })).toEqual(['09:00', '09:20', '09:40']);
    expect(slotsOf({ work_start: '09:00', work_end: '09:10', slot_minutes: 15 })).toEqual([]);
  });
  it('маска и проверка чч:мм', () => {
    expect(maskHM('0930')).toBe('09:30');
    expect(maskHM('9')).toBe('9');
    expect(validHM('09:30')).toBe(true);
    expect(validHM('24:00')).toBe(false);
    expect(validHM('9:30')).toBe(false);
  });
});
