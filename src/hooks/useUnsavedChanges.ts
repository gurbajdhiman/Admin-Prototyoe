import { useRef, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChanges(
  isDirty: boolean,
  message = 'You have unsaved changes. Leave anyway?',
) {
  const ref = useRef(isDirty);
  ref.current = isDirty;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (ref.current) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [message]);

  const blocker = useBlocker(ref.current);

  const confirmLeave = useCallback((): boolean => {
    if (ref.current) {
      return window.confirm(message);
    }
    return true;
  }, [message]);

  return { confirmLeave, blocker };
}
