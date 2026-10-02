import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { compressForUpload, FileTooLargeError } from "../lib/compressFile";

interface FileInputProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
}

/** Every chosen file is compressed in the browser before it's handed to the form (see compressForUpload). */
export function FileInput({ label, file, onChange, accept = "image/*,.pdf" }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(chosen: File | null) {
    setError(null);
    if (!chosen) {
      onChange(null);
      return;
    }
    setPreparing(true);
    try {
      onChange(await compressForUpload(chosen));
    } catch (err) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      setError(err instanceof FileTooLargeError ? err.message : "Couldn't read that file. Try another.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => void choose(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-sm">
          <span className="truncate text-ink">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="ml-2 shrink-0 text-ink-muted hover:text-rose-600"
            aria-label={`Remove ${label}`}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={preparing}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm text-ink-muted transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          <UploadCloud size={16} />
          {preparing ? "Preparing file..." : "Choose file"}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
