import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createAuditEntry } from '@/app/store/persistence';
import {
  PrototypeStoreProvider,
  usePrototypeStore,
} from '@/app/store/PrototypeStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

/** Render the provider and expose the live store value via renderHook. */
function renderStore() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PrototypeStoreProvider>{children}</PrototypeStoreProvider>
  );
  return renderHook(() => usePrototypeStore(), { wrapper });
}

describe('Audit deduplication', () => {
  it('createAuditEntry returns an entry without dispatching', () => {
    const entry = createAuditEntry(
      'Admin',
      'Super Admin',
      'TEST',
      'question',
      'Q-1',
      'Q-1',
      'old',
      'new',
      'test',
    );
    expect(entry).toBeDefined();
    expect(entry.id).toMatch(/^AL-/);
    expect(entry.action).toBe('TEST');
    expect(entry.admin).toBe('Admin');
    expect(entry.role).toBe('Super Admin');
  });

  it('createAuditEntry generates unique IDs', () => {
    const entry1 = createAuditEntry(
      'A',
      'Super Admin',
      'ACT1',
      'question',
      'Q-1',
      'Q-1',
      '',
      '',
      '',
    );
    const entry2 = createAuditEntry(
      'A',
      'Super Admin',
      'ACT2',
      'question',
      'Q-2',
      'Q-2',
      '',
      '',
      '',
    );
    expect(entry1.id).not.toBe(entry2.id);
  });

  it('reducer ADD_AUDIT deduplicates by ID', () => {
    const { result } = renderStore();
    const entry = createAuditEntry(
      'Admin',
      'Super Admin',
      'TEST',
      'question',
      'Q-1',
      'Q-1',
      'old',
      'new',
      'test',
    );
    const before = result.current.state.auditLogs.length;

    // Dispatch the exact same entry twice; the second must be ignored.
    act(() => {
      result.current.dispatch({ type: 'ADD_AUDIT', entry });
      result.current.dispatch({ type: 'ADD_AUDIT', entry });
    });

    expect(result.current.state.auditLogs.length).toBe(before + 1);
    expect(result.current.state.auditLogs[0]?.id).toBe(entry.id);
  });

  it('audit() entries with distinct IDs are both kept', () => {
    const { result } = renderStore();
    const before = result.current.state.auditLogs.length;

    act(() => {
      result.current.audit('ACT1', 'question', 'Q-1', 'Q-1', 'old', 'new', 'reason 1');
      result.current.audit('ACT2', 'question', 'Q-2', 'Q-2', 'old', 'new', 'reason 2');
    });

    expect(result.current.state.auditLogs.length).toBe(before + 2);
  });
});
