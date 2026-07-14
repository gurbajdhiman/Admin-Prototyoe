import { useCallback, useMemo, useState } from 'react';
import {
  ShoppingCart, Download, Eye, CheckCircle2, RefreshCw, RotateCcw, FileText,
  MessageSquare, MoreVertical, IndianRupee, AlertTriangle, Hash,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { showToast } from '@/components/shared/toast';
import { GatedButton } from '@/components/shared/GatedAction';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useOrders } from '@/app/store/selectors';
import type { Order } from '@/data/commerce';

const formatRs = (n: number) => `Rs ${n.toLocaleString('en-IN')}`;

type ChipValue = 'all' | 'Success' | 'Pending' | 'Failed' | 'Refunded' | 'paid_no_access' | 'access_no_payment' | 'recon_issue';

const CHIPS: { label: string; value: ChipValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Successful', value: 'Success' },
  { label: 'Pending', value: 'Pending' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Refunded', value: 'Refunded' },
  { label: 'Paid without Access', value: 'paid_no_access' },
  { label: 'Access without Payment', value: 'access_no_payment' },
  { label: 'Reconciliation Issue', value: 'recon_issue' },
];

function paymentTone(status: Order['paymentStatus']) {
  switch (status) {
    case 'Success': return 'success';
    case 'Pending': return 'warning';
    case 'Failed': return 'destructive';
    case 'Refunded': return 'info';
    default: return 'neutral';
  }
}

function entitlementTone(status: Order['entitlementStatus']) {
  switch (status) {
    case 'Active': return 'success';
    case 'Pending': return 'warning';
    case 'Failed': return 'destructive';
    case 'Not Granted': return 'neutral';
    default: return 'neutral';
  }
}

function refundTone(status: Order['refundStatus']) {
  switch (status) {
    case 'Processed': return 'success';
    case 'Approved': return 'info';
    case 'Requested': return 'warning';
    case 'None': return 'neutral';
    default: return 'neutral';
  }
}

function gatewayTone(gw: Order['gateway']) {
  switch (gw) {
    case 'Razorpay': return 'primary';
    case 'Cashfree': return 'info';
    case 'UPI Direct': return 'accent';
    case 'Manual': return 'neutral';
    default: return 'neutral';
  }
}

export function OrdersPaymentsPage() {
  const [chip, setChip] = useState<ChipValue>('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [noteTarget, setNoteTarget] = useState<Order | null>(null);
  const [noteText, setNoteText] = useState('');

  const orders = useOrders();
  const { dispatch, audit } = usePrototypeStore();

  const stats = useMemo(() => {
    const total = orders.length;
    const successful = orders.filter((o) => o.paymentStatus === 'Success').length;
    const failed = orders.filter((o) => o.paymentStatus === 'Failed').length;
    const refunded = orders.filter((o) => o.paymentStatus === 'Refunded').length;
    const revenue = orders.filter((o) => o.paymentStatus === 'Success').reduce((sum, o) => sum + o.amount, 0);
    return { total, successful, failed, refunded, revenue };
  }, [orders]);

  const filteredByChip = useCallback((value: ChipValue): Order[] => {
    switch (value) {
      case 'Success': case 'Pending': case 'Failed': case 'Refunded':
        return orders.filter((o) => o.paymentStatus === value);
      case 'paid_no_access': return orders.filter((o) => o.paymentStatus === 'Success' && o.entitlementStatus !== 'Active');
      case 'access_no_payment': return orders.filter((o) => o.paymentStatus === 'Failed' && o.entitlementStatus === 'Active');
      case 'recon_issue': return orders.filter((o) => o.reconIssue);
      default: return orders;
    }
  }, [orders]);

  const filtered = useMemo(() => {
    if (chip === 'all') return orders;
    return filteredByChip(chip);
  }, [chip, orders, filteredByChip]);

  const chipCount = (value: ChipValue) => {
    if (value === 'all') return orders.length;
    return filteredByChip(value).length;
  };

  const handleVerifyPayment = (o: Order) => {
    const updated = { ...o, paymentStatus: 'Success' as const };
    dispatch({ type: 'UPDATE_ORDER', order: updated, audit: audit('PAYMENT_VERIFIED', 'order', o.id, o.id, o.paymentStatus, 'Success', 'Payment manually verified') });
    setSelected(updated);
    showToast.success('Payment verified', `${o.id} - ${o.gateway} confirmation re-checked.`);
  };

  const handleRetryEntitlement = (o: Order) => {
    const updated = { ...o, entitlementStatus: 'Active' as const };
    dispatch({ type: 'UPDATE_ORDER', order: updated, audit: audit('ENTITLEMENT_RETRIED', 'order', o.id, o.id, o.entitlementStatus, 'Active', 'Entitlement provisioning retried') });
    setSelected(updated);
    showToast.info('Entitlement retried', `${o.id} - access provisioning queued.`);
  };

  const handleResolveRecon = (o: Order) => {
    const updated = { ...o, reconIssue: false };
    dispatch({ type: 'UPDATE_ORDER', order: updated, audit: audit('RECON_RESOLVED', 'order', o.id, o.id, 'Reconciliation Issue', 'Resolved', 'Reconciliation issue resolved') });
    setSelected(updated);
    showToast.success('Reconciliation resolved', `${o.id} marked as resolved.`);
  };

  const confirmRefund = () => {
    if (!refundTarget) return;
    const updated = { ...refundTarget, paymentStatus: 'Refunded' as const, refundStatus: 'Processed' as const };
    dispatch({ type: 'UPDATE_ORDER', order: updated, audit: audit('REFUND_SIMULATED', 'order', refundTarget.id, refundTarget.id, refundTarget.paymentStatus, 'Refunded', 'Simulated refund processed') });
    showToast.success('Refund processed', `${refundTarget.id} - ${formatRs(refundTarget.amount)} refunded via ${refundTarget.gateway}.`);
    setRefundTarget(null);
  };

  const saveNote = () => {
    if (!noteTarget) return;
    if (!noteText.trim()) {
      showToast.warning('Note empty', 'Enter a note before saving.');
      return;
    }
    showToast.success('Note added', `${noteTarget.id} - "${noteText.trim()}"`);
    setNoteTarget(null);
    setNoteText('');
  };

  const columns: Column<Order>[] = [
    {
      key: 'id', header: 'Order ID',
      cell: (o) => <span className="font-mono text-xs font-medium text-foreground">{o.id}</span>,
      sortValue: (o) => o.id,
    },
    {
      key: 'student', header: 'Student',
      cell: (o) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-foreground">{o.studentName}</p>
          <p className="text-xs text-muted-foreground">{o.studentId}</p>
        </div>
      ),
      sortValue: (o) => o.studentName,
    },
    {
      key: 'product', header: 'Product', hideOnMobile: true,
      cell: (o) => <span className="text-sm">{o.product}</span>,
      sortValue: (o) => o.product,
    },
    {
      key: 'amount', header: 'Amount', className: 'text-right',
      cell: (o) => <span className="text-sm font-semibold text-foreground">{formatRs(o.amount)}</span>,
      sortValue: (o) => o.amount,
    },
    {
      key: 'paymentStatus', header: 'Payment',
      cell: (o) => <StatusBadge tone={paymentTone(o.paymentStatus)} dot>{o.paymentStatus}</StatusBadge>,
      sortValue: (o) => o.paymentStatus,
    },
    {
      key: 'entitlementStatus', header: 'Entitlement', hideOnMobile: true,
      cell: (o) => <StatusBadge tone={entitlementTone(o.entitlementStatus)} dot>{o.entitlementStatus}</StatusBadge>,
      sortValue: (o) => o.entitlementStatus,
    },
    {
      key: 'coupon', header: 'Coupon', hideOnMobile: true,
      cell: (o) => (o.coupon ? <Badge variant="outline" className="font-mono text-[10px]">{o.coupon}</Badge> : <span className="text-xs text-muted-foreground">-</span>),
    },
    {
      key: 'gateway', header: 'Gateway', hideOnMobile: true,
      cell: (o) => <StatusBadge tone={gatewayTone(o.gateway)} className="text-[10px]">{o.gateway}</StatusBadge>,
      sortValue: (o) => o.gateway,
    },
    {
      key: 'paymentDate', header: 'Date', hideOnMobile: true,
      cell: (o) => <span className="text-xs text-muted-foreground">{o.paymentDate}</span>,
      sortValue: (o) => o.paymentDate,
    },
    {
      key: 'refundStatus', header: 'Refund',
      cell: (o) => <StatusBadge tone={refundTone(o.refundStatus)} className="text-[10px]">{o.refundStatus}</StatusBadge>,
      sortValue: (o) => o.refundStatus,
    },
    {
      key: 'actions', header: '', className: 'w-10 text-right',
      cell: (o) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSelected(o)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleVerifyPayment(o)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Verify Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRetryEntitlement(o)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry Entitlement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRefundTarget(o)}><RotateCcw className="mr-2 h-4 w-4" /> Initiate Refund</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => showToast.success('Invoice downloaded', `${o.id}.pdf generated.`)}>
                <FileText className="mr-2 h-4 w-4" /> Download Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNoteTarget(o)}><MessageSquare className="mr-2 h-4 w-4" /> Add Note</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders & Payments"
        description="Payment operations - verify, reconcile, and refund transactions."
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => showToast.success('Export started', 'Orders CSV will download shortly.')}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Orders" value={stats.total.toLocaleString('en-IN')} icon={Hash} sublabel="all time" tone="primary" />
        <StatCard label="Successful" value={stats.successful.toLocaleString('en-IN')} icon={CheckCircle2} delta={{ value: '92%', positive: true }} sublabel="success rate" tone="success" />
        <StatCard label="Failed" value={stats.failed.toLocaleString('en-IN')} icon={AlertTriangle} sublabel="needs attention" tone="destructive" />
        <StatCard label="Refunded" value={stats.refunded.toLocaleString('en-IN')} icon={RotateCcw} sublabel="processed" tone="info" />
        <StatCard label="Revenue" value={formatRs(stats.revenue)} icon={IndianRupee} delta={{ value: '11.8%', positive: true }} sublabel="from successful orders" tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setChip(c.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              chip === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {c.label}
            <span className={cn('rounded-full px-1.5 text-[10px]', chip === c.value ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground')}>
              {chipCount(c.value)}
            </span>
          </button>
        ))}
      </div>

      <Card className="p-4">
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(o) => o.id}
          searchable
          searchKeys={(o) => `${o.id} ${o.studentName} ${o.studentId} ${o.product} ${o.coupon ?? ''}`}
          selectable={false}
          rowAction={(o) => setSelected(o)}
          initialSort={{ key: 'paymentDate', dir: 'desc' }}
          emptyTitle="No orders match this filter"
          emptyDescription="Try a different filter chip or search term."
        />
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono text-base">{selected.id}</SheetTitle>
                  <StatusBadge tone={paymentTone(selected.paymentStatus)} dot className="text-[10px]">{selected.paymentStatus}</StatusBadge>
                  {selected.reconIssue && (
                    <StatusBadge tone="warning" className="text-[10px]"><AlertTriangle className="mr-1 h-3 w-3" /> Reconciliation</StatusBadge>
                  )}
                </div>
                <SheetDescription className="sr-only">Order details</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Student</p>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium text-foreground">{selected.studentName}</p>
                    <p className="text-xs text-muted-foreground">{selected.studentId}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Product</p>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium text-foreground">{selected.product}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Payment Breakdown</p>
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold text-foreground">{formatRs(selected.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coupon</span>
                      <span className="font-medium text-foreground">{selected.coupon ? <Badge variant="outline" className="font-mono text-[10px]">{selected.coupon}</Badge> : '-'}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Gateway</span>
                      <StatusBadge tone={gatewayTone(selected.gateway)} className="text-[10px]">{selected.gateway}</StatusBadge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment Status</span>
                      <StatusBadge tone={paymentTone(selected.paymentStatus)} dot className="text-[10px]">{selected.paymentStatus}</StatusBadge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Refund Status</span>
                      <StatusBadge tone={refundTone(selected.refundStatus)} className="text-[10px]">{selected.refundStatus}</StatusBadge>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Entitlement</p>
                  <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <span className="text-sm text-muted-foreground">Access status</span>
                    <StatusBadge tone={entitlementTone(selected.entitlementStatus)} dot className="text-[10px]">{selected.entitlementStatus}</StatusBadge>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</p>
                  <ol className="space-y-2.5 border-l pl-4">
                    <li className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-info ring-4 ring-background" />
                      <p className="text-sm font-medium text-foreground">Order placed</p>
                      <p className="text-xs text-muted-foreground">{selected.paymentDate} - {selected.studentName}</p>
                    </li>
                    <li className="relative">
                      <span className={cn('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background', selected.paymentStatus === 'Success' ? 'bg-success' : selected.paymentStatus === 'Failed' ? 'bg-destructive' : selected.paymentStatus === 'Refunded' ? 'bg-info' : 'bg-warning')} />
                      <p className="text-sm font-medium text-foreground">Payment {selected.paymentStatus.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">Via {selected.gateway}</p>
                    </li>
                    <li className="relative">
                      <span className={cn('absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background', selected.entitlementStatus === 'Active' ? 'bg-success' : selected.entitlementStatus === 'Failed' ? 'bg-destructive' : 'bg-warning')} />
                      <p className="text-sm font-medium text-foreground">Entitlement {selected.entitlementStatus.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">Package access provisioning</p>
                    </li>
                    {selected.refundStatus !== 'None' && (
                      <li className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-info ring-4 ring-background" />
                        <p className="text-sm font-medium text-foreground">Refund {selected.refundStatus.toLowerCase()}</p>
                        <p className="text-xs text-muted-foreground">{formatRs(selected.amount)}</p>
                      </li>
                    )}
                  </ol>
                </div>

                {selected.reconIssue && (
                  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <span>Reconciliation issue detected.</span>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Internal Notes</p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No notes recorded for this order.
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-6 flex-wrap gap-2 sm:flex-nowrap">
                <GatedButton permission="payments.manage" variant="outline" size="sm" onClick={() => handleVerifyPayment(selected)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Verify
                </GatedButton>
                <GatedButton permission="entitlements.manage" variant="outline" size="sm" onClick={() => handleRetryEntitlement(selected)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
                </GatedButton>
                {selected.reconIssue && (
                  <GatedButton permission="payments.manage" variant="outline" size="sm" onClick={() => handleResolveRecon(selected)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolve Recon
                  </GatedButton>
                )}
                <GatedButton permission="refunds.manage" variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setRefundTarget(selected)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Refund
                </GatedButton>
                <Button variant="outline" size="sm" onClick={() => showToast.success('Invoice downloaded', `${selected.id}.pdf`)}>
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Invoice
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!refundTarget} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initiate refund for {refundTarget?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund <span className="font-semibold text-foreground">{refundTarget ? formatRs(refundTarget.amount) : ''}</span> to {refundTarget?.studentName} via {refundTarget?.gateway}. The associated entitlement will be revoked. This action is simulated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefund} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <RotateCcw className="mr-1.5 h-4 w-4" /> Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!noteTarget} onOpenChange={(o) => !o && setNoteTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {noteTarget && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">Add note to {noteTarget.id}</SheetTitle>
                <SheetDescription>Internal note visible to admins only.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="mb-1.5 block">Note</Label>
                  <Input
                    autoFocus
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="e.g. Student reported gateway timeout, manual verification done."
                  />
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="outline" size="sm" onClick={() => { setNoteTarget(null); setNoteText(''); }}>Cancel</Button>
                <Button size="sm" onClick={saveNote}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Save Note</Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
