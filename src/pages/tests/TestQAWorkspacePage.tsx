import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Info,
  Rocket,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { showToast } from '@/components/shared/toast';
import { GatedButton } from '@/components/shared/GatedAction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useQuestions, useTestQAComments, useTestVersions, useTests } from '@/app/store/selectors';
import type { TestDraft, TestQAComment } from '@/app/store/types';

const QA_STATUSES = ['Draft', 'Content Ready', 'Under QA', 'Needs Fix', 'QA Approved', 'Scheduled', 'Live'] as const;
type QAStatus = (typeof QA_STATUSES)[number];

const QA_FLOW: Record<QAStatus, QAStatus[]> = {
  Draft: ['Content Ready'],
  'Content Ready': ['Under QA'],
  'Under QA': ['Needs Fix', 'QA Approved'],
  'Needs Fix': ['Under QA'],
  'QA Approved': ['Scheduled', 'Live'],
  Scheduled: ['Under QA', 'Live'],
  Live: [],
};

function normalizeStatus(status: string): QAStatus {
  return QA_STATUSES.includes(status as QAStatus) ? (status as QAStatus) : 'Draft';
}

function statusTone(status: QAStatus): 'neutral' | 'info' | 'warning' | 'success' | 'primary' {
  if (status === 'Live') return 'success';
  if (status === 'QA Approved') return 'primary';
  if (status === 'Under QA' || status === 'Scheduled') return 'info';
  if (status === 'Needs Fix') return 'warning';
  return 'neutral';
}

interface QACheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: 'error' | 'warning' | 'info';
}

function resolveDraft(testId: string, drafts: Record<string, TestDraft>): TestDraft | undefined {
  return drafts[`test-edit-${testId}`] ?? drafts[`test-saved-${testId}`];
}

export function TestQAWorkspacePage() {
  const tests = useTests();
  const questions = useQuestions();
  const {
    state,
    dispatch,
    audit,
    activeAdminName,
    addTestQAComment,
    addTestVersion,
  } = usePrototypeStore();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [comment, setComment] = useState('');

  const selectedTest = useMemo(
    () => tests.find((test) => test.id === selectedTestId),
    [selectedTestId, tests],
  );
  const draft = selectedTest ? resolveDraft(selectedTest.id, state.testDrafts) : undefined;
  const assignedIds = useMemo(() => draft?.selectedQuestionIds ?? [], [draft?.selectedQuestionIds]);
  const selectedQuestions = useMemo(() => {
    const byId = new Map(questions.map((question) => [question.id, question]));
    return assignedIds
      .map((id) => byId.get(id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question));
  }, [assignedIds, questions]);
  const comments = useTestQAComments(selectedTestId ?? undefined);
  const versions = useTestVersions(selectedTestId ?? undefined);
  const qaStatus = normalizeStatus(selectedTest?.status ?? 'Draft');

  const checks = useMemo<QACheck[]>(() => {
    if (!selectedTest) return [];
    const duplicateIds = assignedIds.filter((id, index) => assignedIds.indexOf(id) !== index);
    const missingAssigned = assignedIds.filter((id) => !questions.some((question) => question.id === id));
    const duplicateStems = selectedQuestions.filter((question, index, list) =>
      list.findIndex((candidate) => candidate.stem.trim().toLowerCase() === question.stem.trim().toLowerCase()) !== index,
    );
    const invalidCorrect = selectedQuestions.filter(
      (question) => !question.options.some((option) => option.id === question.correctOption),
    );
    const missingOptions = selectedQuestions.filter((question) => question.options.length < 2);
    const missingExplanations = selectedQuestions.filter((question) => !question.explanation.trim());
    const languageMissing = selectedQuestions.filter(
      (question) => draft && !question.language.includes(draft.basicInfo.language),
    );
    const sectionQuestionTotal = draft?.sections.reduce((sum, section) => sum + section.questions, 0) ?? 0;
    const sectionMarkTotal = draft?.sections.reduce((sum, section) => sum + section.marks, 0) ?? 0;

    return [
      {
        id: 'draft',
        label: 'Saved builder draft',
        passed: Boolean(draft),
        detail: draft ? 'The complete Test Builder draft is available.' : 'No saved Test Builder draft exists for this test.',
        severity: 'error',
      },
      {
        id: 'assigned',
        label: 'Assigned questions',
        passed: assignedIds.length > 0 && assignedIds.length === (draft?.pattern.totalQuestions ?? selectedTest.totalQuestions),
        detail: `${assignedIds.length} assigned / ${draft?.pattern.totalQuestions ?? selectedTest.totalQuestions} required`,
        severity: 'error',
      },
      {
        id: 'missing-assigned',
        label: 'All assignments resolve',
        passed: missingAssigned.length === 0,
        detail: missingAssigned.length ? `${missingAssigned.length} assigned question IDs are missing from the bank.` : 'All assigned IDs resolve to Question Bank records.',
        severity: 'error',
      },
      {
        id: 'duplicate-id',
        label: 'No duplicate question assignments',
        passed: duplicateIds.length === 0,
        detail: duplicateIds.length ? `${new Set(duplicateIds).size} duplicate question IDs found.` : 'No duplicate question IDs found.',
        severity: 'error',
      },
      {
        id: 'duplicate-stem',
        label: 'No exact duplicate stems',
        passed: duplicateStems.length === 0,
        detail: duplicateStems.length ? `${duplicateStems.length} exact duplicate stems found.` : 'No exact duplicate stems found.',
        severity: 'warning',
      },
      {
        id: 'correct-answer',
        label: 'Correct answers are valid',
        passed: invalidCorrect.length === 0,
        detail: invalidCorrect.length ? `${invalidCorrect.length} questions have an invalid correct option.` : 'Every correct answer references an existing option.',
        severity: 'error',
      },
      {
        id: 'options',
        label: 'Options are complete',
        passed: missingOptions.length === 0,
        detail: missingOptions.length ? `${missingOptions.length} questions have insufficient options.` : 'All assigned questions have sufficient options.',
        severity: 'error',
      },
      {
        id: 'explanations',
        label: 'Explanations are present',
        passed: missingExplanations.length === 0,
        detail: missingExplanations.length ? `${missingExplanations.length} questions are missing explanations.` : 'All assigned questions include explanations.',
        severity: 'warning',
      },
      {
        id: 'language',
        label: 'Required language is available',
        passed: languageMissing.length === 0,
        detail: languageMissing.length ? `${languageMissing.length} questions do not include ${draft?.basicInfo.language}.` : `All assigned questions support ${draft?.basicInfo.language ?? selectedTest.language}.`,
        severity: 'warning',
      },
      {
        id: 'sections',
        label: 'Section question totals match',
        passed: Boolean(draft) && sectionQuestionTotal === draft?.pattern.totalQuestions,
        detail: draft ? `Sections total ${sectionQuestionTotal}; test requires ${draft.pattern.totalQuestions}.` : 'Draft unavailable.',
        severity: 'error',
      },
      {
        id: 'marks',
        label: 'Section marks match',
        passed: Boolean(draft) && sectionMarkTotal === draft?.pattern.totalMarks,
        detail: draft ? `Sections total ${sectionMarkTotal} marks; test requires ${draft.pattern.totalMarks}.` : 'Draft unavailable.',
        severity: 'warning',
      },
    ];
  }, [assignedIds, draft, questions, selectedQuestions, selectedTest]);

  const hardErrors = checks.filter((check) => !check.passed && check.severity === 'error');
  const warnings = checks.filter((check) => !check.passed && check.severity === 'warning');

  const updateStatus = (status: QAStatus, reason: string) => {
    if (!selectedTest) return;
    const updated = { ...selectedTest, status };
    dispatch({
      type: 'UPDATE_TEST',
      test: updated,
      audit: audit('QA_STATUS_CHANGED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, status, reason),
    });
    showToast.success('QA status updated', `${selectedTest.name} is now ${status}.`);
  };

  const handleAssignReviewer = () => {
    if (!selectedTest || !reviewer) return;
    const updated = { ...selectedTest, status: 'Under QA' };
    dispatch({
      type: 'UPDATE_TEST',
      test: updated,
      audit: audit('QA_REVIEWER_ASSIGNED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, 'Under QA', `Assigned to ${reviewer}`),
    });
    showToast.success('Reviewer assigned', `${reviewer} is reviewing ${selectedTest.name}.`);
  };

  const handleComment = () => {
    if (!selectedTest || !comment.trim()) return;
    const qaComment: TestQAComment = {
      id: `QC-${Date.now()}`,
      author: activeAdminName,
      timestamp: new Date().toISOString(),
      content: comment.trim(),
    };
    audit('QA_COMMENT_ADDED', 'test', selectedTest.id, selectedTest.name, '', qaComment.content, 'QA review comment added');
    addTestQAComment(selectedTest.id, qaComment);
    setComment('');
    showToast.success('Comment added', 'The QA comment and audit entry were saved.');
  };

  const handlePublish = () => {
    if (!selectedTest || !draft) return;
    if (hardErrors.length) {
      showToast.error('Publishing blocked', `${hardErrors.length} hard errors must be resolved.`);
      return;
    }
    const nextVersion = Math.max(0, ...versions.map((version) => version.versionNumber)) + 1;
    const now = new Date().toISOString();
    addTestVersion(selectedTest.id, {
      id: `TV-${selectedTest.id}-${nextVersion}`,
      testId: selectedTest.id,
      versionNumber: nextVersion,
      snapshot: { ...selectedTest, status: 'Live', scheduledDate: null },
      publishedBy: activeAdminName,
      publishedAt: now,
      reason: 'Published from Test QA workspace',
      isLive: true,
      frozenSections: draft.sections.map((section) => ({ ...section })),
      frozenQuestionIds: [...draft.selectedQuestionIds],
      frozenInstructions: draft.instructions ?? '',
      frozenMarkingRules: {
        marksPerQuestion: draft.pattern.marksPerQuestion,
        negativeMarks: draft.pattern.negativeMarks,
      },
    });
    const updated = { ...selectedTest, status: 'Live', scheduledDate: null };
    dispatch({
      type: 'UPDATE_TEST',
      test: updated,
      audit: audit('TEST_PUBLISHED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, 'Live', `Published as version ${nextVersion}`),
    });
    showToast.success('Test published', `Version ${nextVersion} is live with frozen test content.`);
  };

  return (
    <div>
      <PageHeader
        title="Test QA Workspace"
        description="Review the exact Test Builder assignments and publish immutable test versions."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">QA pipeline</CardTitle></CardHeader>
          <CardContent className="max-h-[650px] space-y-2 overflow-y-auto">
            {tests.filter((test) => test.status !== 'Archived').map((test) => {
              const status = normalizeStatus(test.status);
              return (
                <button
                  key={test.id}
                  onClick={() => setSelectedTestId(test.id)}
                  className={cn('w-full rounded-lg border p-3 text-left', selectedTestId === test.id && 'border-primary bg-primary/5')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{test.name}</p>
                      <p className="text-xs text-muted-foreground">{test.id} · {test.examName}</p>
                    </div>
                    <StatusBadge tone={statusTone(status)} dot>{status}</StatusBadge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {!selectedTest ? (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Select a test to begin QA.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <h2 className="font-semibold">{selectedTest.name}</h2>
                    <p className="text-xs text-muted-foreground">{assignedIds.length} assigned questions · {draft?.pattern.totalMarks ?? 0} marks · {draft?.pattern.durationMinutes ?? selectedTest.durationMin} minutes</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusTone(qaStatus)} dot>{qaStatus}</StatusBadge>
                    <Button asChild variant="outline" size="sm"><Link to={`/tests/${selectedTest.id}`}><Eye className="mr-1 h-4 w-4" />Details</Link></Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" /> QA validation
                    {hardErrors.length > 0 && <StatusBadge tone="destructive">{hardErrors.length} errors</StatusBadge>}
                    {warnings.length > 0 && <StatusBadge tone="warning">{warnings.length} warnings</StatusBadge>}
                    {hardErrors.length === 0 && warnings.length === 0 && <StatusBadge tone="success">Ready</StatusBadge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {checks.map((check) => (
                    <div key={check.id} className="flex gap-3 rounded-lg border p-3">
                      {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : check.severity === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" /> : <Info className="mt-0.5 h-4 w-4 text-warning" />}
                      <div><p className="text-sm font-medium">{check.label}</p><p className="text-xs text-muted-foreground">{check.detail}</p></div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Reviewer and comments</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={reviewer} onValueChange={setReviewer}>
                      <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                      <SelectContent>{['Simran Singh', 'Neha Verma', 'Anjali Bansal', 'Karan Bedi'].map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleAssignReviewer} disabled={!reviewer}><User className="mr-1 h-4 w-4" />Assign</Button>
                  </div>
                  <div className="space-y-2">
                    {comments.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="text-xs font-medium">{item.author}</p><p className="mt-1 text-sm">{item.content}</p></div>)}
                  </div>
                  <div className="flex gap-2"><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a QA comment" /><Button onClick={handleComment} disabled={!comment.trim()}><Send className="h-4 w-4" /></Button></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">QA actions</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(QA_FLOW[qaStatus] ?? []).map((status) => <Button key={status} variant="outline" onClick={() => updateStatus(status, `QA transitioned to ${status}`)}>{status}</Button>)}
                  <Button variant="outline" disabled={qaStatus !== 'QA Approved'} onClick={() => updateStatus('Scheduled', 'Scheduled after QA approval')}><CalendarClock className="mr-1 h-4 w-4" />Schedule</Button>
                  <GatedButton permission="tests.publish" disabled={!draft || hardErrors.length > 0 || !['QA Approved', 'Scheduled'].includes(qaStatus)} onClick={handlePublish}><Rocket className="mr-1 h-4 w-4" />Publish immutable version</GatedButton>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
