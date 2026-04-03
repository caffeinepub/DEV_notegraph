// Auto-save is disabled. Manual save via the Save button is used instead.
// This file is kept as a no-op to avoid breaking any residual imports.

export function useAutoSave() {
  return { forceSave: () => Promise.resolve(), isDirty: false };
}
