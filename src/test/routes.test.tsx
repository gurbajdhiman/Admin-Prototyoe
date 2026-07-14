import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { PrototypeStoreProvider } from '@/app/store/PrototypeStore';
import { AdminLayout } from '@/app/layout/AdminLayout';
import { DashboardPage } from '@/pages/overview/DashboardPage';
import { QuestionBankPage } from '@/pages/content/QuestionBankPage';
import { TestsPage } from '@/pages/tests/TestsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/**
 * Render the app shell with a MemoryRouter at the given initial path. We avoid
 * mounting <App /> directly because it hardcodes BrowserRouter (which couples
 * to window.location); instead we compose the same providers + layout + routes
 * with an in-memory router so navigation is deterministic in jsdom.
 */
function renderAt(initialPath: string) {
  return render(
    <ThemeProvider>
      <PrototypeStoreProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/content/questions" element={<QuestionBankPage />} />
              <Route path="/tests" element={<TestsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </PrototypeStoreProvider>
    </ThemeProvider>,
  );
}

describe('Routes — page rendering', () => {
  it('renders the Dashboard page at /dashboard', () => {
    renderAt('/dashboard');
    // DashboardPage renders <PageHeader title="Dashboard" /> as an <h1>.
    expect(screen.getByRole('heading', { level: 1, name: 'Command Centre' })).toBeInTheDocument();
  });

  it('redirects / to /dashboard', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Command Centre' })).toBeInTheDocument();
  });

  it('renders the Question Bank page at /content/questions', () => {
    renderAt('/content/questions');
    expect(screen.getByRole('heading', { level: 1, name: 'Question Bank' })).toBeInTheDocument();
  });

  it('renders the Tests page at /tests', () => {
    renderAt('/tests');
    expect(screen.getByRole('heading', { level: 1, name: 'Tests' })).toBeInTheDocument();
  });

  it('renders the 404 page for an unknown route', () => {
    renderAt('/this-route-does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
  });
});
