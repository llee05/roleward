import type { Application } from './models';
import { APPLICATION_STATUSES } from './application-statuses';
import { localDate } from '../lib/utils';
export function metrics(records: Application[], now = new Date()) {
  const apps = records.filter((a) => a.confirmed);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 13 + i);
    const date = localDate(d);
    return { date, count: apps.filter((a) => a.appliedAt === date).length };
  });
  return {
    total: apps.length,
    undated: apps.filter((a) => !a.appliedAt).length,
    days,
    statuses: APPLICATION_STATUSES.map((status) => ({
      status,
      count: apps.filter((a) => a.status === status).length,
    })),
    recent: days.slice(-7).reduce((sum, day) => sum + day.count, 0),
  };
}
