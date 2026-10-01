import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function Sheet({ open, title, onClose, actions, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet" role="dialog" aria-modal aria-label={title}>
      <button type="button" className="sheet__scrim" aria-label="Close" onClick={onClose} />
      <div className="sheet__panel">
        <header className="sheet__header">
          <h2>{title}</h2>
          <div className="sheet__actions">
            {actions}
            <button type="button" className="sheet__close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
