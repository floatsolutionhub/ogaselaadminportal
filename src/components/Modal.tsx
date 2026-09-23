import type { ReactNode } from "react";

const MAX_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH;
}

/** Same fixed-overlay + white-panel shape used inline by DataErasurePage's confirm dialog, extracted for reuse. */
export function Modal({ open, onClose, title, description, children, maxWidth = "md" }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${MAX_WIDTH[maxWidth]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}>
        {(title || description) && (
          <div className="mb-4">
            {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
