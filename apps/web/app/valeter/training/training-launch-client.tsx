"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2, ExternalLink } from "lucide-react";

const TRAINING_URL = process.env.NEXT_PUBLIC_TRAINING_URL ?? "https://training.totalvaleting.co.uk";
const SSO_SECRET = process.env.NEXT_PUBLIC_SSO_SECRET ?? "tos-training-sso-secret-2026";

// Simple HMAC-signed JWT using Web Crypto (runs in browser, no Node deps needed)
async function createSSOToken(email: string, name: string, role: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payload = btoa(JSON.stringify({
    email,
    name,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minute expiry
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const sigInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SSO_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sigInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${sigInput}.${sigB64}`;
}

interface Props {
  email: string;
  name: string;
  role: string;
}

export function TrainingLaunchClient({ email, name, role }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [launchUrl, setLaunchUrl] = useState<string>("");

  useEffect(() => {
    createSSOToken(email, name, role)
      .then((token) => {
        setLaunchUrl(`${TRAINING_URL}?sso=${encodeURIComponent(token)}`);
        setStatus("ready");
        // Auto-open after a brief moment
        setTimeout(() => {
          window.location.href = `${TRAINING_URL}?sso=${encodeURIComponent(token)}`;
        }, 800);
      })
      .catch(() => setStatus("error"));
  }, [email, name, role]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy">
        <GraduationCap className="h-8 w-8 text-cyan" />
      </div>

      <div>
        <h1 className="text-xl font-bold text-navy">Total Valeting Training</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal training portal</p>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your training session…
        </div>
      )}

      {status === "ready" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Opening training portal…
          </div>
          <a
            href={launchUrl}
            className="flex items-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Open Training Portal
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Could not connect to training portal. Please try again or contact your Account Manager.
        </div>
      )}
    </div>
  );
}
