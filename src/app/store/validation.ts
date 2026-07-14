import type { TestDraft } from './types';
import type { Question } from '@/data/questions';
import type { Blueprint } from '@/data/tests';
import type { AutoAssemblyResult } from './types';

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  affectedEntity: string;
  suggestedAction: string;
}

export function validateDraft(draft: TestDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!draft.basicInfo.name.trim()) {
    issues.push({ id: 'name-empty', severity: 'error', title: 'Test name is required', description: 'The test name cannot be empty.', affectedEntity: 'basicInfo.name', suggestedAction: 'Enter a test name in Basic Info.' });
  }
  if (!draft.basicInfo.examCode) {
    issues.push({ id: 'exam-empty', severity: 'error', title: 'Exam is required', description: 'An exam must be selected for the test.', affectedEntity: 'basicInfo.examCode', suggestedAction: 'Select an exam in Basic Info.' });
  }

  if (!(draft.pattern.totalQuestions > 0)) {
    issues.push({ id: 'total-questions', severity: 'error', title: 'Total questions must be greater than zero', description: `Total questions is ${draft.pattern.totalQuestions}.`, affectedEntity: 'pattern.totalQuestions', suggestedAction: 'Set a positive number of questions in Pattern.' });
  }
  if (!(draft.pattern.durationMinutes > 0)) {
    issues.push({ id: 'duration', severity: 'error', title: 'Duration must be greater than zero', description: `Duration is ${draft.pattern.durationMinutes} minutes.`, affectedEntity: 'pattern.durationMinutes', suggestedAction: 'Set a positive duration in Pattern.' });
  }

  if (draft.sections.length === 0) {
    issues.push({ id: 'no-sections', severity: 'error', title: 'At least one section is required', description: 'No sections have been added to the test.', affectedEntity: 'sections', suggestedAction: 'Add a section in the Sections step.' });
  }

  const nonEmptyNames = draft.sections.map((s) => s.name.trim()).filter((n) => n.length > 0);
  draft.sections.forEach((s, idx) => {
    if (!s.name.trim()) {
      issues.push({ id: `section-name-empty-${s.id}`, severity: 'error', title: `Section ${idx + 1} has an empty name`, description: 'Every section must have a name.', affectedEntity: `sections.${s.id}.name`, suggestedAction: 'Enter a name for this section.' });
    }
  });
  const dupNames = nonEmptyNames.filter((n, i, arr) => arr.indexOf(n) !== i);
  Array.from(new Set(dupNames)).forEach((name) => {
    issues.push({ id: `section-dup-${name}`, severity: 'warning', title: `Duplicate section name: "${name}"`, description: 'Multiple sections share the same name.', affectedEntity: 'sections', suggestedAction: 'Rename duplicate sections to avoid confusion.' });
  });

  const sectionQSum = draft.sections.reduce((a, s) => a + (Number(s.questions) || 0), 0);
  if (draft.sections.length > 0 && sectionQSum !== draft.pattern.totalQuestions) {
    issues.push({ id: 'section-q-sum', severity: 'warning', title: 'Section questions do not match the total', description: `Sections sum to ${sectionQSum} questions but the pattern total is ${draft.pattern.totalQuestions}.`, affectedEntity: 'sections', suggestedAction: 'Adjust section question counts or the pattern total.' });
  }

  const sectionMSum = draft.sections.reduce((a, s) => a + (Number(s.marks) || 0), 0);
  if (draft.sections.length > 0 && sectionMSum !== draft.pattern.totalMarks) {
    issues.push({ id: 'section-m-sum', severity: 'warning', title: 'Section marks do not match the total', description: `Sections sum to ${sectionMSum} marks but the pattern total is ${draft.pattern.totalMarks}.`, affectedEntity: 'sections', suggestedAction: 'Adjust section marks or the pattern total.' });
  }

  if (draft.selectedQuestionIds.length !== draft.pattern.totalQuestions) {
    issues.push({ id: 'selected-q-count', severity: 'warning', title: 'Selected questions do not match the total', description: `${draft.selectedQuestionIds.length} questions selected but the pattern total is ${draft.pattern.totalQuestions}.`, affectedEntity: 'selectedQuestionIds', suggestedAction: 'Select the correct number of questions.' });
  }

  const seen = new Set<string>();
  const dupIds = new Set<string>();
  draft.selectedQuestionIds.forEach((id) => {
    if (seen.has(id)) dupIds.add(id);
    seen.add(id);
  });
  dupIds.forEach((id) => {
    issues.push({ id: `dup-q-${id}`, severity: 'error', title: `Duplicate question selected: ${id}`, description: 'A question cannot appear more than once in a test.', affectedEntity: `selectedQuestionIds.${id}`, suggestedAction: 'Remove the duplicate question from the selection.' });
  });

  if (draft.schedule.mode === 'scheduled') {
    if (!draft.schedule.publishAt) {
      issues.push({ id: 'schedule-no-date', severity: 'error', title: 'Scheduled test has no publish date', description: 'A scheduled test requires a publish date and time.', affectedEntity: 'schedule.publishAt', suggestedAction: 'Set a publish date in the Schedule step.' });
    } else {
      const publishTime = new Date(draft.schedule.publishAt).getTime();
      if (Number.isNaN(publishTime)) {
        issues.push({ id: 'schedule-invalid-date', severity: 'error', title: 'Publish date is invalid', description: 'The scheduled publish date could not be parsed.', affectedEntity: 'schedule.publishAt', suggestedAction: 'Set a valid publish date.' });
      } else if (publishTime < Date.now()) {
        issues.push({ id: 'schedule-past', severity: 'error', title: 'Publish date is in the past', description: `The scheduled date ${draft.schedule.publishAt} has already passed.`, affectedEntity: 'schedule.publishAt', suggestedAction: 'Choose a future date and time.' });
      }
    }
  }

  if (draft.schedule.mode === 'qa' && !draft.schedule.reviewerId) {
    issues.push({ id: 'qa-no-reviewer', severity: 'error', title: 'QA mode requires a reviewer', description: 'A reviewer must be assigned when submitting for QA.', affectedEntity: 'schedule.reviewerId', suggestedAction: 'Select a reviewer in the Schedule step.' });
  }

  return issues;
}

export function canPublish(draft: TestDraft): boolean {
  return validateDraft(draft).every((i) => i.severity !== 'error');
}

export function validateDraftComprehensive(
  draft: TestDraft,
  selectedQuestions: Question[],
  blueprint?: Blueprint,
): ValidationIssue[] {
  const issues = validateDraft(draft);

  const qMap = new Map(selectedQuestions.map((q) => [q.id, q]));

  for (const qId of draft.selectedQuestionIds) {
    const q = qMap.get(qId);
    if (!q) {
      issues.push({ id: `missing-q-${qId}`, severity: 'error', title: `Question not found: ${qId}`, description: 'A selected question does not exist in the question bank.', affectedEntity: `selectedQuestionIds.${qId}`, suggestedAction: 'Remove this question or refresh the question bank.' });
      continue;
    }

    if (!q.stem.trim()) {
      issues.push({ id: `missing-stem-${qId}`, severity: 'error', title: `Missing question text: ${qId}`, description: 'Question stem is empty.', affectedEntity: `${qId}.stem`, suggestedAction: 'Edit the question to add a stem.' });
    }

    if (q.options.length < 2) {
      issues.push({ id: `insufficient-options-${qId}`, severity: 'error', title: `Insufficient options: ${qId}`, description: 'Question has fewer than 2 options.', affectedEntity: `${qId}.options`, suggestedAction: 'Add more options to the question.' });
    }

    const optionTexts = q.options.map((o) => o.text.trim().toLowerCase());
    const dupOpts = optionTexts.filter((t, i, arr) => t && arr.indexOf(t) !== i);
    if (dupOpts.length > 0) {
      issues.push({ id: `dup-options-${qId}`, severity: 'error', title: `Duplicate options: ${qId}`, description: `Duplicate option text: ${dupOpts[0]}`, affectedEntity: `${qId}.options`, suggestedAction: 'Make options distinct.' });
    }

    if (!q.options.some((o) => o.id === q.correctOption)) {
      issues.push({ id: `invalid-correct-${qId}`, severity: 'error', title: `Invalid correct answer: ${qId}`, description: 'The correct option ID does not match any option.', affectedEntity: `${qId}.correctOption`, suggestedAction: 'Set a valid correct answer.' });
    }

    if (!q.explanation.trim()) {
      issues.push({ id: `missing-explanation-${qId}`, severity: 'warning', title: `Missing explanation: ${qId}`, description: 'Question has no explanation.', affectedEntity: `${qId}.explanation`, suggestedAction: 'Add an explanation for the question.' });
    }

    if (q.status === 'Rejected' || q.status === 'Archived') {
      issues.push({ id: `bad-status-${qId}`, severity: 'error', title: `Rejected/Archived question selected: ${qId}`, description: `Question status is ${q.status}.`, affectedEntity: `${qId}.status`, suggestedAction: 'Remove this question or change its status.' });
    }

    if (draft.basicInfo.language && !q.language.includes(draft.basicInfo.language)) {
      issues.push({ id: `wrong-lang-${qId}`, severity: 'warning', title: `Translation missing: ${qId}`, description: `Question does not support ${draft.basicInfo.language}.`, affectedEntity: `${qId}.language`, suggestedAction: 'Add the required language or exclude this question.' });
    }
  }

  if (draft.sections.length > 0 && selectedQuestions.length > 0) {
    const sectionSubjects = new Set(draft.sections.map((s) => s.subject));
    for (const q of selectedQuestions) {
      if (!sectionSubjects.has(q.subject) && sectionSubjects.size > 0) {
        issues.push({ id: `section-mismatch-${q.id}`, severity: 'info', title: `Subject not in sections: ${q.id}`, description: `Question subject "${q.subject}" does not match any section.`, affectedEntity: `${q.id}.subject`, suggestedAction: 'Review section assignments or question selection.' });
      }
    }
  }

  if (blueprint) {
    if (draft.pattern.totalQuestions !== blueprint.totalQuestions) {
      issues.push({ id: 'bp-q-deviation', severity: 'warning', title: 'Blueprint deviation: question count', description: `Test has ${draft.pattern.totalQuestions} questions, blueprint requires ${blueprint.totalQuestions}.`, affectedEntity: 'pattern.totalQuestions', suggestedAction: 'Align with the blueprint or choose a different blueprint.' });
    }
    if (draft.pattern.durationMinutes !== blueprint.durationMin) {
      issues.push({ id: 'bp-d-deviation', severity: 'warning', title: 'Blueprint deviation: duration', description: `Test duration is ${draft.pattern.durationMinutes}m, blueprint requires ${blueprint.durationMin}m.`, affectedEntity: 'pattern.durationMinutes', suggestedAction: 'Align duration with the blueprint.' });
    }
    if (draft.pattern.negativeMarks !== blueprint.negativeMarking) {
      issues.push({ id: 'bp-nm-deviation', severity: 'info', title: 'Blueprint deviation: negative marking', description: `Test has ${draft.pattern.negativeMarks} negative marking, blueprint has ${blueprint.negativeMarking}.`, affectedEntity: 'pattern.negativeMarks', suggestedAction: 'Review negative marking alignment.' });
    }
  }

  const overused = selectedQuestions.filter((q) => q.usageCount > 5);
  if (overused.length > 0) {
    issues.push({ id: 'excessive-reuse', severity: 'warning', title: 'Excessive question reuse', description: `${overused.length} questions have been used more than 5 times.`, affectedEntity: 'selectedQuestionIds', suggestedAction: 'Consider replacing overused questions.' });
  }

  return issues;
}

export function classifyIssues(issues: ValidationIssue[]): { errors: ValidationIssue[]; warnings: ValidationIssue[]; info: ValidationIssue[] } {
  return {
    errors: issues.filter((i) => i.severity === 'error'),
    warnings: issues.filter((i) => i.severity === 'warning'),
    info: issues.filter((i) => i.severity === 'info'),
  };
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export function validateAutoAssemblyResult(result: AutoAssemblyResult): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const s of result.shortages) {
    issues.push({ id: `shortage-${s.constraint}`, severity: 'warning', title: `Shortage: ${s.constraint}`, description: `Need ${s.needed}, only ${s.available} available.`, affectedEntity: s.constraint, suggestedAction: 'Expand question bank or relax constraints.' });
  }
  for (const msg of result.unmetConstraints) {
    issues.push({ id: `unmet-${msg.slice(0, 20)}`, severity: 'error', title: 'Unmet assembly constraint', description: msg, affectedEntity: 'auto-assembly', suggestedAction: 'Adjust assembly rules or add more questions to the bank.' });
  }
  return issues;
}
