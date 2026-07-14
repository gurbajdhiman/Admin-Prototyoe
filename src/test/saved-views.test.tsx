import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PrototypeStoreProvider, usePrototypeStore } from '@/app/store/PrototypeStore';
import type { SavedView, SavedViewState } from '@/app/store/types';

function genState(id: string, state: SavedViewState): SavedView {
  return { id, name: `View ${id}`, page: '/test', scope: 'private', ownerId: 'test', state, isDefault: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' };
}

const wrapper = ({ children }: { children: React.ReactNode }) => <PrototypeStoreProvider>{children}</PrototypeStoreProvider>;

describe('saved views', () => {
  it('creates a saved view via addSavedView', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const initialState: SavedViewState = { filters: [{ key: 'status', value: 'Approved' }], visibleColumns: ['id', 'name'], columnOrder: ['id', 'name'], pageSize: 25 };
    act(() => {
      result.current.addSavedView(genState('sv-1', initialState));
    });
    expect(result.current.state.savedViews.length).toBe(1);
    expect(result.current.state.savedViews[0].id).toBe('sv-1');
  });

  it('updates a saved view via updateSavedView', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => {
      result.current.addSavedView(genState('sv-2', { filters: [], visibleColumns: [], columnOrder: [], pageSize: 10 }));
    });
    act(() => {
      const view = result.current.state.savedViews.find((v) => v.id === 'sv-2')!;
      result.current.updateSavedView({ ...view, name: 'Renamed' });
    });
    expect(result.current.state.savedViews.find((v) => v.id === 'sv-2')?.name).toBe('Renamed');
  });

  it('deletes a saved view via deleteSavedView', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => {
      result.current.addSavedView(genState('sv-3', { filters: [], visibleColumns: [], columnOrder: [], pageSize: 10 }));
    });
    expect(result.current.state.savedViews.length).toBeGreaterThan(0);
    act(() => {
      result.current.deleteSavedView('sv-3');
    });
    expect(result.current.state.savedViews.find((v) => v.id === 'sv-3')).toBeUndefined();
  });

  it('sets default view and unsets others on same page', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    act(() => {
      result.current.addSavedView({ ...genState('sv-a', { filters: [], visibleColumns: [], columnOrder: [], pageSize: 10 }), page: '/page1', isDefault: true });
      result.current.addSavedView({ ...genState('sv-b', { filters: [], visibleColumns: [], columnOrder: [], pageSize: 10 }), page: '/page1' });
    });
    act(() => {
      result.current.setDefaultSavedView('/page1', 'sv-b');
    });
    const views = result.current.state.savedViews.filter((v) => v.page === '/page1');
    expect(views.find((v) => v.id === 'sv-a')?.isDefault).toBe(false);
    expect(views.find((v) => v.id === 'sv-b')?.isDefault).toBe(true);
  });

  it('creates exactly one audit entry per saved view action', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const before = result.current.state.auditLogs.length;
    act(() => {
      result.current.addSavedView(genState('sv-audit', { filters: [], visibleColumns: [], columnOrder: [], pageSize: 10 }));
    });
    const after = result.current.state.auditLogs.length;
    expect(after - before).toBe(1);
  });
});
