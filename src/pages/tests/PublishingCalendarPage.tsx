import { useMemo, useState } from 'react';
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, Rocket, Clock, Eye, Calendar,
  AlertTriangle, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, testStatusTone } from '@/components/shared/StatusBadge';
import { showToast } from '@/components/shared/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTests } from '@/app/store/selectors';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { EXAMS, EXAM_FAMILIES, type ExamFamily } from '@/data/exams';

const FAMILY_DOT: Record<ExamFamily, string> = {
  SSC: 'bg-info',
  Banking: 'bg-success',
  Railway: 'bg-warning',
  'Punjab State': 'bg-brand-accent',
};

const FAMILY_RING: Record<ExamFamily, string> = {
  SSC: 'border-l-info',
  Banking: 'border-l-success',
  Railway: 'border-l-warning',
  'Punjab State': 'border-l-brand-accent',
};

const FAMILY_CHIP: Record<ExamFamily | 'All', string> = {
  All: 'border-primary bg-primary/10 text-primary',
  SSC: 'border-info/30 bg-info/10 text-info',
  Banking: 'border-success/30 bg-success/10 text-success',
  Railway: 'border-warning/30 bg-warning/10 text-warning',
  'Punjab State': 'border-brand-accent/30 bg-brand-accent/10 text-brand-accent',
};

const examFamily = (code: string): ExamFamily => EXAMS.find((e) => e.code === code)?.family ?? 'SSC';

function publicationRisk(test: { status: string; totalQuestions: number; attempts: number }): 'low' | 'medium' | 'high' {
  if (test.status === 'Under QA') return 'medium';
  if (test.status === 'Draft' || test.status === 'Content Ready') return 'high';
  return 'low';
}

const RISK_TONE: Record<string, 'success' | 'warning' | 'destructive'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function PublishingCalendarPage() {
  const tests = useTests();
  const { dispatch, audit } = usePrototypeStore();
  const [family, setFamily] = useState<ExamFamily | 'All'>('All');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const baseYear = 2026;
  const baseMonth = 6;
  const calDate = new Date(baseYear, baseMonth + monthOffset, 1);
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const scheduled = useMemo(() => tests.filter((t) => t.scheduledDate), [tests]);

  const byDate = useMemo(() => {
    const map: Record<string, typeof tests> = {};
    scheduled.forEach((t) => {
      if (!t.scheduledDate) return;
      (map[t.scheduledDate] ??= []).push(t);
    });
    return map;
  }, [scheduled, tests]);

  const filteredByDate = useMemo(() => {
    if (family === 'All') return byDate;
    const map: Record<string, typeof tests> = {};
    Object.entries(byDate).forEach(([date, dateTests]) => {
      const f = dateTests.filter((t) => examFamily(t.exam) === family);
      if (f.length) map[date] = f;
    });
    return map;
  }, [byDate, family, tests]);

  const conflictingDates = useMemo(() => {
    return Object.entries(filteredByDate)
      .filter(([, dateTests]) => dateTests.length > 1)
      .map(([date]) => date);
  }, [filteredByDate]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
  const todayISO = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      [...scheduled]
        .filter((t) => family === 'All' || examFamily(t.exam) === family)
        .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''))
        .slice(0, 12),
    [scheduled, family],
  );

  const releaseWindows = useMemo(() => {
    const windows: { time: string; tests: typeof tests }[] = [];
    const timeMap: Record<string, typeof tests> = {};
    scheduled.forEach((t) => {
      const time = '10:00 AM';
      (timeMap[time] ??= []).push(t);
    });
    Object.entries(timeMap).forEach(([time, t]) => windows.push({ time, tests: t }));
    return windows;
  }, [scheduled, tests]);

  const selectedDayTests = selectedDate ? filteredByDate[selectedDate] ?? [] : [];

  const handleReschedule = (testId: string, testName: string) => {
    const dateStr = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    const updated = { ...test, scheduledDate: dateStr, status: 'Scheduled' as const };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('TEST_RESCHEDULED', 'test', testId, testName, test.scheduledDate ?? '', dateStr, `Rescheduled to ${dateStr}`) });
    showToast.success('Test rescheduled', `${testName} moved to ${dateStr}.`);
  };

  const handlePublishNow = (testId: string, testName: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;
    const updated = { ...test, status: 'Live' as const, scheduledDate: null };
    dispatch({ type: 'UPDATE_TEST', test: updated, audit: audit('TEST_PUBLISHED', 'test', testId, testName, test.status, 'Live', `Published ${testName}`) });
    showToast.success('Published', `${testName} is now live.`);
  };

  return (
    <div>
      <PageHeader
        title="Publishing Calendar"
        description="Schedule and track test releases across all exam categories with conflict detection."
        icon={<CalendarClock className="h-5 w-5" />}
        actions={<Button size="sm" onClick={() => showToast.info('Schedule Test', 'Test scheduling form would open here.')}><Plus className="mr-1.5 h-4 w-4" /> Schedule Test</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['All', ...EXAM_FAMILIES] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFamily(f)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              family === f ? FAMILY_CHIP[f] : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {f === 'All' ? 'All Families' : f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{monthLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((m) => m - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setMonthOffset(0)}>Today</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((m) => m + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="pb-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`b-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateISO = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTests = filteredByDate[dateISO] ?? [];
                const isToday = dateISO === todayISO;
                const hasConflict = conflictingDates.includes(dateISO);
                const isSelected = selectedDate === dateISO;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateISO)}
                    className={cn(
                      'min-h-[88px] rounded-lg border p-1.5 text-left transition-colors',
                      isToday ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
                      hasConflict && 'ring-1 ring-error/40',
                      isSelected && 'ring-2 ring-primary',
                      dayTests.length > 0 && 'hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>{day}</span>
                      {hasConflict && <AlertTriangle className="h-3 w-3 text-error" />}
                      {dayTests.length > 0 && !hasConflict && <CheckCircle2 className="h-3 w-3 text-success" />}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayTests.slice(0, 3).map((t) => {
                        const fam = examFamily(t.exam);
                        return (
                          <div key={t.id} className={cn('truncate rounded border-l-2 bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground', FAMILY_RING[fam])}>
                            {t.name}
                          </div>
                        );
                      })}
                      {dayTests.length > 3 && (
                        <p className="px-1 text-[10px] font-medium text-muted-foreground">+{dayTests.length - 3} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Legend:</span>
              {EXAM_FAMILIES.map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full', FAMILY_DOT[f])} />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-error" />
                <span className="text-xs text-muted-foreground">Conflict</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Selected day detail */}
          {selectedDate && (
            <Card>
              <CardHeader className="space-y-0">
                <CardTitle className="text-base">{selectedDate}</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedDayTests.length} test(s) scheduled</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedDayTests.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No tests on this date.</p>
                ) : (
                  selectedDayTests.map((t) => {
                    const fam = examFamily(t.exam);
                    const risk = publicationRisk(t);
                    return (
                      <div key={t.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{t.name}</p>
                          <StatusBadge tone={testStatusTone(t.status)} dot className="shrink-0 text-[10px]">{t.status}</StatusBadge>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={cn('h-2 w-2 rounded-full', FAMILY_DOT[fam])} />
                          <span>{t.examName}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusBadge tone={RISK_TONE[risk]} className="text-[10px]">Risk: {risk}</StatusBadge>
                          {t.status === 'Under QA' && <StatusBadge tone="info" className="text-[10px]"><ShieldCheck className="mr-0.5 h-2.5 w-2.5" />In QA</StatusBadge>}
                        </div>
                        <div className="mt-2 flex gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => handlePublishNow(t.id, t.name)}><Rocket className="mr-1 h-3 w-3" /> Publish</Button>
                          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => handleReschedule(t.id, t.name)}>Reschedule</Button>
                        </div>
                      </div>
                    );
                  })
                )}
                {selectedDayTests.length > 1 && (
                  <div className="rounded-lg border border-error/30 bg-error/5 p-2.5">
                    <p className="flex items-center gap-1.5 text-xs text-error">
                      <AlertTriangle className="h-3 w-3" /> {selectedDayTests.length} tests on the same day may conflict.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming releases */}
          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">Upcoming Releases</CardTitle>
              <p className="text-xs text-muted-foreground">{upcoming.length} scheduled tests</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {upcoming.map((t) => {
                const fam = examFamily(t.exam);
                const risk = publicationRisk(t);
                return (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn('h-2 w-2 shrink-0 rounded-full', FAMILY_DOT[fam])} />
                          {t.examName} - {fam}
                        </p>
                      </div>
                      <StatusBadge tone={testStatusTone(t.status)} dot className="shrink-0">{t.status}</StatusBadge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.scheduledDate}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />10:00 AM</span>
                      <StatusBadge tone={RISK_TONE[risk]} className="text-[10px]">{risk} risk</StatusBadge>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => handlePublishNow(t.id, t.name)}><Rocket className="mr-1 h-3 w-3" /> Publish</Button>
                      <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs" onClick={() => handleReschedule(t.id, t.name)}>Reschedule</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => showToast.info('Preview', `Previewing ${t.name}.`)}><Eye className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No scheduled tests for this family.</p>
              )}
            </CardContent>
          </Card>

          {/* Release windows */}
          <Card>
            <CardHeader className="space-y-0">
              <CardTitle className="text-base">Release Windows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {releaseWindows.map((w) => (
                <div key={w.time} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{w.time}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{w.tests.length} test(s)</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
