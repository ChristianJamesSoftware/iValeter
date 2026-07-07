"use client";
/**
 * JobAutoAccept
 * Fires once when a valeter opens a PENDING job assigned to them.
 * Advances status PENDING → ASSIGNED silently in the background.
 * Triggers a page refresh so the action buttons update immediately.
 */
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";

export function JobAutoAccept({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const fired = useRef(false);

  const accept = trpc.bookings.valeterAccept.useMutation({
    onSuccess: () => router.refresh(),
  });

  useEffect(() => {
    if (status === "PENDING" && !fired.current) {
      fired.current = true;
      accept.mutate({ id: bookingId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // renders nothing
}
