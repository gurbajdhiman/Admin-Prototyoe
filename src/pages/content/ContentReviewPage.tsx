import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, MessageSquare,
  Clock, User, ChevronLeft, ChevronRight, Languages, Shield,
  GitCompare, FileText, History, Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, questionStatusTone } from '@/components/shared/StatusBadge';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { showToast } from '@/components/shared/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { type Question } from '@/data/questions';
import { useQuestions, useReviewComments, useQuestionVersions } from '@/app/store/selectors';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { GatedButton } from '@/components/shared/GatedAction';
import { computeSimilarity, getSimilarForQuestion, SIGNAL_LABELS } from '@/app/store/similarity';
import { useSimilarityResults } from '@/app/store/selectors';


type QueueType = 'all' | 'new' | 'assigned-to-me' | 'high-priority' | 'translation' | 'similarity' | 'needs-fix-returned' | 'previous-year';

const QUEUES: { id: QueueType; label: string; icon: typeof ClipboardCheck }[] = [
  { id: 'all', label: 'All', icon: ClipboardCheck },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'assigned-to-me', label: 'Assigned to Me', icon: User },
  { id: 'high-priority', label: 'High Priority', icon: AlertTriangle },
  { id: 'translation', label: 'Translation Review', icon: Languages },
  { id: 'similarity', label: 'Similarity Review', icon: GitCompare },
  { id: 'needs-fix-returned', label: 'Needs Fix Returned', icon: AlertTriangle },
  { id: 'previous-year', label: 'Previous-Year Verification', icon: History },
];

function derivePriority(q: Question): 'High' | 'Medium' | 'Low' {
  if (q.validationScore < 50) return 'High';
  if (q.validationScore < 70) return 'Medium';
  return 'Low';
}

function ageLabel(created: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(created).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

function slaTone(q: Question): 'success' | 'warning' | 'destructive' {
  const days = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / 86400000);
  if (days <= 2) return 'success';
  if (days <= 5) return 'warning';
  return 'destructive';
}

function today(): string { return new Date().toISOString().slice(0, 10); }

export function ContentReviewPage() {
  const allQuestions = useQuestions();
  const { dispatch, audit, activeAdminName, addReviewComment } = usePrototypeStore();
  const allSimilarity = useSimilarityResults();

  const [activeQueue, setActiveQueue] = useState<QueueType>('all');
  const [focusedMode, setFocusedMode] = useState(false);
  const [reviewQ, setReviewQ] = useState<Question | null>(null);
  const [detailTab, setDetailTab] = useState('original');
  const [newComment, setNewComment] = useState('');
  const [queueIndex, setQueueIndex] = useState(0);
  const reviewComments = useReviewComments(reviewQ?.id);
  const versions = useQuestionVersions(reviewQ?.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const reviewQueue = useMemo(() => {
    let list = allQuestions.filter((q) => q.status === 'Under Review' || q.status === 'Needs Fix');
    switch (activeQueue) {
      case 'new': list = list.filter((q) => q.status === 'Under Review' && !q.reviewer); break;
      case 'assigned-to-me': list = list.filter((q) => q.reviewer === activeAdminName); break;
      case 'high-priority': list = list.filter((q) => derivePriority(q) === 'High'); break;
      case 'translation': list = list.filter((q) => q.language.length > 1 || q.language.includes('Punjabi')); break;
      case 'similarity': {
        const simIds = new Set(allSimilarity.flatMap((s) => [s.questionId, s.similarQuestionId]));
        list = list.filter((q) => simIds.has(q.id));
        break;
      }
      case 'needs-fix-returned': list = list.filter((q) => q.status === 'Needs Fix'); break;
      case 'previous-year': list = list.filter((q) => q.source === 'Previous Year'); break;
      default: break;
    }
    return list;
  }, [allQuestions, activeQueue, activeAdminName, allSimilarity]);

  const similarQuestions = useMemo(() => {
    if (!reviewQ) return [];
    const stored = getSimilarForQuestion(reviewQ.id, allSimilarity);
    if (stored.length > 0) return stored;
    return computeSimilarity(reviewQ, allQuestions.filter((q) => q.id !== reviewQ.id)).slice(0, 5);
  }, [reviewQ, allSimilarity, allQuestions]);

  const openReview = (q: Question, index?: number) => {
    setReviewQ(q);
    setFocusedMode(true);
    setDetailTab('original');
    if (index !== undefined) setQueueIndex(index);
  };

  const advanceQueue = useCallback((direction: 'next' | 'prev') => {
    if (!reviewQ) return;
    const idx = queueIndex;
    const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (nextIdx >= 0 && nextIdx < reviewQueue.length) {
      setQueueIndex(nextIdx);
      setReviewQ(reviewQueue[nextIdx]);
      setDetailTab('original');
    } else if (direction === 'next') {
      setFocusedMode(false);
      setReviewQ(null);
      showToast.info('Queue complete', 'You have reached the end of the review queue.');
    }
  }, [reviewQ, queueIndex, reviewQueue]);

  const approve = useCallback(() => {
    if (!reviewQ) return;
    const updated: Question = { ...reviewQ, status: 'Approved', reviewer: activeAdminName, validationStatus: 'Passed', updatedAt: today() };
    audit('APPROVED', 'question', updated.id, updated.id, reviewQ.status, 'Approved', 'Approved via Content Review (keyboard: A)');
    dispatch({ type: 'UPDATE_QUESTION', question: updated });
    showToast.success('Approved', `${updated.id} approved.`);
    advanceQueue('next');
  }, [reviewQ, activeAdminName, audit, dispatch, advanceQueue]);

  const reject = useCallback(() => {
    if (!reviewQ) return;
    const updated: Question = { ...reviewQ, status: 'Rejected', updatedAt: today() };
    audit('REJECTED', 'question', updated.id, updated.id, reviewQ.status, 'Rejected', 'Rejected via Content Review (keyboard: R)');
    dispatch({ type: 'UPDATE_QUESTION', question: updated });
    showToast.error('Rejected', `${updated.id} rejected.`);
    advanceQueue('next');
  }, [reviewQ, audit, dispatch, advanceQueue]);

  const needsFix = useCallback(() => {
    if (!reviewQ) return;
    const updated: Question = { ...reviewQ, status: 'Needs Fix', updatedAt: today() };
    audit('NEEDS_FIX', 'question', updated.id, updated.id, reviewQ.status, 'Needs Fix', 'Needs fix via Content Review (keyboard: F)');
    dispatch({ type: 'UPDATE_QUESTION', question: updated });
    showToast.warning('Needs Fix', `${updated.id} sent for correction.`);
    advanceQueue('next');
  }, [reviewQ, audit, dispatch, advanceQueue]);

  const addComment = useCallback(() => {
    if (!reviewQ || !newComment.trim()) return;
    addReviewComment(reviewQ.id, {
      id: `cmt-${Date.now()}`,
      author: activeAdminName,
      timestamp: new Date().toLocaleString(),
      content: newComment.trim(),
    });
    showToast.success('Comment added', 'Your comment has been posted.');
    setNewComment('');
  }, [reviewQ, newComment, activeAdminName, addReviewComment]);

  // Keyboard shortcuts in focused mode
  useEffect(() => {
    if (!focusedMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key.toLowerCase()) {
        case 'a': e.preventDefault(); approve(); break;
        case 'f': e.preventDefault(); needsFix(); break;
        case 'r': e.preventDefault(); reject(); break;
        case 'n': e.preventDefault(); advanceQueue('next'); break;
        case 'p': e.preventDefault(); advanceQueue('prev'); break;
        case 'c': e.preventDefault(); inputRef.current?.focus(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedMode, approve, reject, needsFix, advanceQueue]);

  const columns: Column<Question>[] = [
    { key: 'question', header: 'Question', sortValue: (q) => q.stem, cell: (q) => (
      <div className="max-w-xs"><p className="truncate text-sm font-medium text-foreground">{q.stem}</p>
        <Badge variant="outline" className="mt-1 text-[10px] font-normal text-muted-foreground">{q.id}</Badge></div>
    )},
    { key: 'reviewer', header: 'Reviewer', hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{q.reviewer ?? 'Unassigned'}</span> },
    { key: 'subject', header: 'Subject', sortValue: (q) => q.subject, hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{q.subject}</span> },
    { key: 'lang', header: 'Language', hideOnMobile: true, cell: (q) => <div className="flex flex-wrap gap-1">{q.language.map((l) => <Badge key={l} variant="outline" className="text-[10px] font-normal">{l}</Badge>)}</div> },
    { key: 'age', header: 'Age', sortValue: (q) => q.createdAt, cell: (q) => <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{ageLabel(q.createdAt)}</span> },
    { key: 'sla', header: 'SLA', cell: (q) => <StatusBadge tone={slaTone(q)} className="text-[10px]">{slaTone(q) === 'success' ? 'On track' : slaTone(q) === 'warning' ? 'At risk' : 'Breached'}</StatusBadge> },
    { key: 'priority', header: 'Priority', cell: (q) => { const p = derivePriority(q); return <StatusBadge tone={p === 'High' ? 'destructive' : p === 'Medium' ? 'warning' : 'neutral'} className="text-[10px]">{p}</StatusBadge>; } },
    { key: 'status', header: 'Status', cell: (q) => <StatusBadge tone={questionStatusTone(q.status)} dot className="text-[10px]">{q.status}</StatusBadge> },
  ];

  // Focused single-question review mode
  if (focusedMode && reviewQ) {
    const totalInQueue = reviewQueue.length;
    const currentNum = queueIndex + 1;
    const similarQ = allQuestions.find((q) => q.id === similarQuestions[0]?.similarQuestionId);
  void similarQ;

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setFocusedMode(false); setReviewQ(null); }}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">{reviewQ.id}</span>
              <StatusBadge tone={questionStatusTone(reviewQ.status)} dot className="text-[10px]">{reviewQ.status}</StatusBadge>
              <StatusBadge tone={derivePriority(reviewQ) === 'High' ? 'destructive' : derivePriority(reviewQ) === 'Medium' ? 'warning' : 'neutral'} className="text-[10px]">{derivePriority(reviewQ)} priority</StatusBadge>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{currentNum} / {totalInQueue}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={queueIndex === 0} onClick={() => advanceQueue('prev')}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={queueIndex >= reviewQueue.length - 1} onClick={() => advanceQueue('next')}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <Progress value={(currentNum / totalInQueue) * 100} className="mb-4 h-1" />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Side-by-side translations */}
            {reviewQ.language.length > 1 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><Languages className="h-4 w-4" /> Translations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">English</p><p className="text-sm leading-relaxed">{reviewQ.stem}</p></div>
                    {reviewQ.stemPunjabi && <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Punjabi</p><p className="text-sm leading-relaxed">{reviewQ.stemPunjabi}</p></div>}
                  </div>
                </CardContent>
              </Card>
            )}

            {!reviewQ.language.length && (
              <Card><CardContent className="py-4"><p className="text-sm leading-relaxed text-foreground">{reviewQ.stem}</p></CardContent></Card>
            )}

            {/* Question with options */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm">Question & Options</CardTitle>
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <TabsList className="h-8"><TabsTrigger value="original" className="text-xs">Original</TabsTrigger><TabsTrigger value="edited" className="text-xs">Edited</TabsTrigger></TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                {reviewQ.language.length <= 1 && <p className="mb-3 text-sm leading-relaxed text-foreground">{reviewQ.stem}</p>}
                <TabsContent value="original" className="mt-0 space-y-2">
                  {reviewQ.options.map((o) => {
                    const correct = o.id === reviewQ.correctOption;
                    return <div key={o.id} className={cn('flex items-center gap-2 rounded-lg border p-2.5 text-sm', correct ? 'border-success/40 bg-success/10' : 'bg-card')}>
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold', correct ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>{o.id}</span>
                      <span className={cn(correct && 'font-medium text-foreground')}>{o.text}</span>
                      {correct && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                    </div>;
                  })}
                </TabsContent>
                <TabsContent value="edited" className="mt-0 space-y-2">
                  {reviewQ.options.map((o, i) => {
                    const correct = o.id === reviewQ.correctOption;
                    const revised = i === 1 ? o.text + ' (revised wording)' : o.text;
                    return <div key={o.id} className={cn('flex items-center gap-2 rounded-lg border p-2.5 text-sm', correct ? 'border-success/40 bg-success/10' : 'bg-card')}>
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold', correct ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>{o.id}</span>
                      <span className={cn(correct && 'font-medium text-foreground')}>{revised}</span>
                      {i === 1 && <Badge variant="outline" className="ml-auto text-[10px] text-info">edited</Badge>}
                    </div>;
                  })}
                </TabsContent>
              </CardContent>
            </Card>

            {/* Explanation review */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><FileText className="h-4 w-4" /> Explanation</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed text-foreground">{reviewQ.explanation}</p></CardContent>
            </Card>

            {/* Validation warnings */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-4 w-4" /> Validation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><StatusBadge tone={reviewQ.validationStatus === 'Passed' ? 'success' : reviewQ.validationStatus === 'Issues' ? 'warning' : 'neutral'} className="text-[10px]">{reviewQ.validationStatus}</StatusBadge></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="text-sm font-semibold">{reviewQ.validationScore}/100</span></div>
                {reviewQ.validationStatus === 'Issues' && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-xs text-warning"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> Validation issues detected — review explanation quality and option clarity.</div>
                )}
              </CardContent>
            </Card>

            {/* Similar questions */}
            {similarQuestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><GitCompare className="h-4 w-4" /> Similar Questions ({similarQuestions.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {similarQuestions.slice(0, 3).map((sim) => {
                    const sq = allQuestions.find((q) => q.id === sim.similarQuestionId);
                    if (!sq) return null;
                    return (
                      <div key={sim.id} className="flex items-start justify-between rounded-lg border p-2.5">
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{sq.stem}</p>
                          <div className="mt-1 flex flex-wrap gap-1">{sim.signals.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-[9px]">{SIGNAL_LABELS[s]}</Badge>)}</div></div>
                        <div className="ml-2 shrink-0 text-right"><span className={cn('text-sm font-bold', sim.score >= 70 ? 'text-destructive' : sim.score >= 50 ? 'text-warning' : 'text-muted-foreground')}>{sim.score}</span></div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Comments ({reviewComments.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {reviewComments.map((c) => (
                  <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between text-xs"><span className="font-medium text-foreground">{c.author}</span><span className="text-muted-foreground">{c.timestamp}</span></div>
                    <p className="mt-1 text-sm text-foreground">{c.content}</p>
                  </div>
                ))}
                <div className="space-y-2">
                  <Textarea ref={inputRef as never} rows={2} placeholder="Add a comment… (press C to focus)" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                  <Button size="sm" onClick={addComment}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Add Comment</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar: metadata, versions, usage */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: 'Author', value: reviewQ.author },
                  { label: 'Reviewer', value: reviewQ.reviewer ?? 'Unassigned' },
                  { label: 'Age', value: ageLabel(reviewQ.createdAt) },
                  { label: 'Difficulty', value: reviewQ.difficulty },
                  { label: 'Type', value: reviewQ.type },
                  { label: 'Source', value: reviewQ.source },
                  { label: 'Chapter', value: reviewQ.chapter },
                  { label: 'Topic', value: reviewQ.topic },
                  { label: 'Languages', value: reviewQ.language.join(', ') },
                  { label: 'Usage', value: `${reviewQ.usageCount} times` },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between"><span className="text-muted-foreground">{m.label}</span><span className="font-medium text-foreground">{m.value}</span></div>
                ))}
              </CardContent>
            </Card>

            {versions.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><History className="h-4 w-4" /> Versions ({versions.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {versions.slice(0, 5).map((v) => (
                    <div key={v.id} className="rounded-lg border p-2.5 text-xs">
                      <div className="flex items-center justify-between"><span className="font-semibold">v{v.versionNumber}</span><span className="text-muted-foreground">{v.changedAt}</span></div>
                      <p className="mt-0.5 text-muted-foreground">{v.reason}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{v.changedFields.map((f) => <Badge key={f} variant="outline" className="text-[9px]">{f}</Badge>)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><Zap className="h-4 w-4" /> Generation Info</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Source</span><Badge variant="outline" className="text-[10px]">{reviewQ.source}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Validation</span><span className="font-medium">{reviewQ.validationScore}/100</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Accuracy</span><span className="font-medium">{reviewQ.studentAccuracy}%</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Avg Time</span><span className="font-medium">{reviewQ.avgResponseSec}s</span></div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action bar with keyboard hints */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">A</kbd> Approve</span>
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">F</kbd> Needs Fix</span>
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">R</kbd> Reject</span>
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">N</kbd> Next</span>
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">P</kbd> Previous</span>
            <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">C</kbd> Comment</span>
          </div>
          <div className="flex gap-2">
            <GatedButton permission="review.reject" variant="outline" size="sm" onClick={needsFix}><AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Needs Fix</GatedButton>
            <GatedButton permission="review.reject" variant="destructive" size="sm" onClick={reject}><XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject</GatedButton>
            <GatedButton permission="review.approve" variant="default" size="sm" onClick={approve}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve</GatedButton>
          </div>
        </div>
      </div>
    );
  }

  // List mode
  return (
    <div>
      <PageHeader title="Content Review" description="Review queue for pending questions with keyboard-driven workflow." icon={<ClipboardCheck className="h-5 w-5" />} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {QUEUES.map((q) => (
          <button key={q.id} onClick={() => setActiveQueue(q.id)}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeQueue === q.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>
            <q.icon className="h-3 w-3" />{q.label}
            {activeQueue === q.id && <Badge variant="secondary" className="ml-1 text-[10px]">{reviewQueue.length}</Badge>}
          </button>
        ))}
      </div>

      {reviewQueue.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-7 w-7" />} title="Review queue is empty" description="No questions pending review in this queue." />
      ) : (
        <DataTable data={reviewQueue} columns={columns} getRowId={(q) => q.id}
          searchKeys={(q) => `${q.id} ${q.stem} ${q.subject}`}
          selectable={false} rowAction={(q) => { const idx = reviewQueue.findIndex((rq) => rq.id === q.id); openReview(q, idx); }}
          emptyTitle="No questions in queue" emptyDescription="Try a different queue." />
      )}
    </div>
  );
}
