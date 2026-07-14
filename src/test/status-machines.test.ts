import { describe, it, expect } from 'vitest';
import {
  canTransitionQuestion,
  canTransitionTest,
  canTransitionBatch,
  canTransitionChallenge,
  canTransitionCorrection,
  canTransitionOrder,
} from '@/app/store/status-machines';

describe('Status machines', () => {
  describe('Question status transitions', () => {
    it('allows Draft → Under Review', () => {
      expect(canTransitionQuestion('Draft', 'Under Review')).toBe(true);
    });
    it('allows Under Review → Approved', () => {
      expect(canTransitionQuestion('Under Review', 'Approved')).toBe(true);
    });
    it('allows Under Review → Needs Fix', () => {
      expect(canTransitionQuestion('Under Review', 'Needs Fix')).toBe(true);
    });
    it('allows Approved → Archived', () => {
      expect(canTransitionQuestion('Approved', 'Archived')).toBe(true);
    });
    it('allows Archived → Under Review (restore)', () => {
      expect(canTransitionQuestion('Archived', 'Under Review')).toBe(true);
    });
    it('blocks Draft → Approved (must go through review)', () => {
      expect(canTransitionQuestion('Draft', 'Approved')).toBe(false);
    });
    it('blocks Approved → Rejected (must go through review)', () => {
      expect(canTransitionQuestion('Approved', 'Rejected')).toBe(false);
    });
  });

  describe('Test status transitions', () => {
    it('allows Draft → Content Ready', () => {
      expect(canTransitionTest('Draft', 'Content Ready')).toBe(true);
    });
    it('allows Content Ready → Under QA', () => {
      expect(canTransitionTest('Content Ready', 'Under QA')).toBe(true);
    });
    it('allows Under QA → QA Approved', () => {
      expect(canTransitionTest('Under QA', 'QA Approved')).toBe(true);
    });
    it('allows QA Approved → Scheduled', () => {
      expect(canTransitionTest('QA Approved', 'Scheduled')).toBe(true);
    });
    it('allows Scheduled → Live', () => {
      expect(canTransitionTest('Scheduled', 'Live')).toBe(true);
    });
    it('allows Live → Completed', () => {
      expect(canTransitionTest('Live', 'Completed')).toBe(true);
    });
    it('blocks Draft → Live (must go through QA)', () => {
      expect(canTransitionTest('Draft', 'Live')).toBe(false);
    });
    it('blocks Completed → Live', () => {
      expect(canTransitionTest('Completed', 'Live')).toBe(false);
    });
  });

  describe('Generation batch transitions', () => {
    it('allows Draft → Queued', () => {
      expect(canTransitionBatch('Draft', 'Queued')).toBe(true);
    });
    it('allows Queued → Running', () => {
      expect(canTransitionBatch('Queued', 'Running')).toBe(true);
    });
    it('allows Running → Validation', () => {
      expect(canTransitionBatch('Running', 'Validation')).toBe(true);
    });
    it('allows Failed → Draft (retry)', () => {
      expect(canTransitionBatch('Failed', 'Draft')).toBe(true);
    });
    it('blocks Approved → Running (approved is terminal)', () => {
      expect(canTransitionBatch('Approved', 'Running')).toBe(false);
    });
  });

  describe('Challenge transitions', () => {
    it('allows New → Investigating', () => {
      expect(canTransitionChallenge('New', 'Investigating')).toBe(true);
    });
    it('allows Investigating → Accepted', () => {
      expect(canTransitionChallenge('Investigating', 'Accepted')).toBe(true);
    });
    it('allows Accepted → Correction Required', () => {
      expect(canTransitionChallenge('Accepted', 'Correction Required')).toBe(true);
    });
    it('blocks Resolved → New (resolved is terminal)', () => {
      expect(canTransitionChallenge('Resolved', 'New')).toBe(false);
    });
  });

  describe('Correction transitions', () => {
    it('allows Draft → Impact Calculated', () => {
      expect(canTransitionCorrection('Draft', 'Impact Calculated')).toBe(true);
    });
    it('allows Awaiting Approval → Approved', () => {
      expect(canTransitionCorrection('Awaiting Approval', 'Approved')).toBe(true);
    });
    it('allows Approved → Running', () => {
      expect(canTransitionCorrection('Approved', 'Running')).toBe(true);
    });
    it('blocks Completed → Running (completed is terminal)', () => {
      expect(canTransitionCorrection('Completed', 'Running')).toBe(false);
    });
  });

  describe('Order transitions', () => {
    it('allows Created → Pending', () => {
      expect(canTransitionOrder('Created', 'Pending')).toBe(true);
    });
    it('allows Pending → Paid', () => {
      expect(canTransitionOrder('Pending', 'Paid')).toBe(true);
    });
    it('allows Paid → Refunded', () => {
      expect(canTransitionOrder('Paid', 'Refunded')).toBe(true);
    });
    it('blocks Refunded → Paid (refunded is terminal)', () => {
      expect(canTransitionOrder('Refunded', 'Paid')).toBe(false);
    });
  });
});
