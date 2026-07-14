import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Save, Trash2, PenLine } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onContinue: () => void;
}

export function UnsavedChangesDialog({
  open,
  onSave,
  onDiscard,
  onContinue,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onContinue()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel onClick={onContinue} className="border">
            <PenLine className="mr-2 h-4 w-4" /> Continue Editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="border bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Discard Changes
          </AlertDialogAction>
          <AlertDialogAction onClick={onSave} className="bg-primary text-primary-foreground">
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
