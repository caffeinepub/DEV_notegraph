import { LAYOUT_STYLES, Layout } from "@/components/Layout";
import { NoteEditor } from "@/components/NoteEditor";
import { RightPanel } from "@/components/RightPanel";
import { SearchModal } from "@/components/SearchModal";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useBootstrap } from "@/hooks/useBackend";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

function KeyboardShortcuts() {
  const { setIsSearchOpen, isEditMode } = useStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd/Ctrl+K → open search
      if (e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Cmd/Ctrl+S → trigger manual save (only in edit mode)
      if (e.key === "s") {
        e.preventDefault();
        if (isEditMode) {
          window.dispatchEvent(new CustomEvent("kb:save-note"));
        }
        return;
      }

      // Cmd/Ctrl+N → new note
      if (e.key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:new-note"));
        return;
      }

      // Cmd/Ctrl+Shift+L → insert link
      if (e.shiftKey && e.key === "L") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:insert-link"));
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setIsSearchOpen, isEditMode]);

  return null;
}

function AppInner() {
  useBootstrap();

  return (
    <>
      <style>{LAYOUT_STYLES}</style>
      <KeyboardShortcuts />
      <Layout
        sidebar={<Sidebar />}
        editor={
          <>
            <NoteEditor />
            <SearchModal />
          </>
        }
        rightPanel={<RightPanel />}
      />
      <Toaster richColors position="bottom-right" />
    </>
  );
}

export default function App() {
  return <AppInner />;
}
