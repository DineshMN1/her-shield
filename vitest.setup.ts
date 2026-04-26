// Global test setup — runs before every test file
import { vi } from 'vitest';

// Silence console.error in tests (API routes log errors we're intentionally triggering)
vi.spyOn(console, 'error').mockImplementation(() => {});
