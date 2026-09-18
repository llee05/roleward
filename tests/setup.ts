import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

import { File, Blob } from 'node:buffer';
import { vi } from 'vitest';
// Node implementations survive fake-indexeddb's structured clone, like native browser blobs.
vi.stubGlobal('File', File);
vi.stubGlobal('Blob', Blob);
