"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  value: string;           // current value — base64 data URL or https URL
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
  maxKb?: number;          // default 500 KB
}

/**
 * Drag-and-drop / click-to-browse logo uploader.
 * Converts the selected image to a base64 data URL stored directly in the DB.
 * Accepts PNG, JPG, SVG, WEBP. Enforces a max file size (default 500 KB).
 */
export function LogoUpload({
  value,
  onChange,
  label = "Logo",
  hint = "PNG, JPG, SVG or WEBP · Max 500 KB",
  maxKb = 500,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (PNG, JPG, SVG, WEBP).");
        return;
      }
      if (file.size > maxKb * 1024) {
        setError(`File too large — max ${maxKb} KB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === "string") onChange(result);
      };
      reader.readAsDataURL(file);
    },
    [maxKb, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium text-slate">{label}</p>
      )}

      {value ? (
        /* ── Preview state ── */
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-line bg-offwhite p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Logo preview"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-navy hover:border-cyan hover:text-cyan transition-colors"
            >
              <Upload className="h-3 w-3" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); setError(null); }}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-xs font-medium text-slate hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
            dragging
              ? "border-cyan bg-cyan/5"
              : "border-line bg-offwhite hover:border-cyan/60 hover:bg-cyan/5",
          )}
        >
          <ImageIcon className={cn("h-6 w-6 transition-colors", dragging ? "text-cyan" : "text-slate/50")} />
          <p className="text-xs font-medium text-slate">
            {dragging ? "Drop to upload" : "Drag & drop or click to upload"}
          </p>
          <p className="text-[10px] text-slate/50">{hint}</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={onFileInput}
      />
    </div>
  );
}
