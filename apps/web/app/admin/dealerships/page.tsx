"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminDealershipsList } from "@/components/admin/admin-dealerships-list";
import { AddDealershipModal } from "@/components/admin/add-dealership-modal";

export default function AdminDealershipsPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <PageHeader
        title="Dealerships"
        subtitle="All dealerships across every head office"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 font-heading font-semibold text-white transition hover:bg-slate-700"
          >
            <PlusCircle className="h-5 w-5" /> Add dealership
          </button>
        }
      />

      <AdminDealershipsList />

      {showModal && <AddDealershipModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
