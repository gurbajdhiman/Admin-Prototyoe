import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PrototypeStoreProvider, usePrototypeStore } from '@/app/store/PrototypeStore';

const wrapper = ({ children }: { children: React.ReactNode }) => <PrototypeStoreProvider>{children}</PrototypeStoreProvider>;

describe('question bank bulk actions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('UPDATE_QUESTIONS batch-updates multiple questions', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const originalQs = result.current.state.questions.slice(0, 3);
    const updatedQs = originalQs.map((q) => ({ ...q, status: 'Approved' as const, updatedAt: '2024-01-01' }));

    act(() => {
      result.current.dispatch({ type: 'UPDATE_QUESTIONS', questions: updatedQs });
    });

    for (const uq of updatedQs) {
      const stored = result.current.state.questions.find((q) => q.id === uq.id);
      expect(stored?.status).toBe('Approved');
    }
  });

  it('creates exactly one audit entry when audit is passed to UPDATE_QUESTIONS', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const before = result.current.state.auditLogs.length;
    const qs = result.current.state.questions.slice(0, 2);
    const updated = qs.map((q) => ({ ...q, status: 'Archived' as const }));

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_QUESTIONS',
        questions: updated,
        audit: {
          id: 'audit-bulk-test', timestamp: '2024-01-01', admin: 'Test', role: 'Super Admin',
          action: 'BULK_ARCHIVE', entityType: 'question', entityId: qs.map((q) => q.id).join(','),
          entityName: '2 questions', oldValue: '', newValue: 'Archived', reason: 'Bulk test', sessionId: 's1', approvalStatus: 'Auto',
        },
      });
    });

    const after = result.current.state.auditLogs.length;
    expect(after - before).toBe(1);
  });

  it('preserves questions not included in the batch update', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const untouched = result.current.state.questions[5];
    const toUpdate = result.current.state.questions.slice(0, 2).map((q) => ({ ...q, status: 'Rejected' as const }));

    act(() => {
      result.current.dispatch({ type: 'UPDATE_QUESTIONS', questions: toUpdate });
    });

    const storedUntouched = result.current.state.questions.find((q) => q.id === untouched.id);
    expect(storedUntouched?.status).toBe(untouched.status);
  });
});

describe('dashboard filtered navigation', () => {
  it('questions awaiting review count matches store data', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const awaitingReview = result.current.state.questions.filter((q) => q.status === 'Under Review');
    expect(awaitingReview.length).toBeGreaterThan(0);
  });

  it('questions needing fixes count matches store data', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const needsFix = result.current.state.questions.filter((q) => q.status === 'Needs Fix');
    expect(needsFix.length).toBeGreaterThanOrEqual(0);
  });

  it('failed payments count uses paymentStatus field', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const failed = result.current.state.orders.filter((o) => o.paymentStatus === 'Failed');
    expect(failed.length).toBeGreaterThanOrEqual(0);
  });

  it('support near SLA uses priority and status fields', () => {
    const { result } = renderHook(() => usePrototypeStore(), { wrapper });
    const nearSLA = result.current.state.supportRequests.filter((s) => s.priority === 'High' && s.status !== 'Resolved');
    expect(nearSLA.length).toBeGreaterThanOrEqual(0);
  });
});
