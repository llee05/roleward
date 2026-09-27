import { afterEach, expect, test, vi } from 'vitest';
import { getTheme, type Theme } from '../domain/theme';
import { db } from './local-database';
import { saveTheme } from './preferences';

afterEach(async () => {
  vi.restoreAllMocks();
  await db.settings.clear();
});

test('theme survives reopening without overwriting other settings', async () => {
  const sync = {
    key: 'lastSync:gmail:test@example.com',
    value: '2026-09-28T00:00:00Z',
  };
  await db.settings.put(sync);
  await saveTheme('dark');
  db.close();
  await db.open();
  expect(getTheme(await db.settings.toArray())).toBe('dark');
  expect(await db.settings.get(sync.key)).toEqual(sync);
  await saveTheme('light');
  expect(getTheme(await db.settings.toArray())).toBe('light');
});

test('invalid or failed writes preserve the saved theme', async () => {
  await saveTheme('dark');
  await expect(saveTheme('invalid' as Theme)).rejects.toThrow();
  expect(getTheme(await db.settings.toArray())).toBe('dark');
  vi.spyOn(db.settings, 'put').mockRejectedValueOnce(new Error('Storage full'));
  await expect(saveTheme('light')).rejects.toThrow('Storage full');
  expect(getTheme(await db.settings.toArray())).toBe('dark');
});

test('missing and unrecognized preferences fall back to light', () => {
  expect(getTheme()).toBe('light');
  expect(getTheme([{ key: 'theme', value: 'invalid' }])).toBe('light');
});
