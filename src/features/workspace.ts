import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../persistence/local-database';
import { errorMessage } from '../lib/utils';
export function useWorkspace() {
  return useLiveQuery(async () => {
    try {
      const [applications, cvs, messages, settings] = await Promise.all([
        db.applications.toArray(),
        db.cvs.toArray(),
        db.messages.toArray(),
        db.settings.toArray(),
      ]);
      return { applications, cvs, messages, settings, error: '' };
    } catch (error) {
      return {
        applications: [],
        cvs: [],
        messages: [],
        settings: [],
        error: `Local storage could not open. ${errorMessage(error)}`,
      };
    }
  }, []);
}
export type Workspace = NonNullable<ReturnType<typeof useWorkspace>>;
