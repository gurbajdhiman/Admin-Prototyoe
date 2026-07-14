import type { Blueprint } from '@/data/tests';
import type { ValidationIssue } from './validation';

export function validateBlueprint(bp: Blueprint): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!bp.name.trim()) {
    issues.push({ id: 'bp-name', severity: 'error', title: 'Blueprint name required', description: 'Name cannot be empty.', affectedEntity: 'name', suggestedAction: 'Enter a blueprint name.' });
  }
  if (!bp.exam) {
    issues.push({ id: 'bp-exam', severity: 'error', title: 'Exam required', description: 'An exam must be selected.', affectedEntity: 'exam', suggestedAction: 'Select an exam.' });
  }
  if (bp.sections.length === 0) {
    issues.push({ id: 'bp-no-sections', severity: 'error', title: 'At least one section required', description: 'No sections defined.', affectedEntity: 'sections', suggestedAction: 'Add at least one section.' });
  }
  if (bp.totalQuestions <= 0) {
    issues.push({ id: 'bp-total-q', severity: 'error', title: 'Total questions must be positive', description: `Total is ${bp.totalQuestions}.`, affectedEntity: 'totalQuestions', suggestedAction: 'Set a positive number.' });
  }
  if (bp.durationMin <= 0) {
    issues.push({ id: 'bp-duration', severity: 'error', title: 'Duration must be positive', description: `Duration is ${bp.durationMin} min.`, affectedEntity: 'durationMin', suggestedAction: 'Set a positive duration.' });
  }

  const sectionQSum = bp.sections.reduce((a, s) => a + s.questions, 0);
  if (bp.sections.length > 0 && sectionQSum !== bp.totalQuestions) {
    issues.push({ id: 'bp-q-mismatch', severity: 'warning', title: 'Section questions do not match total', description: `Sections sum to ${sectionQSum} but total is ${bp.totalQuestions}.`, affectedEntity: 'sections', suggestedAction: 'Adjust section counts or total.' });
  }

  const sectionMSum = bp.sections.reduce((a, s) => a + s.marks, 0);
  if (bp.sections.length > 0 && sectionMSum !== bp.totalMarks) {
    issues.push({ id: 'bp-m-mismatch', severity: 'warning', title: 'Section marks do not match total', description: `Sections sum to ${sectionMSum} but total is ${bp.totalMarks}.`, affectedEntity: 'sections', suggestedAction: 'Adjust section marks or total.' });
  }

  if (bp.sectionTiming === 'sectional') {
    const sectionDSum = bp.sections.reduce((a, s) => a + s.duration, 0);
    if (sectionDSum !== bp.durationMin) {
      issues.push({ id: 'bp-d-mismatch', severity: 'warning', title: 'Section durations do not match total', description: `Sections sum to ${sectionDSum}m but total is ${bp.durationMin}m.`, affectedEntity: 'sections', suggestedAction: 'Adjust section durations or total duration.' });
    }
  }

  const names = bp.sections.map((s) => s.name.trim()).filter((n) => n);
  const dups = names.filter((n, i, arr) => arr.indexOf(n) !== i);
  if (dups.length > 0) {
    issues.push({ id: 'bp-dup-sections', severity: 'warning', title: 'Duplicate section names', description: `Duplicate: ${dups.join(', ')}`, affectedEntity: 'sections', suggestedAction: 'Rename duplicate sections.' });
  }

  if (bp.languages.length === 0) {
    issues.push({ id: 'bp-no-lang', severity: 'error', title: 'At least one language required', description: 'No languages specified.', affectedEntity: 'languages', suggestedAction: 'Add at least one language.' });
  }

  if (bp.previousYearTarget < 0 || bp.previousYearTarget > 100) {
    issues.push({ id: 'bp-py-target', severity: 'warning', title: 'Previous year target out of range', description: `Target is ${bp.previousYearTarget}%.`, affectedEntity: 'previousYearTarget', suggestedAction: 'Set between 0 and 100.' });
  }

  if (bp.repetitionLimit < 0) {
    issues.push({ id: 'bp-rep-limit', severity: 'error', title: 'Repetition limit cannot be negative', description: `Limit is ${bp.repetitionLimit}.`, affectedEntity: 'repetitionLimit', suggestedAction: 'Set to 0 or a positive number.' });
  }

  return issues;
}

export function canActivateBlueprint(bp: Blueprint): boolean {
  return validateBlueprint(bp).every((i) => i.severity !== 'error');
}

export function compareBlueprints(b1: Blueprint, b2: Blueprint): { field: string; v1: unknown; v2: unknown; differs: boolean }[] {
  const fields: (keyof Blueprint)[] = ['name', 'exam', 'stage', 'version', 'totalQuestions', 'totalMarks', 'durationMin', 'negativeMarking', 'sectionTiming', 'previousYearTarget', 'repetitionLimit', 'effectiveDate', 'status'];
  return fields.map((f) => ({
    field: String(f),
    v1: b1[f],
    v2: b2[f],
    differs: JSON.stringify(b1[f]) !== JSON.stringify(b2[f]),
  })).filter((r) => r.differs);
}
