"use client";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-navy">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
      />
      {hint && <span className="mt-1 block text-xs text-slate">{hint}</span>}
    </label>
  );
}

export function SaveBar({
  onSave,
  saving,
  saved,
  error,
  label = "Save changes",
}: {
  onSave: () => void;
  saving: boolean;
  saved?: boolean;
  error?: string | null;
  label?: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="h-11 rounded-lg bg-navy px-6 font-heading font-semibold text-white transition hover:bg-navy-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : label}
      </button>
      {saved && <span className="text-sm font-medium text-success">Saved</span>}
      {error && <span className="text-sm font-medium text-danger">{error}</span>}
    </div>
  );
}
