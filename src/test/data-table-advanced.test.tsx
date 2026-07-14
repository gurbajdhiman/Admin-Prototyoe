import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column, type TableSettings } from '@/components/shared/DataTable';

interface Row { id: string; name: string; score: number }

const data: Row[] = [
  { id: 'r1', name: 'Alpha', score: 10 },
  { id: 'r2', name: 'Beta', score: 20 },
  { id: 'r3', name: 'Gamma', score: 30 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', cell: (r) => r.name, sortValue: (r) => r.name },
  { key: 'score', header: 'Score', cell: (r) => String(r.score), sortValue: (r) => r.score },
  { key: 'extra', header: 'Extra', cell: (r) => `${r.id}-extra`, hideOnMobile: true },
];

describe('DataTable advanced controls', () => {
  it('hides columns based on settings.visibleColumns', () => {
    const settings: TableSettings = { visibleColumns: ['name'], columnOrder: ['name'], pageSize: 10 };
    render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} settings={settings} onSettingsChange={() => {}} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('10')).toBeNull();
  });

  it('reorders columns based on settings.columnOrder', () => {
    const settings: TableSettings = { visibleColumns: ['name', 'score'], columnOrder: ['score', 'name'], pageSize: 10 };
    const { container } = render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} settings={settings} onSettingsChange={() => {}} />);
    const headers = Array.from(container.querySelectorAll('th')).map((th) => th.textContent?.trim());
    const scoreIdx = headers.findIndex((h) => h?.includes('Score'));
    const nameIdx = headers.findIndex((h) => h?.includes('Name'));
    expect(scoreIdx).toBeLessThan(nameIdx);
  });

  it('renders filter chips when provided', () => {
    render(<DataTable data={data} columns={columns} getRowId={(r) => r.id}
      filterChips={[{ key: 'status', label: 'Status', value: 'Approved' }]} onClearChip={() => {}} onClearAllChips={() => {}} />);
    expect(screen.getByText('Status: Approved')).toBeTruthy();
  });

  it('renders bulk action bar when rows are selected', () => {
    render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} selectable
      bulkActions={<button>Bulk Delete</button>} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(screen.getByText(/selected/)).toBeTruthy();
    expect(screen.getByText('Bulk Delete')).toBeTruthy();
  });

  it('uses settings.pageSize for pagination', () => {
    const bigData = Array.from({ length: 30 }).map((_, i) => ({ id: `r${i}`, name: `Item${i}`, score: i }));
    const settings: TableSettings = { visibleColumns: ['name'], columnOrder: ['name'], pageSize: 5 };
    render(<DataTable data={bigData} columns={columns} getRowId={(r) => r.id} settings={settings} onSettingsChange={() => {}} />);
    expect(screen.getByText(/1 \/ 6/)).toBeTruthy();
  });

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={columns} getRowId={(r) => r.id} loading />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('shows export button when onExport provided', () => {
    render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} onExport={() => {}} />);
    expect(screen.getByText('Export')).toBeTruthy();
  });
});
