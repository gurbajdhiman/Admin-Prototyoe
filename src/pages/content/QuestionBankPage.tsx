import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileQuestion, Plus, Table as TableIcon, LayoutGrid, SlidersHorizontal,
  Eye, Pencil, CheckCircle2, Archive, Clock, Target, FileText, Languages,
  UserPlus, Send,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, questionStatusTone, difficultyTone } from '@/components/shared/StatusBadge';
import { DataTable, type Column, type TableSettings, type FilterChip } from '@/components/shared/DataTable';
import { SavedViewsBar } from '@/components/shared/SavedViewsBar';
import { FilterBar, type FilterDef } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { showToast } from '@/components/shared/toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  FILTER_EXAMS, FILTER_SUBJECTS, FILTER_DIFFICULTY,
  FILTER_LANGUAGE, FILTER_STATUS, FILTER_QTYPE, type Question,
} from '@/data/questions';
import { EXAMS, REVIEWERS } from '@/data/exams';
import { useQuestions } from '@/app/store/selectors';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { GatedButton } from '@/components/shared/GatedAction';
import type { SavedView, SavedViewState } from '@/app/store/types';

const BUILTIN_VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'generated', label: 'Generated' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'needs-fix', label: 'Needs Fix' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'archived', label: 'Archived' },
  { id: 'unused', label: 'Unused' },
  { id: 'frequently-used', label: 'Frequently Used' },
  { id: 'duplicates', label: 'Potential Duplicates' },
] as const;

const LANG_BADGE: Record<string, string> = {
  English: 'bg-primary/10 text-primary', Hindi: 'bg-info/10 text-info', Punjabi: 'bg-brand-accent/10 text-brand-accent',
};

function scoreTone(score: number) {
  return score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
}

function today(): string { return new Date().toISOString().slice(0, 10); }

const PAGE_KEY = '/content/questions';
const DEFAULT_COLUMNS = ['question', 'exam', 'subject', 'source', 'author', 'reviewer', 'level', 'lang', 'usage', 'validation', 'score', 'status'];

export function QuestionBankPage() {
  const questions = useQuestions();
  const { dispatch, activeAdminName, audit } = usePrototypeStore();
  const [searchParams] = useSearchParams();

  const [view, setView] = useState<'table' | 'grid'>('table');
  const [activeBuiltin, setActiveBuiltin] = useState<string>('all');
  const [activeSavedView, setActiveSavedView] = useState<SavedView | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string>>({});
  const [previewQ, setPreviewQ] = useState<Question | null>(null);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({ stem: '', stemPunjabi: '', options: ['', '', '', ''], explanation: '', difficulty: 'Moderate', status: 'Draft' });

  const [tableSettings, setTableSettings] = useState<TableSettings>({
    visibleColumns: DEFAULT_COLUMNS,
    columnOrder: DEFAULT_COLUMNS,
    pageSize: 25,
  });

  useEffect(() => {
    const examFilter = searchParams.get('exam');
    const subjectFilter = searchParams.get('subject');
    if (examFilter) setFilters((p) => ({ ...p, exam: examFilter }));
    if (subjectFilter) setFilters((p) => ({ ...p, subject: subjectFilter }));
  }, [searchParams]);

  const filterDefs: FilterDef[] = [
    { key: 'exam', label: 'Exam', options: FILTER_EXAMS },
    { key: 'subject', label: 'Subject', options: FILTER_SUBJECTS },
    { key: 'difficulty', label: 'Difficulty', options: FILTER_DIFFICULTY },
    { key: 'language', label: 'Language', options: FILTER_LANGUAGE },
    { key: 'status', label: 'Status', options: FILTER_STATUS },
    { key: 'type', label: 'Type', options: FILTER_QTYPE },
  ];

  const advancedDefs: FilterDef[] = [
    { key: 'chapter', label: 'Chapter', options: [{ label: 'Profit & Loss', value: 'Profit & Loss' }, { label: 'Coding-Decoding', value: 'Coding-Decoding' }, { label: 'Vocabulary', value: 'Vocabulary' }] },
    { key: 'topic', label: 'Topic', options: [{ label: 'Successive Discount', value: 'Successive Discount' }, { label: 'Letter Coding', value: 'Letter Coding' }, { label: 'Synonyms', value: 'Synonyms' }] },
    { key: 'source', label: 'Source', options: [{ label: 'In-house Author', value: 'In-house Author' }, { label: 'Previous Year', value: 'Previous Year' }, { label: 'AI Generated', value: 'AI Generated' }] },
    { key: 'validationStatus', label: 'Validation', options: [{ label: 'Passed', value: 'Passed' }, { label: 'Issues', value: 'Issues' }, { label: 'Pending', value: 'Pending' }] },
    { key: 'createdBy', label: 'Created By', options: [{ label: 'Ravneet Thind', value: 'Ravneet Thind' }, { label: 'Harpreet Kaur', value: 'Harpreet Kaur' }, { label: 'Arjun Mehta', value: 'Arjun Mehta' }] },
    { key: 'reviewedBy', label: 'Reviewed By', options: REVIEWERS.map((r) => ({ label: r, value: r })) },
  ];

  const filtered = useMemo(() => {
    let list = questions;
    switch (activeBuiltin) {
      case 'draft': list = list.filter((q) => q.status === 'Draft'); break;
      case 'generated': list = list.filter((q) => q.status === 'Generated'); break;
      case 'under-review': list = list.filter((q) => q.status === 'Under Review'); break;
      case 'needs-fix': list = list.filter((q) => q.status === 'Needs Fix'); break;
      case 'approved': list = list.filter((q) => q.status === 'Approved'); break;
      case 'rejected': list = list.filter((q) => q.status === 'Rejected'); break;
      case 'archived': list = list.filter((q) => q.status === 'Archived'); break;
      case 'unused': list = list.filter((q) => q.usageCount === 0); break;
      case 'frequently-used': list = list.filter((q) => q.usageCount >= 50); break;
      case 'duplicates': {
        const stems = new Map<string, number>();
        list.forEach((q) => stems.set(q.stem, (stems.get(q.stem) ?? 0) + 1));
        list = list.filter((q) => (stems.get(q.stem) ?? 0) > 1);
        break;
      }
    }
    if (filters.exam && filters.exam !== 'all') list = list.filter((q) => q.exam === filters.exam);
    if (filters.subject && filters.subject !== 'all') list = list.filter((q) => q.subject === filters.subject);
    if (filters.difficulty && filters.difficulty !== 'all') list = list.filter((q) => q.difficulty === filters.difficulty);
    if (filters.language && filters.language !== 'all') list = list.filter((q) => q.language.includes(filters.language));
    if (filters.status && filters.status !== 'all') list = list.filter((q) => q.status === filters.status);
    if (filters.type && filters.type !== 'all') list = list.filter((q) => q.type === filters.type);
    if (advancedFilters.chapter && advancedFilters.chapter !== 'all') list = list.filter((q) => q.chapter === advancedFilters.chapter);
    if (advancedFilters.topic && advancedFilters.topic !== 'all') list = list.filter((q) => q.topic === advancedFilters.topic);
    if (advancedFilters.source && advancedFilters.source !== 'all') list = list.filter((q) => q.source === advancedFilters.source);
    if (advancedFilters.validationStatus && advancedFilters.validationStatus !== 'all') list = list.filter((q) => q.validationStatus === advancedFilters.validationStatus);
    if (advancedFilters.createdBy && advancedFilters.createdBy !== 'all') list = list.filter((q) => q.author === advancedFilters.createdBy);
    if (advancedFilters.reviewedBy && advancedFilters.reviewedBy !== 'all') list = list.filter((q) => q.reviewer === advancedFilters.reviewedBy);
    return list;
  }, [questions, activeBuiltin, filters, advancedFilters]);

  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== 'all') {
        const def = filterDefs.find((f) => f.key === key);
        const opt = def?.options.find((o) => o.value === value);
        chips.push({ key, label: def?.label ?? key, value: opt?.label ?? value });
      }
    }
    for (const [key, value] of Object.entries(advancedFilters)) {
      if (value && value !== 'all') {
        const def = advancedDefs.find((f) => f.key === key);
        const opt = def?.options.find((o) => o.value === value);
        chips.push({ key, label: def?.label ?? key, value: opt?.label ?? value });
      }
    }
    return chips;
  }, [filters, advancedFilters]);

  const clearChip = (key: string) => {
    setFilters((p) => { const n = { ...p }; delete n[key]; return n; });
    setAdvancedFilters((p) => { const n = { ...p }; delete n[key]; return n; });
  };
  const clearAllChips = () => { setFilters({}); setAdvancedFilters({}); };

  const openEdit = (q: Question) => {
    setEditQ(q);
    setEditForm({
      stem: q.stem, stemPunjabi: q.stemPunjabi ?? '',
      options: q.options.map((o) => o.text), explanation: q.explanation,
      difficulty: q.difficulty, status: q.status,
    });
  };

  const saveEdit = () => {
    if (!editQ) return;
    const updatedQuestion: Question = {
      ...editQ, stem: editForm.stem, stemPunjabi: editForm.stemPunjabi || undefined,
      options: editQ.options.map((o, i) => ({ ...o, text: editForm.options[i] ?? o.text })),
      explanation: editForm.explanation, difficulty: editForm.difficulty, status: editForm.status, updatedAt: today(),
    };
    audit('EDITED', 'question', updatedQuestion.id, updatedQuestion.id, editQ.status, updatedQuestion.status, 'Question edited via Question Bank');
    dispatch({ type: 'UPDATE_QUESTION', question: updatedQuestion });
    showToast.success('Question updated', `${updatedQuestion.id} saved successfully.`);
    setEditQ(null);
  };

  const examName = (code: string) => EXAMS.find((e) => e.code === code)?.name ?? code;

  const columns: Column<Question>[] = useMemo(() => [
    { key: 'question', header: 'Question', sortValue: (q) => q.stem, cell: (q) => (
      <div className="max-w-xs"><p className="truncate text-sm font-medium text-foreground">{q.stem}</p>
        <div className="mt-1 flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">{q.id}</Badge><Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">{q.chapter}</Badge></div></div>
    )},
    { key: 'exam', header: 'Exam', sortValue: (q) => q.exam, hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{examName(q.exam)}</span> },
    { key: 'subject', header: 'Subject', sortValue: (q) => q.subject, hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{q.subject}</span> },
    { key: 'source', header: 'Source', sortValue: (q) => q.source, hideOnMobile: true, cell: (q) => <Badge variant="outline" className="text-[10px]">{q.source}</Badge> },
    { key: 'author', header: 'Author', sortValue: (q) => q.author, hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{q.author}</span> },
    { key: 'reviewer', header: 'Reviewer', sortValue: (q) => q.reviewer ?? 'ZZZ', hideOnMobile: true, cell: (q) => <span className="text-sm text-muted-foreground">{q.reviewer ?? '—'}</span> },
    { key: 'level', header: 'Level', sortValue: (q) => q.difficulty, cell: (q) => <StatusBadge tone={difficultyTone(q.difficulty)} className="text-[10px]">{q.difficulty}</StatusBadge> },
    { key: 'lang', header: 'Lang', hideOnMobile: true, cell: (q) => <div className="flex flex-wrap gap-1">{q.language.map((l) => <span key={l} className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', LANG_BADGE[l] ?? 'bg-muted text-muted-foreground')}>{l}</span>)}</div> },
    { key: 'usage', header: 'Usage', sortValue: (q) => q.usageCount, hideOnMobile: true, cell: (q) => <span className="text-sm font-medium">{q.usageCount}</span> },
    { key: 'validation', header: 'Validation', sortValue: (q) => q.validationStatus, hideOnMobile: true, cell: (q) => <StatusBadge tone={q.validationStatus === 'Passed' ? 'success' : q.validationStatus === 'Issues' ? 'warning' : 'neutral'} className="text-[10px]">{q.validationStatus}</StatusBadge> },
    { key: 'score', header: 'Score', sortValue: (q) => q.validationScore, hideOnMobile: true, cell: (q) => <span className={cn('text-sm font-semibold', scoreTone(q.validationScore))}>{q.validationScore}</span> },
    { key: 'status', header: 'Status', cell: (q) => <StatusBadge tone={questionStatusTone(q.status)} dot className="text-[10px]">{q.status}</StatusBadge> },
    { key: 'actions', header: '', className: 'w-24 text-right', cell: (q) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPreviewQ(q); }}><Eye className="h-3.5 w-3.5" /></Button>
        <span onClick={(e) => e.stopPropagation()}><GatedButton permission="questions.edit" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></GatedButton></span>
      </div>
    )},
  ], []);

  const bulkApprove = () => {
    const selected = questions.filter((q) => selectedIds.includes(q.id));
    if (selected.length === 0) return;
    const updated = selected.map((q) => ({ ...q, status: 'Approved' as const, reviewer: activeAdminName, validationStatus: 'Passed' as const, updatedAt: today() }));
    audit('APPROVED', 'question', selectedIds.join(','), `${selected.length} questions`, selected[0].status, 'Approved', 'Bulk approval via Question Bank');
    dispatch({ type: 'UPDATE_QUESTIONS', questions: updated });
    showToast.success('Questions approved', `${selected.length} question(s) moved to Approved.`);
    setSelectedIds([]);
  };

  const bulkArchive = () => {
    const selected = questions.filter((q) => selectedIds.includes(q.id));
    if (selected.length === 0) return;
    const updated = selected.map((q) => ({ ...q, status: 'Archived' as const, updatedAt: today() }));
    audit('ARCHIVED', 'question', selectedIds.join(','), `${selected.length} questions`, selected[0].status, 'Archived', 'Bulk archive via Question Bank');
    dispatch({ type: 'UPDATE_QUESTIONS', questions: updated });
    showToast.warning('Questions archived', `${selected.length} question(s) archived.`);
    setSelectedIds([]);
  };

  const bulkAssignReviewer = (reviewer: string) => {
    const selected = questions.filter((q) => selectedIds.includes(q.id));
    if (selected.length === 0) return;
    const updated = selected.map((q) => ({ ...q, reviewer, updatedAt: today() }));
    audit('ASSIGNED', 'question', selectedIds.join(','), `${selected.length} questions → ${reviewer}`, '', reviewer, 'Bulk reviewer assignment');
    dispatch({ type: 'UPDATE_QUESTIONS', questions: updated });
    showToast.success('Reviewer assigned', `${reviewer} assigned to ${selected.length} question(s).`);
    setSelectedIds([]);
  };

  const bulkChangeDifficulty = (difficulty: string) => {
    const selected = questions.filter((q) => selectedIds.includes(q.id));
    if (selected.length === 0) return;
    const updated = selected.map((q) => ({ ...q, difficulty, updatedAt: today() }));
    audit('UPDATED', 'question', selectedIds.join(','), `${selected.length} questions → ${difficulty}`, '', difficulty, 'Bulk difficulty change');
    dispatch({ type: 'UPDATE_QUESTIONS', questions: updated });
    showToast.success('Difficulty updated', `${selected.length} question(s) set to ${difficulty}.`);
    setSelectedIds([]);
  };

  const bulkSubmitForReview = () => {
    const selected = questions.filter((q) => selectedIds.includes(q.id));
    if (selected.length === 0) return;
    const updated = selected.map((q) => ({ ...q, status: 'Under Review' as const, updatedAt: today() }));
    audit('SUBMITTED', 'question', selectedIds.join(','), `${selected.length} questions`, '', 'Under Review', 'Bulk submit for review');
    dispatch({ type: 'UPDATE_QUESTIONS', questions: updated });
    showToast.success('Submitted for review', `${selected.length} question(s) moved to Under Review.`);
    setSelectedIds([]);
  };

  const exportCSV = () => {
    showToast.info('Export started', `Exporting ${filtered.length} questions to CSV.`);
  };

  const currentState: SavedViewState = {
    filters: filterChips.map((c) => ({ key: c.key, value: c.value })),
    visibleColumns: tableSettings.visibleColumns,
    columnOrder: tableSettings.columnOrder,
    pageSize: tableSettings.pageSize,
  };

  const applySavedState = (state: SavedViewState) => {
    if (state.pageSize) setTableSettings((p) => ({ ...p, pageSize: state.pageSize }));
    if (state.visibleColumns?.length) setTableSettings((p) => ({ ...p, visibleColumns: state.visibleColumns }));
    if (state.columnOrder?.length) setTableSettings((p) => ({ ...p, columnOrder: state.columnOrder }));
  };

  return (
    <div>
      <PageHeader
        title="Question Bank"
        description="Searchable inventory of all exam questions with bilingual support and advanced filtering."
        icon={<FileQuestion className="h-5 w-5" />}
        actions={<GatedButton permission="questions.create" variant="default" size="sm" onClick={() => showToast.info('New Question', 'Question editor will open here.')}><Plus className="mr-1.5 h-4 w-4" /> New Question</GatedButton>}
      />

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {BUILTIN_VIEWS.map((v) => (
          <button key={v.id} onClick={() => { setActiveBuiltin(v.id); setActiveSavedView(null); }}
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',
              !activeSavedView && activeBuiltin === v.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>
            {v.label}
          </button>
        ))}
      </div>

      <SavedViewsBar page={PAGE_KEY} activeViewId={activeSavedView?.id ?? null}
        onSelectView={(v) => { setActiveSavedView(v); if (v) { setActiveBuiltin('all'); applySavedState(v.state); } }}
        currentState={currentState} onApplyState={applySavedState} />

      <div className="mb-3 flex items-center justify-between gap-2">
        <FilterBar filters={filterDefs} values={filters} onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))} onClear={() => setFilters({})}
          extra={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAdvancedOpen(true)}><SlidersHorizontal className="h-3.5 w-3.5" /> Advanced Filters</Button>} />
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('table')}><TableIcon className="h-4 w-4" /></Button>
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {view === 'table' ? (
        <DataTable data={filtered} columns={columns} getRowId={(q) => q.id}
          searchKeys={(q) => `${q.id} ${q.stem} ${q.subject} ${q.chapter} ${q.author} ${q.reviewer ?? ''}`}
          selectable onSelectionChange={setSelectedIds} rowAction={(q) => setPreviewQ(q)}
          filterChips={filterChips} onClearChip={clearChip} onClearAllChips={clearAllChips}
          settings={tableSettings} onSettingsChange={setTableSettings} onExport={exportCSV}
          bulkActions={<>
            <GatedButton permission="questions.review" variant="secondary" className="h-8" onClick={bulkApprove}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve</GatedButton>
            <GatedButton permission="questions.review" variant="outline" className="h-8" onClick={bulkSubmitForReview}><Send className="mr-1.5 h-3.5 w-3.5" /> Submit for Review</GatedButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="h-8 gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Assign Reviewer</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">{REVIEWERS.map((r) => <DropdownMenuItem key={r} onClick={() => bulkAssignReviewer(r)}>{r}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="h-8 gap-1.5"><Target className="h-3.5 w-3.5" /> Difficulty</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="start">{['Easy', 'Moderate', 'Hard', 'Expert'].map((d) => <DropdownMenuItem key={d} onClick={() => bulkChangeDifficulty(d)}>{d}</DropdownMenuItem>)}</DropdownMenuContent>
            </DropdownMenu>
            <GatedButton permission="questions.archive" variant="outline" className="h-8" onClick={bulkArchive}><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</GatedButton>
          </>}
          emptyTitle="No questions found" emptyDescription="Try adjusting your saved view or filters." />
      ) : (
        <div>
          {filtered.length === 0 ? (
            <EmptyState icon={<FileQuestion className="h-7 w-7" />} title="No questions found" description="Try adjusting your saved view or filters." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.slice(0, 48).map((q) => (
                <Card key={q.id} className="flex flex-col p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox onClick={(e) => e.stopPropagation()} />
                    <StatusBadge tone={questionStatusTone(q.status)} dot className="text-[10px]">{q.status}</StatusBadge>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-medium text-foreground">{q.stem}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusBadge tone={difficultyTone(q.difficulty)} className="text-[10px]">{q.difficulty}</StatusBadge>
                    <StatusBadge tone="neutral" className="text-[10px]">{q.subject}</StatusBadge>
                    {q.language.map((l) => <span key={l} className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', LANG_BADGE[l] ?? 'bg-muted text-muted-foreground')}>{l}</span>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{q.id}</span>
                    <span>{q.usageCount} uses</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => setPreviewQ(q)}><Eye className="mr-1 h-3 w-3" /> Preview</Button>
                    <GatedButton permission="questions.edit" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(q)}><Pencil className="h-3 w-3" /></GatedButton>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Sheet open={!!previewQ} onOpenChange={(o) => !o && setPreviewQ(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {previewQ && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2"><SheetTitle className="text-base">{previewQ.id}</SheetTitle><StatusBadge tone={questionStatusTone(previewQ.status)} dot className="text-[10px]">{previewQ.status}</StatusBadge></div>
                <SheetDescription className="sr-only">Question preview</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div><p className="text-sm leading-relaxed text-foreground">{previewQ.stem}</p>
                  {previewQ.stemPunjabi && <div className="mt-3 rounded-lg border bg-muted/30 p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Languages className="h-3.5 w-3.5" /> Punjabi</div><p className="text-sm leading-relaxed text-foreground">{previewQ.stemPunjabi}</p></div>}</div>
                <div className="space-y-2">{previewQ.options.map((o) => {
                  const correct = o.id === previewQ.correctOption;
                  return <div key={o.id} className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', correct ? 'border-success/40 bg-success/10' : 'bg-card')}>
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold', correct ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>{o.id}</span>
                    <span className={cn(correct && 'font-medium text-foreground')}>{o.text}</span>
                    {correct && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}</div>;
                })}</div>
                <div className="rounded-lg border bg-muted/30 p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Explanation</div><p className="text-sm leading-relaxed text-foreground">{previewQ.explanation}</p></div>
                <div className="grid grid-cols-2 gap-3">{[
                  { label: 'Exam', value: examName(previewQ.exam) }, { label: 'Difficulty', value: previewQ.difficulty },
                  { label: 'Languages', value: previewQ.language.join(', ') }, { label: 'Type', value: previewQ.type },
                  { label: 'Avg Response', value: `${previewQ.avgResponseSec}s`, icon: Clock }, { label: 'Accuracy', value: `${previewQ.studentAccuracy}%`, icon: Target },
                  { label: 'Chapter', value: previewQ.chapter }, { label: 'Topic', value: previewQ.topic },
                  { label: 'Source', value: previewQ.source }, { label: 'Usage', value: `${previewQ.usageCount} times` },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border bg-card p-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.label}</p><p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">{m.icon && <m.icon className="h-3.5 w-3.5 text-muted-foreground" />}{m.value}</p></div>
                ))}</div>
                <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Validation Score</p><p className={cn('mt-1 text-lg font-bold', scoreTone(previewQ.validationScore))}>{previewQ.validationScore}</p></div><StatusBadge tone={previewQ.validationStatus === 'Passed' ? 'success' : previewQ.validationStatus === 'Issues' ? 'warning' : 'neutral'} className="text-[10px]">{previewQ.validationStatus}</StatusBadge></div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 text-xs">
                  <div><span className="text-muted-foreground">Author:</span> <span className="font-medium text-foreground">{previewQ.author}</span></div>
                  <div><span className="text-muted-foreground">Reviewer:</span> <span className="font-medium text-foreground">{previewQ.reviewer ?? 'Unassigned'}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium text-foreground">{previewQ.createdAt}</span></div>
                  <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium text-foreground">{previewQ.updatedAt}</span></div>
                </div>
              </div>
              <SheetFooter className="mt-6">
                <GatedButton permission="questions.edit" variant="outline" size="sm" onClick={() => { const next = previewQ; setPreviewQ(null); openEdit(next); }}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</GatedButton>
                <GatedButton permission="questions.review" variant="default" size="sm" onClick={() => { const updated = { ...previewQ, status: 'Approved' as const, reviewer: activeAdminName, validationStatus: 'Passed' as const, updatedAt: today() }; audit('APPROVED', 'question', updated.id, updated.id, previewQ.status, 'Approved', 'Approved via preview'); dispatch({ type: 'UPDATE_QUESTION', question: updated }); showToast.success('Approved', `${updated.id} approved.`); setPreviewQ(null); }}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve</GatedButton>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!editQ} onOpenChange={(o) => !o && setEditQ(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {editQ && (
            <>
              <SheetHeader><SheetTitle className="text-base">Edit {editQ.id}</SheetTitle><SheetDescription className="sr-only">Edit question</SheetDescription></SheetHeader>
              <div className="mt-4 space-y-4">
                <div><Label className="mb-1.5 block">Stem (English)</Label><Textarea rows={3} value={editForm.stem} onChange={(e) => setEditForm((p) => ({ ...p, stem: e.target.value }))} /></div>
                {editQ.stemPunjabi && <div><Label className="mb-1.5 block">Stem (Punjabi)</Label><Textarea rows={2} value={editForm.stemPunjabi} onChange={(e) => setEditForm((p) => ({ ...p, stemPunjabi: e.target.value }))} /></div>}
                <div className="space-y-2"><Label>Options</Label>{editForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + i)}</span><Input value={opt} onChange={(e) => setEditForm((p) => ({ ...p, options: p.options.map((o, oi) => oi === i ? e.target.value : o) }))} /></div>
                ))}</div>
                <div><Label className="mb-1.5 block">Explanation</Label><Textarea rows={3} value={editForm.explanation} onChange={(e) => setEditForm((p) => ({ ...p, explanation: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="mb-1.5 block">Difficulty</Label><Select value={editForm.difficulty} onValueChange={(v) => setEditForm((p) => ({ ...p, difficulty: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FILTER_DIFFICULTY.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label className="mb-1.5 block">Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FILTER_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="outline" size="sm" onClick={() => setEditQ(null)}>Cancel</Button>
                <GatedButton permission="questions.edit" variant="default" size="sm" onClick={saveEdit}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save</GatedButton>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle className="text-base">Advanced Filters</SheetTitle><SheetDescription className="sr-only">Advanced question filters</SheetDescription></SheetHeader>
          <div className="mt-4 space-y-4">{advancedDefs.map((f) => (
            <div key={f.key}><Label className="mb-1.5 block">{f.label}</Label><Select value={advancedFilters[f.key] ?? 'all'} onValueChange={(v) => setAdvancedFilters((p) => ({ ...p, [f.key]: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>
          ))}</div>
          <SheetFooter className="mt-6">
            <Button variant="outline" size="sm" onClick={() => { setAdvancedFilters({}); showToast.info('Filters cleared', 'All advanced filters reset.'); }}>Clear</Button>
            <Button size="sm" onClick={() => { setAdvancedOpen(false); showToast.success('Filters applied', 'Question list updated.'); }}>Apply</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
