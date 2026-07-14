import { useState, useCallback } from 'react';
import { usePrototypeStore } from '@/app/store/PrototypeStore';
import { useSavedViewsByPage, useDefaultSavedView } from '@/app/store/selectors';
import type { SavedView, SavedViewState } from '@/app/store/types';
import { showToast } from '@/components/shared/toast';
import {
  Save, Star, Copy, Trash2, Pencil, Eye, EyeOff, Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function genId() { return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function today() { return new Date().toISOString().slice(0, 10); }

export function useSavedViews(page: string) {
  const { activeRole, addSavedView, updateSavedView, deleteSavedView, setDefaultSavedView } = usePrototypeStore();
  const views = useSavedViewsByPage(page);
  const defaultView = useDefaultSavedView(page);

  const createView = useCallback((name: string, state: SavedViewState, scope: 'private' | 'shared' = 'private', isDefault = false) => {
    const view: SavedView = {
      id: genId(), name, page, scope, ownerId: activeRole, state, isDefault,
      createdAt: today(), updatedAt: today(),
    };
    addSavedView(view);
    showToast.success('View saved', `"${name}" has been saved.`);
    return view;
  }, [activeRole, addSavedView, page]);

  const renameView = useCallback((id: string, name: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    updateSavedView({ ...view, name, updatedAt: today() });
    showToast.success('View renamed', `"${name}" has been updated.`);
  }, [views, updateSavedView]);

  const duplicateView = useCallback((id: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    const copy: SavedView = {
      ...view, id: genId(), name: `${view.name} (copy)`, isDefault: false,
      createdAt: today(), updatedAt: today(),
    };
    addSavedView(copy);
    showToast.success('View duplicated', `"${copy.name}" has been created.`);
    return copy;
  }, [views, addSavedView]);

  const removeView = useCallback((id: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    deleteSavedView(id);
    showToast.info('View deleted', `"${view.name}" has been removed.`);
  }, [views, deleteSavedView]);

  const makeDefault = useCallback((id: string) => {
    setDefaultSavedView(page, id);
    showToast.success('Default view set', 'This view will load by default.');
  }, [page, setDefaultSavedView]);

  const toggleScope = useCallback((id: string) => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    const scope = view.scope === 'private' ? 'shared' : 'private';
    updateSavedView({ ...view, scope, updatedAt: today() });
    showToast.info(`View is now ${scope}`, `"${view.name}" visibility changed.`);
  }, [views, updateSavedView]);

  return {
    views, defaultView,
    createView, renameView, duplicateView, removeView, makeDefault, toggleScope,
  };
}

export function SavedViewsBar({
  page, activeViewId, onSelectView, currentState, onApplyState,
}: {
  page: string;
  activeViewId: string | null;
  onSelectView: (view: SavedView | null) => void;
  currentState: SavedViewState;
  onApplyState: (state: SavedViewState) => void;
}) {
  const { views, createView, renameView, duplicateView, removeView, makeDefault, toggleScope } = useSavedViews(page);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<SavedView | null>(null);

  const handleSave = () => {
    if (!newName.trim()) return;
    createView(newName.trim(), currentState);
    setNewName('');
    setSaveDialogOpen(false);
  };

  const handleRename = () => {
    if (!renameTarget || !newName.trim()) return;
    renameView(renameTarget.id, newName.trim());
    setNewName('');
    setRenameTarget(null);
    setRenameDialogOpen(false);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onSelectView(null)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !activeViewId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          )}
        >
          All
        </button>
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => { onSelectView(v); onApplyState(v.state); }}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeViewId === v.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
          >
            {v.isDefault && <Star className="h-3 w-3 fill-current" />}
            {v.name}
            {v.scope === 'shared' && <Share2 className="h-3 w-3 opacity-60" />}
          </button>
        ))}
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setSaveDialogOpen(true)}>
          <Save className="h-3.5 w-3.5" /> Save View
        </Button>
        {views.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">Manage</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Manage Views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {views.map((v) => (
                <DropdownMenuItem key={v.id} className="flex items-center justify-between" onSelect={(e) => e.preventDefault()}>
                  <span className="flex items-center gap-1.5 truncate">
                    {v.isDefault && <Star className="h-3 w-3 fill-current text-warning" />}
                    <span className="truncate text-sm">{v.name}</span>
                    <Badge variant="outline" className="text-[9px]">{v.scope}</Badge>
                  </span>
                  <span className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Rename" onClick={() => { setRenameTarget(v); setNewName(v.name); setRenameDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => duplicateView(v.id)}><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" title={v.isDefault ? 'Unset default' : 'Set as default'} onClick={() => makeDefault(v.id)}><Star className={cn('h-3 w-3', v.isDefault && 'fill-current text-warning')} /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" title={v.scope === 'private' ? 'Make shared' : 'Make private'} onClick={() => toggleScope(v.id)}>{v.scope === 'private' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete" onClick={() => removeView(v.id)}><Trash2 className="h-3 w-3" /></Button>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save View</DialogTitle>
            <DialogDescription>Save current filters, sorting, and column settings as a reusable view.</DialogDescription>
          </DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="View name…" onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!newName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename View</DialogTitle>
            <DialogDescription>Enter a new name for this saved view.</DialogDescription>
          </DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="View name…" onKeyDown={(e) => e.key === 'Enter' && handleRename()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
