import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, Plus, Copy, Pencil, FileText, Clock, Award, Percent,
  Languages, CheckCircle2, Trash2, GitCompare, Power, Archive, Play,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { showToast } from '@/components/shared/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBlueprints } from '@/app/store/selectors';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { validateBlueprint, canActivateBlueprint, compareBlueprints } from '@/app/store/blueprint-validation';
import { EXAMS, LANGUAGES } from '@/data/exams';
import type { Blueprint, BlueprintStatus } from '@/data/tests';

const STATUS_TONE: Record<BlueprintStatus, 'neutral' | 'success' | 'warning'> = {
  Draft: 'neutral',
  Active: 'success',
  Deprecated: 'warning',
  Archived: 'neutral',
};

function createEmptyBlueprint(id: string): Blueprint {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id, name: '', exam: '', examName: '', stage: 'Tier 1', version: 1,
    sections: [{ name: '', subject: '', questions: 0, marks: 0, duration: 0 }],
    totalQuestions: 0, totalMarks: 0, durationMin: 60, negativeMarking: 0.25,
    languages: ['English'], sectionTiming: 'shared',
    navigationRules: { switchSections: true, markForReview: true, preventFullscreenExit: false },
    translationRequirements: [], previousYearTarget: 15, repetitionLimit: 3,
    effectiveDate: now, status: 'Draft', patternVersion: 'v1.0', createdAt: now, updatedAt: now,
  };
}

export function ExamBlueprintsPage() {
  const navigate = useNavigate();
  const blueprints = useBlueprints();
  const { addBlueprint, updateBlueprint, deleteBlueprint } = usePrototypeStore();
  const [editingBp, setEditingBp] = useState<Blueprint | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const handleCreate = () => {
    const id = `BP-${String(Date.now()).slice(-4)}`;
    setEditingBp(createEmptyBlueprint(id));
    setIsEditing(false);
  };

  const handleEdit = (bp: Blueprint) => {
    setEditingBp({ ...bp });
    setIsEditing(true);
  };

  const handleDuplicate = (bp: Blueprint) => {
    const id = `BP-${String(Date.now()).slice(-4)}`;
    const copy: Blueprint = { ...bp, id, name: `${bp.name} (Copy)`, status: 'Draft', version: bp.version, createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) };
    addBlueprint(copy);
    showToast.success('Blueprint duplicated', `${copy.name} created as a draft.`);
  };

  const handleSave = () => {
    if (!editingBp) return;
    const exam = EXAMS.find((e) => e.code === editingBp.exam);
    const bp = { ...editingBp, examName: exam?.name ?? editingBp.examName, updatedAt: new Date().toISOString().slice(0, 10) };
    const issues = validateBlueprint(bp);
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      showToast.error('Validation errors', errors.map((e) => e.title).join('; '));
      return;
    }
    if (isEditing) {
      updateBlueprint(bp);
      showToast.success('Blueprint updated', `${bp.name} has been saved.`);
    } else {
      addBlueprint(bp);
      showToast.success('Blueprint created', `${bp.name} has been created.`);
    }
    setEditingBp(null);
  };

  const handleActivate = (bp: Blueprint) => {
    if (!canActivateBlueprint(bp)) {
      showToast.error('Cannot activate', 'Blueprint has validation errors.');
      return;
    }
    updateBlueprint({ ...bp, status: 'Active' });
    showToast.success('Blueprint activated', `${bp.name} is now Active.`);
  };

  const handleDeprecate = (bp: Blueprint) => {
    updateBlueprint({ ...bp, status: 'Deprecated' });
    showToast.warning('Blueprint deprecated', `${bp.name} is now Deprecated.`);
  };

  const handleArchive = (bp: Blueprint) => {
    updateBlueprint({ ...bp, status: 'Archived' });
    showToast.info('Blueprint archived', `${bp.name} is now Archived.`);
  };

  const handleDelete = (bp: Blueprint) => {
    deleteBlueprint(bp.id);
    showToast.info('Blueprint deleted', `${bp.name} has been removed.`);
  };

  const handleCreateTest = (bp: Blueprint) => {
    if (bp.status !== 'Active') {
      showToast.warning('Blueprint not active', 'Only Active blueprints can be used to create tests.');
      return;
    }
    showToast.success('Test started', `Building a new test from ${bp.name}.`);
    navigate(`/tests/test-builder?blueprint=${bp.id}`);
  };

  const handleCompareToggle = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareResult = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const [b1, b2] = compareIds.map((id) => blueprints.find((bp) => bp.id === id)).filter(Boolean) as Blueprint[];
    if (!b1 || !b2) return null;
    return { b1, b2, diffs: compareBlueprints(b1, b2) };
  }, [compareIds, blueprints]);

  return (
    <div>
      <PageHeader
        title="Exam Blueprints"
        description="Reusable exam pattern templates defining sections, marks, duration, and marking scheme."
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            {compareIds.length === 2 && (
              <Button variant="outline" size="sm" onClick={() => setShowCompare(true)}>
                <GitCompare className="mr-1.5 h-4 w-4" /> Compare
              </Button>
            )}
            <Button size="sm" onClick={handleCreate}><Plus className="mr-1.5 h-4 w-4" /> New Blueprint</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {blueprints.map((bp) => (
          <BlueprintCard
            key={bp.id}
            bp={bp}
            compareSelected={compareIds.includes(bp.id)}
            onCompareToggle={() => handleCompareToggle(bp.id)}
            onEdit={() => handleEdit(bp)}
            onDuplicate={() => handleDuplicate(bp)}
            onActivate={() => handleActivate(bp)}
            onDeprecate={() => handleDeprecate(bp)}
            onArchive={() => handleArchive(bp)}
            onDelete={() => handleDelete(bp)}
            onCreateTest={() => handleCreateTest(bp)}
          />
        ))}
      </div>

      {editingBp && (
        <BlueprintEditor
          bp={editingBp}
          isEditing={isEditing}
          onChange={setEditingBp}
          onSave={handleSave}
          onClose={() => setEditingBp(null)}
        />
      )}

      {showCompare && compareResult && (
        <CompareDialog result={compareResult} onClose={() => { setShowCompare(false); setCompareIds([]); }} />
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, none }: { icon: typeof Clock; label: string; value: string; none?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={cn('mt-1.5 font-display text-lg font-bold tracking-tight', none ? 'text-muted-foreground' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function BlueprintCard({
  bp, compareSelected, onCompareToggle, onEdit, onDuplicate, onActivate, onDeprecate, onArchive, onDelete, onCreateTest,
}: {
  bp: Blueprint;
  compareSelected: boolean;
  onCompareToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onActivate: () => void;
  onDeprecate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCreateTest: () => void;
}) {
  const totalSectionQ = bp.sections.reduce((a, s) => a + s.questions, 0);
  const totalSectionM = bp.sections.reduce((a, s) => a + s.marks, 0);
  const totalSectionD = bp.sections.reduce((a, s) => a + s.duration, 0);

  return (
    <Card className={cn('flex flex-col', compareSelected && 'ring-2 ring-primary')}>
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{bp.id}</span>
              <StatusBadge tone="info">{bp.patternVersion}</StatusBadge>
              {bp.stage && <StatusBadge tone="neutral">{bp.stage}</StatusBadge>}
            </div>
            <h3 className="mt-1.5 font-display text-base font-semibold leading-tight">{bp.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{bp.examName}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={STATUS_TONE[bp.status]} dot className="shrink-0">{bp.status}</StatusBadge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile icon={CheckCircle2} label="Questions" value={String(bp.totalQuestions)} />
          <StatTile icon={Award} label="Marks" value={String(bp.totalMarks)} />
          <StatTile icon={Clock} label="Duration" value={`${bp.durationMin}m`} />
          <StatTile icon={Percent} label="Neg. Mark" value={bp.negativeMarking ? String(bp.negativeMarking) : 'None'} none={bp.negativeMarking === 0} />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2.5 font-medium">Section</th>
                <th className="w-12 p-2.5 text-right font-medium">Qns</th>
                <th className="w-12 p-2.5 text-right font-medium">Marks</th>
                <th className="w-16 p-2.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {bp.sections.map((s) => (
                <tr key={s.name} className="border-t">
                  <td className="p-2.5 text-xs font-medium">{s.name}</td>
                  <td className="p-2.5 text-right text-xs">{s.questions}</td>
                  <td className="p-2.5 text-right text-xs">{s.marks}</td>
                  <td className="p-2.5 text-right text-xs text-muted-foreground">{s.duration === 0 ? 'Shared' : `${s.duration}m`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30 text-xs font-semibold">
              <tr>
                <td className="p-2.5">Total</td>
                <td className="p-2.5 text-right">{totalSectionQ}</td>
                <td className="p-2.5 text-right">{totalSectionM}</td>
                <td className="p-2.5 text-right text-muted-foreground">{totalSectionD === 0 ? 'Shared' : `${totalSectionD}m`}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Languages:</span>
          <div className="flex flex-wrap gap-1.5">
            {bp.languages.map((l) => <StatusBadge key={l} tone="neutral">{l}</StatusBadge>)}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>PY target: {bp.previousYearTarget}%</span>
          <span>Reuse limit: {bp.repetitionLimit}</span>
          <span>Timing: {bp.sectionTiming}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
          <Button variant="outline" size="sm" onClick={onDuplicate}><Copy className="mr-1.5 h-4 w-4" /> Duplicate</Button>
          <Button size="sm" onClick={onCreateTest} disabled={bp.status !== 'Active'}><FileText className="mr-1.5 h-4 w-4" /> Use for Test</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCompareToggle} title="Compare">
            <GitCompare className={cn('h-4 w-4', compareSelected && 'text-primary')} />
          </Button>
          {bp.status === 'Active' ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDeprecate} title="Deprecate"><Power className="h-4 w-4" /></Button>
          ) : bp.status === 'Draft' || bp.status === 'Deprecated' ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onActivate} title="Activate"><Play className="h-4 w-4" /></Button>
          ) : null}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onArchive} title="Archive"><Archive className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete} title="Delete"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BlueprintEditor({
  bp, isEditing, onChange, onSave, onClose,
}: {
  bp: Blueprint;
  isEditing: boolean;
  onChange: (bp: Blueprint) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const issues = validateBlueprint(bp);
  const errors = issues.filter((i) => i.severity === 'error');

  const update = (patch: Partial<Blueprint>) => onChange({ ...bp, ...patch });

  const updateSection = (idx: number, patch: Partial<Blueprint['sections'][0]>) => {
    const sections = bp.sections.map((s, i) => i === idx ? { ...s, ...patch } : s);
    const totalQuestions = sections.reduce((a, s) => a + (s.questions || 0), 0);
    const totalMarks = sections.reduce((a, s) => a + (s.marks || 0), 0);
    onChange({ ...bp, sections, totalQuestions, totalMarks });
  };

  const addSection = () => {
    onChange({ ...bp, sections: [...bp.sections, { name: '', subject: '', questions: 0, marks: 0, duration: 0 }] });
  };

  const removeSection = (idx: number) => {
    const sections = bp.sections.filter((_, i) => i !== idx);
    onChange({ ...bp, sections, totalQuestions: sections.reduce((a, s) => a + s.questions, 0), totalMarks: sections.reduce((a, s) => a + s.marks, 0) });
  };

  const toggleLanguage = (lang: string) => {
    const languages = bp.languages.includes(lang) ? bp.languages.filter((l) => l !== lang) : [...bp.languages, lang];
    update({ languages });
  };

  const toggleTranslation = (lang: string) => {
    const translationRequirements = bp.translationRequirements.includes(lang) ? bp.translationRequirements.filter((l) => l !== lang) : [...bp.translationRequirements, lang];
    update({ translationRequirements });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Blueprint' : 'New Blueprint'}</DialogTitle>
          <DialogDescription>{bp.id} - Define the exam pattern, sections, and rules.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={bp.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. SSC CGL Tier 1 (2025 pattern)" />
            </div>
            <div>
              <Label className="text-xs">Exam</Label>
              <Select value={bp.exam} onValueChange={(v) => update({ exam: v })}>
                <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                <SelectContent>
                  {EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Stage / Tier</Label>
              <Input value={bp.stage ?? ''} onChange={(e) => update({ stage: e.target.value })} placeholder="e.g. Tier 1" />
            </div>
            <div>
              <Label className="text-xs">Version</Label>
              <Input type="number" value={bp.version} onChange={(e) => update({ version: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Duration (min)</Label>
              <Input type="number" value={bp.durationMin} onChange={(e) => update({ durationMin: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Negative Marking</Label>
              <Input type="number" step="0.01" value={bp.negativeMarking} onChange={(e) => update({ negativeMarking: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Previous Year Target (%)</Label>
              <Input type="number" value={bp.previousYearTarget} onChange={(e) => update({ previousYearTarget: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Repetition Limit</Label>
              <Input type="number" value={bp.repetitionLimit} onChange={(e) => update({ repetitionLimit: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Effective Date</Label>
              <Input type="date" value={bp.effectiveDate} onChange={(e) => update({ effectiveDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Section Timing</Label>
              <Select value={bp.sectionTiming} onValueChange={(v: 'shared' | 'sectional') => update({ sectionTiming: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="sectional">Sectional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Languages */}
          <div>
            <Label className="text-xs">Languages</Label>
            <div className="mt-1.5 flex gap-2">
              {LANGUAGES.map((l) => (
                <label key={l} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                  <Checkbox checked={bp.languages.includes(l)} onCheckedChange={() => toggleLanguage(l)} />
                  {l}
                </label>
              ))}
            </div>
          </div>

          {/* Translation requirements */}
          {bp.languages.length > 1 && (
            <div>
              <Label className="text-xs">Translation Requirements</Label>
              <div className="mt-1.5 flex gap-2">
                {bp.languages.filter((l) => l !== 'English').map((l) => (
                  <label key={l} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm">
                    <Checkbox checked={bp.translationRequirements.includes(l)} onCheckedChange={() => toggleTranslation(l)} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Navigation rules */}
          <div>
            <Label className="text-xs">Navigation Rules</Label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={bp.navigationRules.switchSections} onCheckedChange={(v) => update({ navigationRules: { ...bp.navigationRules, switchSections: !!v } })} />
                Switch sections
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={bp.navigationRules.markForReview} onCheckedChange={(v) => update({ navigationRules: { ...bp.navigationRules, markForReview: !!v } })} />
                Mark for review
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={bp.navigationRules.preventFullscreenExit} onCheckedChange={(v) => update({ navigationRules: { ...bp.navigationRules, preventFullscreenExit: !!v } })} />
                Prevent fullscreen exit
              </label>
            </div>
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Sections</Label>
              <Button variant="outline" size="sm" onClick={addSection}><Plus className="mr-1 h-3.5 w-3.5" /> Add Section</Button>
            </div>
            <div className="mt-2 space-y-2">
              {bp.sections.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                  <Input className="col-span-4 text-xs" placeholder="Section name" value={s.name} onChange={(e) => updateSection(idx, { name: e.target.value })} />
                  <Input className="col-span-3 text-xs" placeholder="Subject" value={s.subject} onChange={(e) => updateSection(idx, { subject: e.target.value })} />
                  <Input className="col-span-1 text-xs" type="number" placeholder="Q" value={s.questions} onChange={(e) => updateSection(idx, { questions: Number(e.target.value) })} />
                  <Input className="col-span-1 text-xs" type="number" placeholder="M" value={s.marks} onChange={(e) => updateSection(idx, { marks: Number(e.target.value) })} />
                  <Input className="col-span-2 text-xs" type="number" placeholder="Min" value={s.duration} onChange={(e) => updateSection(idx, { duration: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-destructive" onClick={() => removeSection(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Validation issues */}
          {issues.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs font-medium text-warning">Validation: {errors.length} error(s), {issues.filter((i) => i.severity === 'warning').length} warning(s)</p>
              <ul className="mt-1.5 space-y-1">
                {issues.map((i) => (
                  <li key={i.id} className={cn('text-xs', i.severity === 'error' ? 'text-error' : 'text-warning')}>{i.title}: {i.description}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={errors.length > 0}>
            {isEditing ? 'Save Changes' : 'Create Blueprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompareDialog({ result, onClose }: { result: { b1: Blueprint; b2: Blueprint; diffs: { field: string; v1: unknown; v2: unknown; differs: boolean }[] }; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Blueprints</DialogTitle>
          <DialogDescription>{result.b1.name} vs {result.b2.name}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Field</th>
                <th className="p-3 font-medium">{result.b1.id}</th>
                <th className="p-3 font-medium">{result.b2.id}</th>
              </tr>
            </thead>
            <tbody>
              {result.diffs.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-sm text-muted-foreground">No differences found.</td></tr>
              ) : result.diffs.map((d) => (
                <tr key={d.field} className="border-t">
                  <td className="p-3 text-xs font-medium">{d.field}</td>
                  <td className="p-3 text-xs">{String(d.v1)}</td>
                  <td className="p-3 text-xs">{String(d.v2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
