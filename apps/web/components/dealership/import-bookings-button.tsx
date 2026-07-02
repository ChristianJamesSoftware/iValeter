"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ImportBookingsModal } from "./import-bookings-modal";

export function ImportBookingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-heading font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Upload className="h-5 w-5" />
        Import Bookings
      </button>
      {open && <ImportBookingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
