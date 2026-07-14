import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, FileQuestion, ClipboardCheck, FileText, CalendarClock,
  CreditCard, LifeBuoy, Activity, Plus,
  ArrowRight, CheckCircle2, FileEdit, Zap,
  ShieldAlert, Target, AlertCircle,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  REVENUE_TREND, STUDENT_ACTIVITY_TREND, PLATFORM_HEALTH,
} from '@/data/analytics';
import { useQuestions, useTests, useOrders, useSupportRequests, useGeneratedBatches, useStudents, useAuditLogs } from '@/app/store/selectors';

interface ActionCard {
  id: string; title: string; count: number;
  icon: typeof FileQuestion; tone: 'warning' | 'destructive' | 'info' | 'success' | 'neutral';
  route: string; routeLabel: string;
}


export function DashboardPage() {
  const navigate = useNavigate();
  const questions = useQuestions();
  const tests = useTests();
  const orders = useOrders();
  const support = useSupportRequests();
  const batches = useGeneratedBatches();
  const students = useStudents();
  const auditLogs = useAuditLogs();

  const cards = useMemo<ActionCard[]>(() => {
    const awaitingReview = questions.filter((q) => q.status === 'Under Review').length;
    const needsFix = questions.filter((q) => q.status === 'Needs Fix').length;
    const failedJobs = batches.filter((b) => b.status === 'Rejected').length;
    const testsBlocked = tests.filter((t) => t.status === 'Draft' || t.status === 'Content Ready').length;
    const testsQA = tests.filter((t) => t.status === 'Under QA').length;
    const scheduledTests = tests.filter((t) => t.status === 'Scheduled').length;
    const failedPayments = orders.filter((o) => o.paymentStatus === 'Failed').length;
    const supportNearSLA = support.filter((s) => s.priority === 'High' && s.status !== 'Resolved').length;

    return [
      { id: 'awaiting-review', title: 'Questions Awaiting Review', count: awaitingReview, icon: ClipboardCheck, tone: 'warning', route: '/content/review', routeLabel: 'Open Review Queue' },
      { id: 'needs-fix', title: 'Questions Needing Fixes', count: needsFix, icon: FileEdit, tone: 'destructive', route: '/content/questions', routeLabel: 'View Needs Fix' },
      { id: 'failed-jobs', title: 'Failed Generation Jobs', count: failedJobs, icon: Zap, tone: 'destructive', route: '/content/studio', routeLabel: 'Open Generation' },
      { id: 'tests-blocked', title: 'Tests Blocked by Validation', count: testsBlocked, icon: AlertCircle, tone: 'warning', route: '/tests', routeLabel: 'View Tests' },
      { id: 'tests-qa', title: 'Tests Awaiting QA', count: testsQA, icon: CheckCircle2, tone: 'info', route: '/tests', routeLabel: 'Open Test QA' },
      { id: 'scheduled-tests', title: 'Scheduled Tests at Risk', count: scheduledTests, icon: CalendarClock, tone: 'warning', route: '/tests/calendar', routeLabel: 'View Calendar' },
      { id: 'failed-payments', title: 'Payment-Entitlement Mismatches', count: failedPayments, icon: CreditCard, tone: 'destructive', route: '/commerce/orders', routeLabel: 'View Orders' },
      { id: 'support-sla', title: 'Support Requests Near SLA Breach', count: supportNearSLA, icon: LifeBuoy, tone: 'warning', route: '/users/support', routeLabel: 'Open Support Queue' },
    ];
  }, [questions, tests, orders, support, batches]);

  const recentCriticalActivity = auditLogs.slice(0, 6);
  const upcomingPublications = tests.filter((t) => t.status === 'Scheduled' && t.scheduledDate).slice(0, 5);
  const failedJobsRetry = batches.filter((b) => b.status === 'Rejected').slice(0, 4);

  const workloadByRole = useMemo(() => {
    const roles = new Map<string, number>();
    for (const q of questions) {
      if (q.status === 'Under Review' || q.status === 'Needs Fix') {
        roles.set(q.reviewer ?? 'Unassigned', (roles.get(q.reviewer ?? 'Unassigned') ?? 0) + 1);
      }
    }
    return [...roles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [questions]);

  return (
    <div>
      <PageHeader
        title="Command Centre"
        description="Operational dashboard — every card links to an actionable filtered list."
        icon={<Activity className="h-5 w-5" />}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => navigate('/analytics/business')}>Analytics</Button>
          <Button size="sm" onClick={() => navigate('/tests/builder')}><Plus className="mr-1.5 h-4 w-4" /> New Test</Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard label="Total Students" value={students.length.toLocaleString()} icon={Users} delta={{ value: '4.2%', positive: true }} sublabel="vs last month" tone="primary" />
        <StatCard label="Active Today" value="9,830" icon={UserCheck} delta={{ value: '12%', positive: true }} sublabel="live now" tone="info" />
        <StatCard label="Total Questions" value={questions.length.toLocaleString()} icon={FileQuestion} delta={{ value: `${questions.filter(q => q.status === 'Approved').length} approved`, positive: true }} sublabel="in inventory" tone="success" />
        <StatCard label="Pending Reviews" value={String(questions.filter(q => q.status === 'Under Review').length)} icon={ClipboardCheck} delta={{ value: `${questions.filter(q => q.status === 'Needs Fix').length} urgent`, positive: false }} sublabel="needs attention" tone="warning" />
        <StatCard label="Total Tests" value={String(tests.length)} icon={FileText} delta={{ value: `${tests.filter(t => t.status === 'Live').length} live`, positive: true }} sublabel="published" tone="accent" />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Operational Cards — Click to act</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.id} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(card.route)}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    card.tone === 'warning' && 'bg-warning/10 text-warning',
                    card.tone === 'destructive' && 'bg-destructive/10 text-destructive',
                    card.tone === 'info' && 'bg-info/10 text-info',
                    card.tone === 'success' && 'bg-success/10 text-success',
                    card.tone === 'neutral' && 'bg-muted text-muted-foreground',
                  )}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    'text-2xl font-bold',
                    card.count === 0 && 'text-muted-foreground',
                    card.count > 0 && card.tone === 'destructive' && 'text-destructive',
                    card.count > 0 && card.tone === 'warning' && 'text-warning',
                    card.count > 0 && card.tone === 'info' && 'text-info',
                    card.count > 0 && card.tone === 'success' && 'text-success',
                  )}>{card.count}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{card.title}</p>
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  {card.routeLabel} <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div><CardTitle className="text-base">Revenue Trend</CardTitle><p className="text-xs text-muted-foreground">Monthly revenue vs target</p></div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics/business')}>View Analytics <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={REVENUE_TREND} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#rev)" name="Revenue" />
                <Area type="monotone" dataKey="target" stroke="hsl(var(--chart-2))" strokeWidth={1.5} strokeDasharray="5 5" fill="none" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Student Activity</CardTitle><p className="text-xs text-muted-foreground">Active users this week</p></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={STUDENT_ACTIVITY_TREND} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="active" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Active" />
                <Bar dataKey="new" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="New" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Recent Critical Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings/audit-logs')}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentCriticalActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : recentCriticalActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => navigate('/settings/audit-logs')}>
                <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted', 'text-muted-foreground')}>
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-tight"><span className="font-medium">{a.admin}</span> <span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.entityName}</span></p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{a.timestamp} - {a.entityType}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-info" /> Upcoming Publications</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tests/calendar')}>Calendar <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingPublications.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No scheduled publications</p>
            ) : upcomingPublications.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/tests/${t.id}`)}>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.examName}</p></div>
                <div className="text-right"><p className="text-sm font-semibold">{t.scheduledDate?.slice(5)}</p><StatusBadge tone="info" className="text-[10px]">Scheduled</StatusBadge></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-warning" /> Failed Jobs Needing Retry</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/content/studio')}>Retry all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {failedJobsRetry.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No failed jobs</p>
            ) : failedJobsRetry.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{b.id}</p><p className="text-xs text-muted-foreground">{b.exam} - {b.count} questions</p></div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/content/studio')}>Retry</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Admin Workload Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {workloadByRole.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No pending work</p>
            ) : workloadByRole.map(([name, count]) => {
              const max = workloadByRole[0][1];
              return (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{name}</span>
                    <span className={cn('font-semibold', count > 5 ? 'text-destructive' : count > 2 ? 'text-warning' : 'text-success')}>{count} items</span>
                  </div>
                  <Progress value={(count / max) * 100} className={cn('h-2', count > 5 && '[&>div]:bg-destructive', count > 2 && count <= 5 && '[&>div]:bg-warning')} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-warning" /> Content Coverage Warnings</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/content/coverage')}>Coverage Planner <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const subjectGaps = new Map<string, { approved: number; total: number }>();
              for (const q of questions) {
                const cur = subjectGaps.get(q.subject) ?? { approved: 0, total: 0 };
                cur.total++;
                if (q.status === 'Approved') cur.approved++;
                subjectGaps.set(q.subject, cur);
              }
              const sorted = [...subjectGaps.entries()].map(([subject, { approved, total }]) => ({
                subject, approved, total, pct: total > 0 ? Math.round((approved / total) * 100) : 0,
              })).sort((a, b) => a.pct - b.pct).slice(0, 5);
              return sorted.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.subject}</span>
                    <span className={cn('text-xs', s.pct < 60 ? 'text-destructive' : s.pct < 80 ? 'text-warning' : 'text-success')}>{s.pct}%</span>
                  </div>
                  <Progress value={s.pct} className={cn('h-2', s.pct < 60 && '[&>div]:bg-destructive', s.pct < 80 && s.pct >= 60 && '[&>div]:bg-warning')} />
                </div>
              ));
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> System Alerts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics/system-health')}>System Health <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {PLATFORM_HEALTH.map((s) => (
              <div key={s.service} className="flex items-center justify-between text-sm cursor-pointer" onClick={() => navigate('/analytics/system-health')}>
                <div className="flex items-center gap-2.5">
                  <span className={cn('h-2 w-2 rounded-full', s.status === 'operational' ? 'bg-success' : 'bg-warning')} />
                  <span className="font-medium">{s.service}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{s.latency}</span>
                  <StatusBadge tone={s.status === 'operational' ? 'success' : 'warning'} className="text-[10px]">{s.status === 'operational' ? 'OK' : 'Degraded'}</StatusBadge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">All dashboard values are calculated from current prototype state. Click any card to navigate to the relevant filtered list.</p>
    </div>
  );
}
