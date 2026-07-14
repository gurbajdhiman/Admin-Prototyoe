import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network, ChevronRight, ChevronDown, Target, AlertTriangle,
  Zap, Users, Download, Search,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useQuestions } from '@/app/store/selectors';
import { calculateCoverageTree, flattenCoverage, getCoverageGaps, getCoverageWarnings } from '@/app/store/coverage';
import type { CoverageNode } from '@/app/store/types';
import { showToast } from '@/components/shared/toast';

const LEVEL_INDENT: Record<CoverageNode['level'], number> = {
  family: 0, exam: 1, stage: 2, subject: 3, chapter: 4, topic: 5, subtopic: 6,
};

const LEVEL_LABEL: Record<CoverageNode['level'], string> = {
  family: 'Exam Family', exam: 'Exam', stage: 'Stage/Tier', subject: 'Subject',
  chapter: 'Chapter', topic: 'Topic', subtopic: 'Subtopic',
};

function CoverageRow({ node, expandedIds, onToggle, onAction }: {
  node: CoverageNode; expandedIds: Set<string>; onToggle: (id: string) => void;
  onAction: (action: string, node: CoverageNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indent = LEVEL_INDENT[node.level];

  return (
    <>
      <tr className="border-b transition-colors hover:bg-muted/40">
        <td className="py-2.5" style={{ paddingLeft: `${12 + indent * 20}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => onToggle(node.id)} className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{node.label}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{LEVEL_LABEL[node.level]}</p>
            </div>
          </div>
        </td>
        <td className="px-2 py-2.5 text-center text-sm font-medium">{node.targetCount}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.totalCount}</td>
        <td className="px-2 py-2.5 text-center text-sm text-info">{node.generated}</td>
        <td className="px-2 py-2.5 text-center text-sm text-warning">{node.underReview}</td>
        <td className="px-2 py-2.5 text-center text-sm text-destructive">{node.needsFix}</td>
        <td className="px-2 py-2.5 text-center text-sm font-medium text-success">{node.approved}</td>
        <td className="px-2 py-2.5 text-center text-sm text-muted-foreground">{node.rejected}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.used}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.unused}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.englishCount}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.hindiCount}</td>
        <td className="px-2 py-2.5 text-center text-sm">{node.punjabiCount}</td>
        <td className="px-2 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-success">{node.easyCount}</span>
            <span className="text-xs text-warning">{node.moderateCount}</span>
            <span className="text-xs text-destructive">{node.hardCount}</span>
          </div>
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center gap-2">
            <Progress value={node.coveragePercentage} className={cn('h-2 w-16', node.coveragePercentage < 60 && '[&>div]:bg-destructive', node.coveragePercentage < 80 && node.coveragePercentage >= 60 && '[&>div]:bg-warning')} />
            <span className={cn('text-xs font-semibold', node.coveragePercentage < 60 ? 'text-destructive' : node.coveragePercentage < 80 ? 'text-warning' : 'text-success')}>
              {node.coveragePercentage}%
            </span>
          </div>
        </td>
        <td className="px-2 py-2.5 text-center">
          {node.gapCount > 0 ? <StatusBadge tone="destructive" className="text-[10px]">{node.gapCount} gap</StatusBadge> : <StatusBadge tone="success" className="text-[10px]">OK</StatusBadge>}
        </td>
        <td className="px-2 py-2.5">
          <div className="flex items-center justify-end gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Generate missing" onClick={() => onAction('generate', node)}><Zap className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in Question Bank" onClick={() => onAction('filter', node)}><Search className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Assign owner" onClick={() => onAction('assign', node)}><Users className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      </tr>
      {isExpanded && node.children.map((child) => (
        <CoverageRow key={child.id} node={child} expandedIds={expandedIds} onToggle={onToggle} onAction={onAction} />
      ))}
    </>
  );
}

export function CoveragePlannerPage() {
  const questions = useQuestions();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const tree = useMemo(() => calculateCoverageTree(questions), [questions]);
  const allNodes = useMemo(() => flattenCoverage(tree), [tree]);
  const gaps = useMemo(() => getCoverageGaps(tree), [tree]);
  const warnings = useMemo(() => getCoverageWarnings(tree), [tree]);

  const filteredTree = useMemo(() => {
    if (!query.trim()) return tree;
    const q = query.toLowerCase();
    const matchIds = new Set(allNodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
    const filterNode = (nodes: CoverageNode[]): CoverageNode[] =>
      nodes.map((n) => ({ ...n, children: filterNode(n.children) })).filter((n) =>
        matchIds.has(n.id) || n.children.some((c) => matchIds.has(c.id) || c.children.length > 0)
      );
    return filterNode(tree);
  }, [tree, query, allNodes]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(allNodes.map((n) => n.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const handleAction = (action: string, node: CoverageNode) => {
    switch (action) {
      case 'generate':
        showToast.info('Generate missing', `${node.gapCount} questions needed for ${node.label}. Generation queue will open.`);
        break;
      case 'filter':
        navigate(`/content/questions?exam=${node.examCode ?? ''}&subject=${node.level === 'subject' ? node.label : ''}`);
        break;
      case 'assign':
        showToast.info('Assign owner', `Owner assignment for ${node.label} will open here.`);
        break;
    }
  };

  const totalApproved = allNodes.length > 0 ? allNodes.filter((n) => n.level === 'family').reduce((s, n) => s + n.approved, 0) : 0;
  const totalTarget = allNodes.length > 0 ? allNodes.filter((n) => n.level === 'family').reduce((s, n) => s + n.targetCount, 0) : 0;
  const overallCoverage = totalTarget > 0 ? Math.round((totalApproved / totalTarget) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Coverage Planner"
        description="Hierarchical view of question inventory targets vs actual coverage across exams, subjects, and topics."
        icon={<Network className="h-5 w-5" />}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => showToast.info('Export', 'Gap report CSV export will download.')}><Download className="mr-1.5 h-4 w-4" /> Export Gap Report</Button>
          <Button size="sm" onClick={() => showToast.info('Adjust targets', 'Target adjustment panel will open.')}><Target className="mr-1.5 h-4 w-4" /> Adjust Targets</Button>
        </>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="py-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Overall Coverage</p><p className={cn('mt-1 text-2xl font-bold', overallCoverage < 60 ? 'text-destructive' : overallCoverage < 80 ? 'text-warning' : 'text-success')}>{overallCoverage}%</p></CardContent></Card>
        <Card><CardContent className="py-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Coverage Gaps</p><p className="mt-1 text-2xl font-bold text-destructive">{gaps.length}</p></CardContent></Card>
        <Card><CardContent className="py-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Under 70% Coverage</p><p className="mt-1 text-2xl font-bold text-warning">{warnings.length}</p></CardContent></Card>
        <Card><CardContent className="py-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Questions</p><p className="mt-1 text-2xl font-bold text-foreground">{questions.length}</p></CardContent></Card>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search coverage nodes…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse all</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b">
              <th className="py-2.5 pl-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hierarchy</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gen</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fix</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rej</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Used</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unused</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">EN</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">HI</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">PA</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">E/M/H</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gap</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTree.map((node) => (
              <CoverageRow key={node.id} node={node} expandedIds={expandedIds} onToggle={toggle} onAction={handleAction} />
            ))}
            {filteredTree.length === 0 && (
              <tr><td colSpan={17} className="py-8 text-center text-sm text-muted-foreground">No coverage nodes found matching "{query}"</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {gaps.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Coverage Gaps ({gaps.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => showToast.info('Export', 'Gap report CSV export will download.')}>Export</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {gaps.slice(0, 10).map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{LEVEL_LABEL[g.level]}</span>
                    <span className="text-sm font-medium">{g.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Target: {g.targetCount}</span>
                    <span className="text-xs text-success">Approved: {g.approved}</span>
                    <StatusBadge tone="destructive" className="text-[10px]">{g.gapCount} needed</StatusBadge>
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleAction('generate', g)}><Zap className="h-3 w-3" /> Generate</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
