import { themeSchema, type Theme } from '../domain/theme';
import { db } from './local-database';

export async function saveTheme(theme: Theme) {
  const value = themeSchema.parse(theme);
  await db.settings.put({ key: 'theme', value });
}
