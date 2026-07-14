import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, ShieldCheck, AlertTriangle, CheckCircle2, Info,
  Eye, Monitor, Smartphone, MessageSquare, Send,
  RotateCcw, Rocket, CalendarClock, User,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { showToast } from '@/components/shared/toast';
import { GatedButton } from '@/components/shared/GatedAction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTests, useQuestions, useTestQAComments } from '@/app/store/selectors';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import type { TestQAComment } from '@/app/store/types';

const QA_STATUSES = ['Draft', 'Ready for QA', 'Under QA', 'Needs Fix', 'QA Approved', 'Scheduled', 'Live'] as const;
type QAStatus = typeof QA_STATUSES[number];

const QA_FLOW: Record<QAStatus, QAStatus[]> = {
  'Draft': ['Ready for QA'],
  'Ready for QA': ['Under QA', 'Draft'],
  'Under QA': ['Needs Fix', 'QA Approved'],
  'Needs Fix': ['Ready for QA', 'Under QA'],
  'QA Approved': ['Scheduled', 'Live'],
  'Scheduled': ['Live', 'Under QA'],
  'Live': [],
};

function qaStatusTone(s: QAStatus): 'neutral' | 'info' | 'warning' | 'success' | 'primary' | 'destructive' {
  if (s === 'Live') return 'success';
  if (s === 'QA Approved') return 'primary';
  if (s === 'Under QA') return 'info';
  if (s === 'Needs Fix') return 'warning';
  if (s === 'Scheduled') return 'info';
  if (s === 'Ready for QA') return 'neutral';
  return 'neutral';
}

function toQAStatus(testStatus: string): QAStatus {
  if (QA_STATUSES.includes(testStatus as QAStatus)) return testStatus as QAStatus;
  if (testStatus === 'Content Ready') return 'Ready for QA';
  if (testStatus === 'Completed') return 'Live';
  return 'Draft';
}

interface QACheckResult {
  label: string;
  passed: boolean;
  detail: string;
  severity: 'error' | 'warning' | 'info';
}

export function TestQAPage() {
  const tests = useTests();
  const questions = useQuestions();
  const { dispatch, audit, activeAdminName, addTestQAComment, addTestVersion } = usePrototypeStore();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const filtered = useMemo(() => tests.filter((t) => t.status !== 'Archived'), [tests]);

  const selectedTest = useMemo(() => filtered.find((t) => t.id === selectedTestId), [filtered, selectedTestId]);
  const qaComments = useTestQAComments(selectedTestId ?? undefined);

  const qaStatus: QAStatus = selectedTest ? toQAStatus(selectedTest.status) : 'Draft';

  const selectedQuestions = useMemo(() => {
    if (!selectedTest) return [];
    return questions.slice(0, selectedTest.totalQuestions);
  }, [selectedTest, questions]);

  const qaChecks: QACheckResult[] = useMemo(() => {
    if (!selectedTest) return [];
    const results: QACheckResult[] = [];

    results.push({
      label: 'Question totals',
      passed: selectedTest.totalQuestions > 0,
      detail: `${selectedTest.totalQuestions} questions`,
      severity: 'error',
    });

    results.push({
      label: 'Duration set',
      passed: selectedTest.durationMin > 0,
      detail: `${selectedTest.durationMin} minutes`,
      severity: 'error',
    });

    results.push({
      label: 'Status eligible for QA',
      passed: qaStatus === 'Ready for QA' || qaStatus === 'Under QA' || qaStatus === 'Needs Fix' || qaStatus === 'QA Approved',
      detail: `Current status: ${qaStatus}`,
      severity: qaStatus === 'Live' ? 'info' : 'warning',
    });

    const dupSubjects = new Set<string>();
    const seenSubjects = new Set<string>();
    for (const q of selectedQuestions) {
      if (seenSubjects.has(q.subject)) dupSubjects.add(q.subject);
      seenSubjects.add(q.subject);
    }
    results.push({
      label: 'No duplicate subjects',
      passed: dupSubjects.size === 0,
      detail: dupSubjects.size > 0 ? `Duplicate subjects: ${[...dupSubjects].join(', ')}` : 'All subjects unique',
      severity: 'warning',
    });

    const missingStems = selectedQuestions.filter((q) => !q.stem.trim());
    results.push({
      label: 'Question text present',
      passed: missingStems.length === 0,
      detail: missingStems.length > 0 ? `${missingStems.length} questions missing text` : 'All questions have text',
      severity: 'error',
    });

    const missingOptions = selectedQuestions.filter((q) => q.options.length < 2);
    results.push({
      label: 'Options present',
      passed: missingOptions.length === 0,
      detail: missingOptions.length > 0 ? `${missingOptions.length} questions with insufficient options` : 'All questions have sufficient options',
      severity: 'error',
    });

    const invalidCorrect = selectedQuestions.filter((q) => !q.options.some((o) => o.id === q.correctOption));
    results.push({
      label: 'Correct answers valid',
      passed: invalidCorrect.length === 0,
      detail: invalidCorrect.length > 0 ? `${invalidCorrect.length} questions with invalid correct answers` : 'All correct answers valid',
      severity: 'error',
    });

    const missingExplain = selectedQuestions.filter((q) => !q.explanation.trim());
    results.push({
      label: 'Explanations present',
      passed: missingExplain.length === 0,
      detail: missingExplain.length > 0 ? `${missingExplain.length} questions missing explanations` : 'All questions have explanations',
      severity: 'warning',
    });

    const langIncomplete = selectedQuestions.filter((q) => !q.language.includes(selectedTest.language));
    results.push({
      label: 'Language completeness',
      passed: langIncomplete.length === 0,
      detail: langIncomplete.length > 0 ? `${langIncomplete.length} questions missing ${selectedTest.language} translation` : `All questions available in ${selectedTest.language}`,
      severity: 'warning',
    });

    const easyCount = selectedQuestions.filter((q) => q.difficulty === 'Easy').length;
    const modCount = selectedQuestions.filter((q) => q.difficulty === 'Moderate').length;
    const hardCount = selectedQuestions.filter((q) => q.difficulty === 'Hard').length;
    const total = selectedQuestions.length || 1;
    results.push({
      label: 'Difficulty distribution',
      passed: easyCount > 0 && modCount > 0 && hardCount > 0,
      detail: `Easy ${Math.round(easyCount / total * 100)}% / Moderate ${Math.round(modCount / total * 100)}% / Hard ${Math.round(hardCount / total * 100)}%`,
      severity: 'info',
    });

    const subjects = [...new Set(selectedQuestions.map((q) => q.subject))];
    results.push({
      label: 'Topic coverage',
      passed: subjects.length >= 2,
      detail: `${subjects.length} subjects covered`,
      severity: 'info',
    });

    const overused = selectedQuestions.filter((q) => q.usageCount > 5);
    results.push({
      label: 'Previous usage',
      passed: overused.length === 0,
      detail: overused.length > 0 ? `${overused.length} questions used 5+ times before` : 'No overused questions',
      severity: 'warning',
    });

    results.push({
      label: 'Instructions present',
      passed: true,
      detail: 'General instructions template attached',
      severity: 'info',
    });

    results.push({
      label: 'Scheduling valid',
      passed: qaStatus !== 'Scheduled' || (selectedTest.scheduledDate !== null && new Date(selectedTest.scheduledDate) > new Date()),
      detail: selectedTest.scheduledDate ? `Scheduled for ${selectedTest.scheduledDate}` : 'Not scheduled',
      severity: 'warning',
    });

    return results;
  }, [selectedTest, selectedQuestions, qaStatus]);

  const hardErrors = qaChecks.filter((c) => !c.passed && c.severity === 'error');
  const warnings = qaChecks.filter((c) => !c.passed && c.severity === 'warning');
  const allPassed = hardErrors.length === 0;

  const handleAssignReviewer = () => {
    if (!selectedTest || !reviewer) return;
    const updated = { ...selectedTest, status: 'Under QA' };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('QA_REVIEWER_ASSIGNED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, 'Under QA', `Reviewer assigned: ${reviewer}`) });
    showToast.success('Reviewer assigned', `${reviewer} is now reviewing ${selectedTest.name}.`);
  };

  const handleAddComment = () => {
    if (!selectedTest || !comment.trim()) return;
    const c: TestQAComment = {
      id: `QC-${Date.now()}`,
      author: activeAdminName,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      content: comment.trim(),
    };
    addTestQAComment(selectedTest.id, c);
    setComment('');
    showToast.info('Comment added', 'QA comment recorded.');
  };

  const handleTransition = (newStatus: QAStatus) => {
    if (!selectedTest) return;
    const mapped = newStatus === 'QA Approved' ? 'Content Ready' : newStatus === 'Ready for QA' ? 'Content Ready' : newStatus;
    const updated = { ...selectedTest, status: mapped };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('QA_STATUS_CHANGED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, mapped, `QA status changed to ${newStatus}`) });
    showToast.success('Status updated', `${selectedTest.name} is now ${newStatus}.`);
  };

  const handleReturnForCorrection = () => {
    if (!selectedTest) return;
    handleTransition('Needs Fix');
    showToast.warning('Returned for correction', `${selectedTest.name} needs fixes before QA can continue.`);
  };

  const handleApproveQA = () => {
    if (!selectedTest) return;
    if (hardErrors.length > 0) {
      showToast.error('Cannot approve QA', `${hardErrors.length} hard errors must be resolved first.`);
      return;
    }
    handleTransition('QA Approved');
    showToast.success('QA Approved', `${selectedTest.name} has passed QA review.`);
  };

  const handleSchedule = () => {
    if (!selectedTest) return;
    const dateStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const updated = { ...selectedTest, status: 'Scheduled', scheduledDate: dateStr };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('TEST_SCHEDULED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, 'Scheduled', `Scheduled for ${dateStr}`) });
    showToast.success('Test scheduled', `${selectedTest.name} scheduled for ${dateStr}.`);
  };

  const handlePublish = () => {
    if (!selectedTest) return;
    if (hardErrors.length > 0) {
      showToast.error('Publishing blocked', `${hardErrors.length} hard errors prevent publishing.`);
      return;
    }
    const now = new Date().toISOString();
    addTestVersion(selectedTest.id, {
      id: `TV-${selectedTest.id}-${Date.now()}`,
      testId: selectedTest.id,
      versionNumber: 1,
      snapshot: { ...selectedTest, status: 'Live', scheduledDate: null },
      publishedBy: activeAdminName,
      publishedAt: now,
      reason: 'Published from QA workspace',
      isLive: true,
      frozenSections: [],
      frozenQuestionIds: selectedQuestions.map((q) => q.id),
      frozenInstructions: 'General instructions for the test.',
      frozenMarkingRules: { marksPerQuestion: 2, negativeMarks: 0.25 },
    });
    const updated = { ...selectedTest, status: 'Live', scheduledDate: null };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('TEST_PUBLISHED', 'test', selectedTest.id, selectedTest.name, selectedTest.status, 'Live', 'Published from QA workspace') });
    showToast.success('Test published', `${selectedTest.name} is now live. A frozen version was created.`);
  };

  return (
    <div>
      <PageHeader
        title="Test QA Workspace"
        description="Validate, review, and publish tests through a structured QA workflow."
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Test list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Tests in QA Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((t) => {
              const s = toQAStatus(t.status);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTestId(t.id)}
                  className={cn(
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    selectedTestId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.id} - {t.examName}</p>
                    </div>
                    <StatusBadge tone={qaStatusTone(s)} dot className="shrink-0 text-[10px]">{s}</StatusBadge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* QA detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedTest ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-sm text-muted-foreground">Select a test from the list to begin QA review.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Test header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold">{selectedTest.name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedTest.id} - {selectedTest.examName} - {selectedTest.totalQuestions} questions - {selectedTest.durationMin} min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={qaStatusTone(qaStatus)} dot>{qaStatus}</StatusBadge>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/tests/${selectedTest.id}`}><Eye className="mr-1 h-3.5 w-3.5" /> Detail</Link>
                      </Button>
                    </div>
                  </div>

                  {/* QA status flow */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {QA_STATUSES.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <span className={cn(
                          'rounded-md px-2 py-1 text-[10px] font-medium',
                          s === qaStatus ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        )}>{s}</span>
                        {i < QA_STATUSES.length - 1 && <span className="text-muted-foreground/40">→</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Validation results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" /> QA Validation
                    {hardErrors.length > 0 && <StatusBadge tone="destructive" dot>{hardErrors.length} errors</StatusBadge>}
                    {warnings.length > 0 && <StatusBadge tone="warning" dot>{warnings.length} warnings</StatusBadge>}
                    {allPassed && warnings.length === 0 && <StatusBadge tone="success" dot>All passed</StatusBadge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {qaChecks.map((c) => (
                      <div key={c.label} className={cn(
                        'flex items-start gap-3 rounded-lg border p-3',
                        c.passed ? 'border-success/20 bg-success/5' : c.severity === 'error' ? 'border-error/20 bg-error/5' : c.severity === 'warning' ? 'border-warning/20 bg-warning/5' : 'border-info/20 bg-info/5',
                      )}>
                        {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : c.severity === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" /> : c.severity === 'warning' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{c.label}</p>
                          <p className="text-xs text-muted-foreground">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preview tabs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Preview</span>
                    <div className="flex items-center gap-1">
                      <Button variant={previewDevice === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('desktop')}><Monitor className="mr-1 h-3.5 w-3.5" /> Desktop</Button>
                      <Button variant={previewDevice === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewDevice('mobile')}><Smartphone className="mr-1 h-3.5 w-3.5" /> Mobile</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn('mx-auto rounded-lg border bg-muted/20 p-4', previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="font-display text-sm font-semibold">{selectedTest.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{selectedTest.totalQuestions} questions - {selectedTest.durationMin} min - {selectedTest.totalQuestions * 2} marks</p>
                      <div className="mt-3 space-y-2">
                        {selectedQuestions.slice(0, previewDevice === 'mobile' ? 3 : 5).map((q, i) => (
                          <div key={q.id} className="rounded-md border p-2.5">
                            <p className="text-xs font-medium">Q{i + 1}. {q.stem.slice(0, 80)}{q.stem.length > 80 ? '...' : ''}</p>
                            <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                              {q.options.slice(0, 4).map((o) => (
                                <div key={o.id} className={cn('rounded border px-2 py-1 text-[10px]', o.id === q.correctOption ? 'border-success/40 bg-success/10' : '')}>
                                  {o.id}. {o.text.slice(0, 40)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> QA Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {qaComments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {qaComments.map((c) => (
                        <div key={c.id} className="rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{c.author}</span>
                            <span className="text-[10px] text-muted-foreground">{c.timestamp}</span>
                          </div>
                          <p className="mt-1 text-sm text-foreground">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a QA comment..."
                      className="min-h-[60px] text-sm"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!comment.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QA Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Assign reviewer */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Assign Reviewer</p>
                    <div className="flex gap-2">
                      <Select value={reviewer} onValueChange={setReviewer}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Select reviewer..." /></SelectTrigger>
                        <SelectContent>
                          {['Simran Singh', 'Neha Verma', 'Anjali Bansal', 'Karan Bedi'].map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={handleAssignReviewer} disabled={!reviewer || qaStatus === 'Live'}>
                        <User className="mr-1 h-3.5 w-3.5" /> Assign
                      </Button>
                    </div>
                  </div>

                  {/* Status transitions */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Available Transitions</p>
                    <div className="flex flex-wrap gap-2">
                      {(QA_FLOW[qaStatus] ?? []).map((s) => (
                        <Button key={s} variant="outline" size="sm" onClick={() => handleTransition(s)}>
                          {s}
                        </Button>
                      ))}
                      {QA_FLOW[qaStatus].length === 0 && <p className="text-sm text-muted-foreground">No transitions available from {qaStatus}.</p>}
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button variant="outline" size="sm" onClick={handleReturnForCorrection} disabled={qaStatus === 'Live' || qaStatus === 'Draft'}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Return for Correction
                    </Button>
                    <Button variant="default" size="sm" onClick={handleApproveQA} disabled={hardErrors.length > 0 || qaStatus === 'Live'}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve QA
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSchedule} disabled={qaStatus !== 'QA Approved' && qaStatus !== 'Scheduled'}>
                      <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> Schedule
                    </Button>
                    {hardErrors.length > 0 ? (
                      <GatedButton permission="tests.publish" onClick={handlePublish} disabled>
                        <Rocket className="mr-1.5 h-3.5 w-3.5" /> Publish (blocked)
                      </GatedButton>
                    ) : (
                      <GatedButton permission="tests.publish" onClick={handlePublish} disabled={qaStatus !== 'QA Approved' && qaStatus !== 'Scheduled'}>
                        <Rocket className="mr-1.5 h-3.5 w-3.5" /> Publish
                      </GatedButton>
                    )}
                  </div>
                  {hardErrors.length > 0 && (
                    <p className="text-xs text-error">Publishing is blocked until {hardErrors.length} hard error(s) are resolved.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
