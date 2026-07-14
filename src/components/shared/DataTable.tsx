import { useMemo, useState, type ReactNode } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ArrowUp, ArrowDown, Inbox,
  Columns3, X, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface Column<T> {
  key: string; header: string; cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string; hideOnMobile?: boolean;
}

export interface FilterChip {
  key: string; label: string; value: string;
}

export interface TableSettings {
  visibleColumns: string[];
  columnOrder: string[];
  pageSize: number;
}

interface DataTableProps<T> {
  data: T[]; columns: Column<T>[]; getRowId: (row: T) => string;
  searchable?: boolean; searchKeys?: (row: T) => string;
  pageSize?: number; selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  rowAction?: (row: T) => void;
  toolbar?: ReactNode;
  emptyTitle?: string; emptyDescription?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  filterChips?: FilterChip[];
  onClearChip?: (key: string) => void;
  onClearAllChips?: () => void;
  bulkActions?: ReactNode;
  settings?: TableSettings;
  onSettingsChange?: (settings: TableSettings) => void;
  loading?: boolean;
  onExport?: () => void;
}

export function DataTable<T>({
  data, columns, getRowId, searchable = true, searchKeys, pageSize = 10,
  selectable = true, onSelectionChange, rowAction, toolbar,
  emptyTitle = 'No records found', emptyDescription = 'Try adjusting your filters or search terms.',
  initialSort, filterChips, onClearChip, onClearAllChips, bulkActions,
  settings, onSettingsChange, loading, onExport,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const effectivePageSize = settings?.pageSize ?? pageSize;

  const visibleCols = useMemo(() => {
    let cols = columns;
    if (settings?.visibleColumns && settings.visibleColumns.length > 0) {
      cols = columns.filter((c) => settings.visibleColumns.includes(c.key));
    }
    if (settings?.columnOrder && settings.columnOrder.length > 0) {
      cols = [...cols].sort((a, b) => {
        const ia = settings.columnOrder.indexOf(a.key);
        const ib = settings.columnOrder.indexOf(b.key);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return cols;
  }, [columns, settings]);

  const filtered = useMemo(() => {
    if (!query || !searchKeys) return data;
    const q = query.toLowerCase();
    return data.filter((row) => searchKeys(row).toLowerCase().includes(q));
  }, [data, query, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a); const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / effectivePageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  const toggleSort = (key: string) => {
    setSort((prev) => prev?.key === key ? (prev.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' });
  };

  const allOnPageSelected = paged.length > 0 && paged.every((r) => selected.has(getRowId(r)));
  const toggleAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) paged.forEach((r) => next.delete(getRowId(r)));
    else paged.forEach((r) => next.add(getRowId(r)));
    setSelected(next); onSelectionChange?.([...next]);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next); onSelectionChange?.([...next]);
  };

  const toggleColumnVisible = (key: string) => {
    if (!onSettingsChange || !settings) return;
    const current = settings.visibleColumns.length > 0 ? settings.visibleColumns : columns.map((c) => c.key);
    const isVisible = current.includes(key);
    const next = isVisible ? current.filter((k) => k !== key) : [...current, key];
    onSettingsChange({ ...settings, visibleColumns: next });
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    if (!onSettingsChange || !settings) return;
    const order = settings.columnOrder.length > 0 ? settings.columnOrder : columns.map((c) => c.key);
    const idx = order.indexOf(key);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    const next = [...order];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onSettingsChange({ ...settings, columnOrder: next });
  };

  const changePageSize = (size: number) => {
    if (!onSettingsChange || !settings) { setPage(1); return; }
    onSettingsChange({ ...settings, pageSize: size });
    setPage(1);
  };

  const hasActiveChips = filterChips && filterChips.length > 0;
  const showBulkBar = selectable && selected.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {searchable && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search…" className="pl-9" />
          </div>
        )}
        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          )}
          {onSettingsChange && settings && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Columns3 className="h-3.5 w-3.5" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Visible Columns</div>
                {columns.map((col) => {
                  const current = settings.visibleColumns.length > 0 ? settings.visibleColumns : columns.map((c) => c.key);
                  const isVisible = current.includes(col.key);
                  return (
                    <DropdownMenuItem key={col.key} className="flex items-center justify-between" onSelect={(e) => { e.preventDefault(); toggleColumnVisible(col.key); }}>
                      <span className="flex items-center gap-2">
                        <Checkbox checked={isVisible} />
                        <span className="text-sm">{col.header}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Reorder</div>
                {visibleCols.map((col) => (
                  <DropdownMenuItem key={`reorder-${col.key}`} className="flex items-center justify-between" onSelect={(e) => e.preventDefault()}>
                    <span className="truncate text-sm">{col.header}</span>
                    <span className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveColumn(col.key, -1)}>↑</Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveColumn(col.key, 1)}>↓</Button>
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Page Size</div>
                {[10, 25, 50, 100].map((size) => (
                  <DropdownMenuItem key={size} onSelect={() => changePageSize(size)}>
                    {size} rows {effectivePageSize === size && '✓'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {toolbar}
        </div>
      </div>

      {hasActiveChips && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filterChips!.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/50 py-1 pl-3 pr-1.5 text-xs font-medium text-secondary-foreground">
              {chip.label}: {chip.value}
              {onClearChip && (
                <button onClick={() => onClearChip(chip.key)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-secondary">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {onClearAllChips && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAllChips}>Clear all</Button>
          )}
        </div>
      )}

      {showBulkBar && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-primary">{selected.size} selected</span>
            {bulkActions}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set()); onSelectionChange?.([]); }}>Clear</Button>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {selectable && <TableHead className="w-10 pl-4"><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAllOnPage} aria-label="Select all" /></TableHead>}
              {visibleCols.map((col) => (
                <TableHead key={col.key} className={cn(col.hideOnMobile && 'hidden md:table-cell', col.className)}>
                  {col.sortValue ? (
                    <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground">
                      {col.header}
                      {sort?.key === col.key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleCols.length + (selectable ? 1 : 0)} className="py-8">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleCols.length + (selectable ? 1 : 0)} className="py-0">
                  <EmptyState icon={<Inbox className="h-7 w-7" />} title={emptyTitle} description={emptyDescription} className="my-8 border-0 bg-transparent" />
                </TableCell>
              </TableRow>
            ) : paged.map((row) => {
              const id = getRowId(row);
              const isSel = selected.has(id);
              return (
                <TableRow key={id} data-state={isSel ? 'selected' : undefined} onClick={() => rowAction?.(row)} className={cn(rowAction && 'cursor-pointer')}>
                  {selectable && <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}><Checkbox checked={isSel} onCheckedChange={() => toggleRow(id)} aria-label="Select row" /></TableCell>}
                  {visibleCols.map((col) => (
                    <TableCell key={col.key} className={cn(col.hideOnMobile && 'hidden md:table-cell', col.className)}>{col.cell(row)}</TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{paged.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1}</span>
          –<span className="font-medium text-foreground">{Math.min(currentPage * effectivePageSize, sorted.length)}</span> of{' '}
          <span className="font-medium text-foreground">{sorted.length}</span>
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-2 text-sm font-medium">{currentPage} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
