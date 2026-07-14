import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ListChecks, ChevronLeft, ChevronRight, Check, Info, Users, FileQuestion, Eye,
  ShieldCheck, Rocket, AlertTriangle, CheckCircle2, Monitor, Smartphone,
  Languages, FileText, Upload, Sparkles, Save, LayoutGrid, Trash2, Plus, CalendarClock,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GatedButton } from '@/components/shared/GatedAction';
import { showToast } from '@/components/shared/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EXAMS, TEST_TYPES, DIFFICULTIES, LANGUAGES, REVIEWERS, SUBJECTS } from '@/data/exams';
import type { Test } from '@/data/tests';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useTests, useQuestions } from '@/app/store/selectors';
import type { TestDraft, TestDraftSection } from '@/app/store/types';
import { validateDraft, canPublish } from '@/app/store/validation';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/shared/UnsavedChangesDialog';

const STEPS = [
  { label: 'Basic Info', icon: FileText },
  { label: 'Pattern & Marking', icon: LayoutGrid },
  { label: 'Sections', icon: Users },
  { label: 'Questions', icon: FileQuestion },
  { label: 'Schedule', icon: CalendarClock },
  { label: 'Validation', icon: ShieldCheck },
  { label: 'Preview', icon: Eye },
];

const createInitialDraft = (): TestDraft => ({
  basicInfo: {
    name: '',
    examCode: '',
    testType: 'Full Mock',
    language: 'English',
    access: 'Free',
    difficulty: 'Moderate',
    description: '',
  },
  pattern: {
    totalQuestions: 100,
    totalMarks: 200,
    durationMinutes: 60,
    marksPerQuestion: 2,
    negativeMarks: 0.25,
    sectionTiming: 'shared',
    navigationRules: {
      switchSections: true,
      markForReview: true,
      preventFullscreenExit: false,
    },
  },
  sections: [],
  selectedQuestionIds: [],
  schedule: { mode: 'draft' },
});

function testToDraft(test: Test): TestDraft {
  return {
    id: test.id,
    series: test.series,
    basicInfo: {
      name: test.name,
      examCode: test.exam,
      testType: test.type,
      language: test.language,
      access: test.access,
      difficulty: test.difficulty,
      description: '',
    },
    pattern: {
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalQuestions * 2,
      durationMinutes: test.durationMin,
      marksPerQuestion: 2,
      negativeMarks: 0.25,
      sectionTiming: 'shared',
      navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false },
    },
    sections: [],
    selectedQuestionIds: [],
    schedule: {
      mode: test.status === 'Live' ? 'publish-now' : test.status === 'Scheduled' ? 'scheduled' : test.status === 'Under QA' ? 'qa' : 'draft',
      publishAt: test.scheduledDate ?? undefined,
    },
  };
}

export function TestBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') ?? undefined;
  const tests = useTests();
  const questions = useQuestions();
  const { saveTestDraft, deleteTestDraft, getTestDraft, dispatch, activeAdminName, audit } = usePrototypeStore();

  const draftKey = editId ? `test-edit-${editId}` : 'test-new';

  // Build the initial draft once: from a saved draft, or from the edited test, or fresh.
  const [initialDraft] = useState<TestDraft>(() => {
    if (editId) {
      const saved = getTestDraft(draftKey);           // in-progress edit draft
      if (saved) return saved;
      const savedFull = getTestDraft('test-saved-' + editId);  // full saved state from last save
      if (savedFull) return savedFull;
      const existing = tests.find((t) => t.id === editId);
      if (existing) return testToDraft(existing);
    }
    return createInitialDraft();
  });

  const [draft, setDraft] = useState<TestDraft>(initialDraft);
  const [step, setStep] = useState(0);

  const issues = useMemo(() => validateDraft(draft), [draft]);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const publishBlocked = !canPublish(draft);
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  // Dirty comparison vs. last saved (or initial) draft (ignoring lastSaved timestamp)
  const isDirty = useMemo(() => {
    const baseline = getTestDraft(draftKey) ?? initialDraft;
    const strip = (d: TestDraft) => { const { lastSaved: _ls, ...rest } = d; return rest; };
    return JSON.stringify(strip(draft)) !== JSON.stringify(strip(baseline));
  }, [draft, draftKey, getTestDraft, initialDraft]);

  const { blocker } = useUnsavedChanges(isDirty);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // When the in-app route blocker triggers, surface the unsaved-changes dialog.
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedDialog(true);
    }
  }, [blocker]);

  const lastSaved = getTestDraft(draftKey)?.lastSaved;

  // --- Section helpers ---
  const sectionQSum = draft.sections.reduce((a, s) => a + (Number(s.questions) || 0), 0);
  const sectionMSum = draft.sections.reduce((a, s) => a + (Number(s.marks) || 0), 0);
  const sectionDSum = draft.sections.reduce((a, s) => a + (Number(s.duration) || 0), 0);

  const addSection = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `s-${Date.now()}`,
          name: '',
          subject: SUBJECTS[0],
          questions: 0,
          marks: 0,
          duration: 0,
        },
      ],
    }));
  }, []);

  const removeSection = useCallback((id: string) => {
    setDraft((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }));
  }, []);

  const updateSection = useCallback((id: string, field: keyof TestDraftSection, value: string | number) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  }, []);

  // --- Question selection helpers ---
  const toggleQuestion = useCallback((id: string) => {
    setDraft((prev) => {
      const has = prev.selectedQuestionIds.includes(id);
      return {
        ...prev,
        selectedQuestionIds: has
          ? prev.selectedQuestionIds.filter((q) => q !== id)
          : [...prev.selectedQuestionIds, id],
      };
    });
  }, []);

  // --- Draft mutation helpers ---
  const updateBasicInfo = useCallback((field: keyof TestDraft['basicInfo'], value: string) => {
    setDraft((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, [field]: value } }));
  }, []);

  const updatePattern = useCallback((field: keyof TestDraft['pattern'], value: number | string) => {
    setDraft((prev) => ({ ...prev, pattern: { ...prev.pattern, [field]: value } as TestDraft['pattern'] }));
  }, []);

  const updateNavRule = useCallback((field: keyof TestDraft['pattern']['navigationRules'], value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      pattern: { ...prev.pattern, navigationRules: { ...prev.pattern.navigationRules, [field]: value } },
    }));
  }, []);

  const updateSchedule = useCallback((field: keyof TestDraft['schedule'], value: string) => {
    setDraft((prev) => ({ ...prev, schedule: { ...prev.schedule, [field]: value } as TestDraft['schedule'] }));
  }, []);

  // --- Navigation ---
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // --- Save / Discard ---
  const handleSaveDraft = () => {
    saveTestDraft(draftKey, draft);
    showToast.success('Draft saved', 'Progress stored for later editing.');
  };

  const handleDiscard = () => {
    deleteTestDraft(draftKey);
    setDraft(editId ? initialDraft : createInitialDraft());
    showToast.info('Changes discarded', 'The draft was reset to its initial state.');
  };

  // --- Publish / Save final ---
  const handlePublish = () => {
    if (errorCount > 0) return;

    const existing = draft.id ? tests.find((t) => t.id === draft.id) : undefined;
    const oldStatus = existing?.status ?? '—';
    const newTest: Test = {
      id: draft.id ?? `T-${Date.now()}`,
      name: draft.basicInfo.name,
      exam: draft.basicInfo.examCode,
      examName: EXAMS.find((e) => e.code === draft.basicInfo.examCode)?.name ?? draft.basicInfo.examCode,
      type: draft.basicInfo.testType,
      series: draft.series ?? 'Standalone',
      access: draft.basicInfo.access,
      language: draft.basicInfo.language,
      totalQuestions: draft.pattern.totalQuestions,
      durationMin: draft.pattern.durationMinutes,
      difficulty: draft.basicInfo.difficulty,
      status:
        draft.schedule.mode === 'publish-now'
          ? 'Live'
          : draft.schedule.mode === 'scheduled'
            ? 'Scheduled'
            : draft.schedule.mode === 'qa'
              ? 'Under QA'
              : 'Draft',
      scheduledDate: draft.schedule.publishAt ?? null,
      attempts: existing?.attempts ?? 0,
      author: activeAdminName,
    };

    const actionName =
      draft.schedule.mode === 'publish-now'
        ? 'PUBLISHED'
        : draft.schedule.mode === 'scheduled'
          ? 'SCHEDULED'
          : draft.id
            ? 'UPDATED'
            : 'CREATED';

    if (draft.id) {
      dispatch({ type: 'UPDATE_TEST', test: newTest, audit: audit(actionName, 'test', newTest.id, newTest.name, oldStatus, newTest.status, `Test ${actionName.toLowerCase()} via builder`) });
    } else {
      dispatch({ type: 'ADD_TEST', test: newTest, audit: audit(actionName, 'test', newTest.id, newTest.name, '—', newTest.status, `Test ${actionName.toLowerCase()} via builder`) });
    }

    // Persist the complete draft (sections, description, pattern, selected
    // questions, etc.) alongside the test so editing it later restores every
    // field instead of just the flattened Test fields.
    saveTestDraft('test-saved-' + newTest.id, draft);

    deleteTestDraft(draftKey);
    showToast.success('Test saved', `${newTest.name} has been ${actionName.toLowerCase()}.`);
    navigate(draft.id ? `/tests/${draft.id}` : '/tests');
  };


  return (
    <div>
      <PageHeader
        title="Test Builder"
        description="Create a new test through a guided multi-step workflow."
        icon={<ListChecks className="h-5 w-5" />}
        actions={
          <>
            {isDirty && <Badge variant="secondary" className="mr-2 bg-warning/15 text-warning">Unsaved changes</Badge>}
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>
              <Save className="mr-1.5 h-4 w-4" /> Save Draft
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Discard
            </Button>
            <Button variant="ghost" size="sm" asChild><Link to="/tests">Cancel</Link></Button>
          </>
        }
      />

      {lastSaved && (
        <p className="mb-3 text-xs text-muted-foreground">
          Last saved: {new Date(lastSaved).toLocaleString()}
        </p>
      )}

      {/* Stepper */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const current = i === step;
            return (
              <div key={s.label} className="flex items-center">
                <button
                  onClick={() => setStep(i)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    current && 'border-primary bg-primary/10 text-primary',
                    done && 'border-success/30 bg-success/10 text-success',
                    !current && !done && 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    current && 'bg-primary text-primary-foreground',
                    done && 'bg-success text-success-foreground',
                    !current && !done && 'bg-muted text-muted-foreground',
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="hidden font-medium sm:inline">{s.label}</span>
                  <Icon className="h-4 w-4 sm:hidden" />
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="mx-0.5 h-4 w-4 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* STEP 0 — Basic Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-semibold">Basic Info</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Test Name</Label>
                  <Input
                    placeholder="e.g. SSC CGL Tier 1 - Full Mock Test 1"
                    value={draft.basicInfo.name}
                    onChange={(e) => updateBasicInfo('name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Exam</Label>
                  <Select value={draft.basicInfo.examCode} onValueChange={(v) => updateBasicInfo('examCode', v)}>
                    <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                    <SelectContent>{EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Test Type</Label>
                  <Select value={draft.basicInfo.testType} onValueChange={(v) => updateBasicInfo('testType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{TEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Select value={draft.basicInfo.language} onValueChange={(v) => updateBasicInfo('language', v)}>
                    <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Access</Label>
                  <Select value={draft.basicInfo.access} onValueChange={(v) => updateBasicInfo('access', v)}>
                    <SelectTrigger><SelectValue placeholder="Select access" /></SelectTrigger>
                    <SelectContent><SelectItem value="Free">Free</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={draft.basicInfo.difficulty} onValueChange={(v) => updateBasicInfo('difficulty', v)}>
                    <SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger>
                    <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Short description shown to students…"
                    rows={3}
                    value={draft.basicInfo.description}
                    onChange={(e) => updateBasicInfo('description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Pattern & Marking */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-semibold">Pattern & Marking</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Total Questions</Label>
                  <Input type="number" placeholder="100" value={draft.pattern.totalQuestions} onChange={(e) => updatePattern('totalQuestions', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Marks</Label>
                  <Input type="number" placeholder="200" value={draft.pattern.totalMarks} onChange={(e) => updatePattern('totalMarks', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" placeholder="60" value={draft.pattern.durationMinutes} onChange={(e) => updatePattern('durationMinutes', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Marks per Question</Label>
                  <Input type="number" placeholder="2" value={draft.pattern.marksPerQuestion} onChange={(e) => updatePattern('marksPerQuestion', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Negative Marking</Label>
                  <Input type="number" step="0.25" placeholder="0.5" value={draft.pattern.negativeMarks} onChange={(e) => updatePattern('negativeMarks', Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Section Timing</Label>
                  <Select value={draft.pattern.sectionTiming} onValueChange={(v) => updatePattern('sectionTiming', v)}>
                    <SelectTrigger><SelectValue placeholder="Select timing" /></SelectTrigger>
                    <SelectContent><SelectItem value="shared">Shared</SelectItem><SelectItem value="sectional">Sectional</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">Navigation Rules</p>
                <div className="space-y-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox checked={draft.pattern.navigationRules.switchSections} onCheckedChange={(v) => updateNavRule('switchSections', !!v)} />
                    Allow switching between sections
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox checked={draft.pattern.navigationRules.markForReview} onCheckedChange={(v) => updateNavRule('markForReview', !!v)} />
                    Allow mark for review
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <Checkbox checked={draft.pattern.navigationRules.preventFullscreenExit} onCheckedChange={(v) => updateNavRule('preventFullscreenExit', !!v)} />
                    Prevent exit from full-screen
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Sections */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Sections</h3>
                <Button variant="outline" size="sm" onClick={addSection}><Plus className="mr-1.5 h-4 w-4" /> Add Section</Button>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Section Name</th>
                      <th className="p-3 font-medium">Subject</th>
                      <th className="p-3 font-medium">Questions</th>
                      <th className="p-3 font-medium">Marks</th>
                      <th className="p-3 font-medium">Duration</th>
                      <th className="w-10 p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.sections.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">
                          <Input value={s.name} onChange={(e) => updateSection(s.id, 'name', e.target.value)} placeholder="Section name" className="h-8" />
                        </td>
                        <td className="w-40 p-2">
                          <Select value={s.subject} onValueChange={(v) => updateSection(s.id, 'subject', v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{SUBJECTS.map((sub) => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="w-24 p-2">
                          <Input type="number" value={s.questions} onChange={(e) => updateSection(s.id, 'questions', Number(e.target.value))} className="h-8" />
                        </td>
                        <td className="w-24 p-2">
                          <Input type="number" value={s.marks} onChange={(e) => updateSection(s.id, 'marks', Number(e.target.value))} className="h-8" />
                        </td>
                        <td className="w-24 p-2">
                          <Input type="number" value={s.duration} onChange={(e) => updateSection(s.id, 'duration', Number(e.target.value))} className="h-8" />
                        </td>
                        <td className="p-2 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSection(s.id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {draft.sections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                          No sections yet. Click "Add Section" to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t bg-muted/30 font-medium">
                    <tr>
                      <td className="p-3">Total</td>
                      <td className="p-3" />
                      <td className="p-3">
                        <span className={cn(sectionQSum !== draft.pattern.totalQuestions && draft.sections.length > 0 && 'text-warning')}>{sectionQSum}</span>
                        <span className="text-muted-foreground"> / {draft.pattern.totalQuestions}</span>
                      </td>
                      <td className="p-3">
                        <span className={cn(sectionMSum !== draft.pattern.totalMarks && draft.sections.length > 0 && 'text-warning')}>{sectionMSum}</span>
                        <span className="text-muted-foreground"> / {draft.pattern.totalMarks}</span>
                      </td>
                      <td className="p-3">{sectionDSum === 0 ? 'Shared' : sectionDSum}</td>
                      <td className="p-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-sm text-info">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Topic distribution can be configured per section in the Questions step. Blueprint auto-fill is recommended for balanced coverage.</span>
              </div>
            </div>
          )}

          {/* STEP 3 — Questions */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold">Questions</h3>
              <Tabs defaultValue="manual">
                <TabsList>
                  <TabsTrigger value="manual"><FileQuestion className="mr-1.5 h-4 w-4" /> Select Manually</TabsTrigger>
                  <TabsTrigger value="batch"><Users className="mr-1.5 h-4 w-4" /> Approved Batch</TabsTrigger>
                  <TabsTrigger value="blueprint"><Sparkles className="mr-1.5 h-4 w-4" /> From Blueprint</TabsTrigger>
                  <TabsTrigger value="import"><Upload className="mr-1.5 h-4 w-4" /> Import File</TabsTrigger>
                </TabsList>

                <TabsContent value="manual">
                  <div className="rounded-lg border">
                    <div className="flex items-center justify-between border-b p-3">
                      <p className="text-sm font-medium">
                        {draft.selectedQuestionIds.length} of {questions.length} approved questions selected
                        <span className="ml-2 text-muted-foreground">(target: {draft.pattern.totalQuestions})</span>
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setDraft((p) => ({ ...p, selectedQuestionIds: [] }))}>Clear</Button>
                    </div>
                    <div className="max-h-[420px] divide-y overflow-y-auto">
                      {questions.map((q) => {
                        const selected = draft.selectedQuestionIds.includes(q.id);
                        return (
                          <label key={q.id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
                            <Checkbox checked={selected} onCheckedChange={() => toggleQuestion(q.id)} className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{q.id}</span>
                                <StatusBadge tone="success" className="text-[10px]">{q.status}</StatusBadge>
                                <span className="text-xs text-muted-foreground">{q.subject}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-foreground">{q.stem}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="batch">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">Browse approved question batches</p>
                    <p className="mt-1 text-xs text-muted-foreground">Select a curated batch by subject, chapter, or difficulty.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => showToast.info('Batch browser', 'Approved batches list would open here.')}>Browse Batches</Button>
                  </div>
                </TabsContent>

                <TabsContent value="blueprint">
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-1.5">
                      <Label>Exam for Blueprint</Label>
                      <Select value={draft.basicInfo.examCode} onValueChange={(v) => updateBasicInfo('examCode', v)}>
                        <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                        <SelectContent>{EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => showToast.success('Auto-build complete', 'Questions mapped from blueprint pattern.')}><Sparkles className="mr-1.5 h-4 w-4" /> Auto-Build from Blueprint</Button>
                  </div>
                </TabsContent>

                <TabsContent value="import">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">Drag & drop a CSV or Excel file</p>
                    <p className="mt-1 text-xs text-muted-foreground">Supported formats: .csv, .xlsx — max 5MB</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => showToast.info('File picker', 'Upload dialog would open here.')}>Browse Files</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* STEP 4 — Schedule */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="font-display text-lg font-semibold">Schedule & Publish</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  { key: 'draft', title: 'Keep as Draft', desc: 'Save without publishing — edit later.', icon: Save, tone: 'neutral' as const },
                  { key: 'qa', title: 'Submit for QA', desc: 'Assign a reviewer to validate before release.', icon: ShieldCheck, tone: 'info' as const },
                  { key: 'publish-now', title: 'Publish Now', desc: 'Make the test immediately available to students.', icon: Rocket, tone: 'primary' as const },
                  { key: 'scheduled', title: 'Schedule', desc: 'Set a future date and time for release.', icon: CalendarClock, tone: 'info' as const },
                ]).map((c) => {
                  const Icon = c.icon;
                  const active = draft.schedule.mode === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => updateSchedule('mode', c.key)}
                      className={cn(
                        'flex flex-col items-start rounded-lg border p-5 text-left transition-colors',
                        active
                          ? (c.tone === 'primary' ? 'border-primary bg-primary/5 ring-1 ring-primary' : c.tone === 'info' ? 'border-info bg-info/5 ring-1 ring-info' : 'border-muted-foreground bg-muted/30 ring-1 ring-muted-foreground')
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <Icon className="mb-3 h-6 w-6 text-foreground" />
                      <p className="font-medium">{c.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                    </button>
                  );
                })}
              </div>

              {draft.schedule.mode === 'qa' && (
                <div className="rounded-lg border p-5">
                  <h4 className="font-medium">Reviewer</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Assign a reviewer to validate the test before it goes live.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label>Reviewer</Label>
                      <Select value={draft.schedule.reviewerId ?? ''} onValueChange={(v) => updateSchedule('reviewerId', v)}>
                        <SelectTrigger><SelectValue placeholder="Select reviewer" /></SelectTrigger>
                        <SelectContent>{REVIEWERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {draft.schedule.mode === 'scheduled' && (
                <div className="rounded-lg border p-5">
                  <h4 className="font-medium">Publish Date & Time</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Choose when the test should go live.</p>
                  <div className="mt-4 max-w-xs space-y-1.5">
                    <Label>Publish At</Label>
                    <Input
                      type="datetime-local"
                      value={draft.schedule.publishAt ?? ''}
                      onChange={(e) => updateSchedule('publishAt', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 — Validation */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="font-display text-lg font-semibold">Validation</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-4"><div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /><span className="font-display text-2xl font-bold">{errorCount}</span></div><p className="mt-1 text-xs text-muted-foreground">Errors</p></Card>
                <Card className="p-4"><div className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5" /><span className="font-display text-2xl font-bold">{warningCount}</span></div><p className="mt-1 text-xs text-muted-foreground">Warnings</p></Card>
                <Card className="p-4"><div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /><span className="font-display text-2xl font-bold">{Math.max(0, 12 - errorCount - warningCount)}</span></div><p className="mt-1 text-xs text-muted-foreground">Passed checks</p></Card>
                <Card className="p-4"><div className="flex items-center gap-2 text-info"><ShieldCheck className="h-5 w-5" /><span className="font-display text-2xl font-bold">{Math.max(0, 100 - errorCount * 15 - warningCount * 5)}%</span></div><p className="mt-1 text-xs text-muted-foreground">Validation score</p></Card>
              </div>

              <div className="space-y-2">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/5 p-3">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <p className="text-sm font-medium text-success">No issues detected. The test is ready to publish.</p>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3',
                        issue.severity === 'error' && 'border-destructive/30 bg-destructive/5',
                        issue.severity === 'warning' && 'border-warning/30 bg-warning/5',
                        issue.severity === 'info' && 'border-info/30 bg-info/5',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {issue.severity === 'error'
                          ? <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                          : issue.severity === 'warning'
                            ? <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                            : <Info className="mt-0.5 h-4 w-4 text-info" />}
                        <div>
                          <p className="text-sm font-medium">{issue.title}</p>
                          <p className="text-sm text-muted-foreground">{issue.description}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => showToast.info('Fix applied', issue.suggestedAction)}>{issue.suggestedAction}</Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-info/10 p-3 text-sm text-info">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Validation checks include question count matching, translation completeness, duplicate detection, marks consistency, and explanation coverage.</span>
              </div>
            </div>
          )}

          {/* STEP 6 — Preview */}
          {step === 6 && (
            <div className="space-y-6">
              <h3 className="font-display text-lg font-semibold">Preview</h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{draft.basicInfo.name || '—'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Exam</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {(EXAMS.find((e) => e.code === draft.basicInfo.examCode)?.name ?? draft.basicInfo.examCode) || '—'}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Type / Language</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{draft.basicInfo.testType} · {draft.basicInfo.language}</p>
                </Card>
              </div>

              <div className="rounded-lg border p-5">
                <h4 className="font-medium">Pattern</h4>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                  <div><p className="text-xs text-muted-foreground">Questions</p><p className="font-medium">{draft.pattern.totalQuestions}</p></div>
                  <div><p className="text-xs text-muted-foreground">Marks</p><p className="font-medium">{draft.pattern.totalMarks}</p></div>
                  <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium">{draft.pattern.durationMinutes} min</p></div>
                  <div><p className="text-xs text-muted-foreground">Marks/Q</p><p className="font-medium">{draft.pattern.marksPerQuestion}</p></div>
                  <div><p className="text-xs text-muted-foreground">Negative</p><p className="font-medium">{draft.pattern.negativeMarks}</p></div>
                  <div><p className="text-xs text-muted-foreground">Timing</p><p className="font-medium capitalize">{draft.pattern.sectionTiming}</p></div>
                </div>
              </div>

              <div className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Sections</h4>
                  <span className="text-xs text-muted-foreground">{draft.sections.length} section(s)</span>
                </div>
                {draft.sections.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No sections defined.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr><th className="py-2 font-medium">Name</th><th className="py-2 font-medium">Subject</th><th className="py-2 font-medium">Q</th><th className="py-2 font-medium">Marks</th><th className="py-2 font-medium">Duration</th></tr>
                      </thead>
                      <tbody>
                        {draft.sections.map((s) => (
                          <tr key={s.id} className="border-t">
                            <td className="py-2 font-medium">{s.name || '—'}</td>
                            <td className="py-2 text-muted-foreground">{s.subject}</td>
                            <td className="py-2">{s.questions}</td>
                            <td className="py-2">{s.marks}</td>
                            <td className="py-2">{s.duration === 0 ? 'Shared' : s.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="p-5">
                  <h4 className="font-medium">Questions</h4>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Selected</span>
                      <span className="font-medium">{draft.selectedQuestionIds.length} of {draft.pattern.totalQuestions}</span>
                    </div>
                    <Progress value={draft.pattern.totalQuestions > 0 ? (draft.selectedQuestionIds.length / draft.pattern.totalQuestions) * 100 : 0} />
                  </div>
                </Card>
                <Card className="p-5">
                  <h4 className="font-medium">Schedule</h4>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium capitalize">{draft.schedule.mode}</span>
                    </div>
                    {draft.schedule.reviewerId && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reviewer</span>
                        <span className="font-medium">{draft.schedule.reviewerId}</span>
                      </div>
                    )}
                    {draft.schedule.publishAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Publish At</span>
                        <span className="font-medium">{draft.schedule.publishAt}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Preview tabs kept for visual parity */}
              <Tabs defaultValue="desktop">
                <TabsList>
                  <TabsTrigger value="desktop"><Monitor className="mr-1.5 h-4 w-4" /> Desktop</TabsTrigger>
                  <TabsTrigger value="mobile"><Smartphone className="mr-1.5 h-4 w-4" /> Mobile</TabsTrigger>
                  <TabsTrigger value="bilingual"><Languages className="mr-1.5 h-4 w-4" /> Bilingual</TabsTrigger>
                  <TabsTrigger value="answers"><FileText className="mr-1.5 h-4 w-4" /> Answer Key</TabsTrigger>
                </TabsList>

                <TabsContent value="desktop">
                  <div className="rounded-lg border bg-muted/20 p-6">
                    <div className="mx-auto max-w-2xl rounded-lg border bg-background p-6 shadow-sm">
                      <div className="flex items-center justify-between border-b pb-3">
                        <p className="text-sm font-medium">Question 1 of {draft.pattern.totalQuestions}</p>
                        <span className="text-xs text-muted-foreground">{String(Math.floor(draft.pattern.durationMinutes / 2)).padStart(2, '0')}:45:21</span>
                      </div>
                      <p className="mt-4 text-sm">{questions[0]?.stem ?? 'Sample question stem will appear here.'}</p>
                      <div className="mt-4 space-y-2">
                        {questions[0]?.options.map((o, i) => (
                          <div key={o.id} className={cn('flex items-center gap-2 rounded-md border p-2.5 text-sm', i === 0 && 'border-success bg-success/10')}>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium">{String.fromCharCode(65 + i)}</span>
                            {o.text}
                          </div>
                        )) ?? <p className="text-sm text-muted-foreground">No questions available.</p>}
                      </div>
                      <div className="mt-4 flex justify-between border-t pt-3">
                        <Button variant="outline" size="sm">Mark for Review</Button>
                        <Button size="sm">Save & Next</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="mobile">
                  <div className="flex justify-center rounded-lg border bg-muted/20 p-6">
                    <div className="w-64 rounded-[2rem] border-4 border-foreground/20 bg-background p-3">
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <p className="text-xs font-medium">Q1 / {draft.pattern.totalQuestions}</p>
                        <p className="mt-2 text-xs">{questions[0]?.stem ?? 'Sample question stem…'}</p>
                        <div className="mt-3 space-y-1.5">
                          {questions[0]?.options.map((o) => <div key={o.id} className="rounded-md border px-2 py-1.5 text-xs">{o.text}</div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="bilingual">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {['English', draft.basicInfo.language === 'Punjabi' ? 'ਪੰਜਾਬੀ (Punjabi)' : 'हिन्दी (Hindi)'].map((lang) => (
                      <div key={lang} className="rounded-lg border p-4">
                        <StatusBadge tone="info" className="mb-3">{lang}</StatusBadge>
                        <p className="text-sm">{questions[0]?.stem ?? 'Sample question stem.'}</p>
                        <div className="mt-3 space-y-1.5">
                          {questions[0]?.options.map((o) => <div key={o.id} className="rounded-md border px-2 py-1.5 text-sm">{o.text}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="answers">
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <tr><th className="p-3 font-medium">Q#</th><th className="p-3 font-medium">Correct</th><th className="p-3 font-medium">Marks</th></tr>
                      </thead>
                      <tbody>
                        {questions.slice(0, 10).map((q, i) => (
                          <tr key={q.id} className="border-t">
                            <td className="p-3 font-medium">{i + 1}</td>
                            <td className="p-3">{q.correctOption}</td>
                            <td className="p-3">+{draft.pattern.marksPerQuestion} / -{draft.pattern.negativeMarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 0}><ChevronLeft className="mr-1.5 h-4 w-4" /> Previous</Button>
        <span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        {step === STEPS.length - 1 ? (
          <div className="flex items-center gap-2">
            {publishBlocked ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <GatedButton
                        permission={draft.schedule.mode === 'publish-now' ? 'tests.publish' : 'tests.create'}
                        onClick={handlePublish}
                        disabled
                      >
                        <Rocket className="mr-1.5 h-4 w-4" />
                        {draft.schedule.mode === 'publish-now' ? 'Publish' : 'Save Final'}
                      </GatedButton>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{errorCount} error(s) must be resolved before publishing.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <GatedButton
                permission={draft.schedule.mode === 'publish-now' ? 'tests.publish' : 'tests.create'}
                onClick={handlePublish}
              >
                <Rocket className="mr-1.5 h-4 w-4" />
                {draft.schedule.mode === 'publish-now' ? 'Publish' : 'Save Final'}
              </GatedButton>
            )}
          </div>
        ) : (
          <Button onClick={next}>Next <ChevronRight className="ml-1.5 h-4 w-4" /></Button>
        )}
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSave={() => {
          handleSaveDraft();
          setShowUnsavedDialog(false);
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onDiscard={() => {
          deleteTestDraft(draftKey);
          setShowUnsavedDialog(false);
          if (blocker.state === 'blocked') blocker.proceed();
        }}
        onContinue={() => {
          setShowUnsavedDialog(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
      />
    </div>
  );
}
