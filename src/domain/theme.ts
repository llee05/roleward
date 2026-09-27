import { z } from 'zod';
import type { Setting } from './models';

export const themeSchema = z.enum(['light', 'dark']);
export type Theme = z.infer<typeof themeSchema>;

export function getTheme(settings: Setting[] = []): Theme {
  const result = themeSchema.safeParse(
    settings.find((setting) => setting.key === 'theme')?.value,
  );
  return result.success ? result.data : 'light';
}
