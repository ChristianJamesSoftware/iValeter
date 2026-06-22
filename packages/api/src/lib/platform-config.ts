import { prisma } from "@ivaleter/db";

/** Read a single platform config value (empty string if unset). */
export async function getPlatformConfig(key: string): Promise<string> {
  const row = await prisma.platformConfig.findUnique({ where: { key } });
  return row?.value ?? "";
}

/** Read many platform config values keyed by their config key. */
export async function getPlatformConfigMany(
  keys: string[],
): Promise<Record<string, string>> {
  const rows = await prisma.platformConfig.findMany({
    where: { key: { in: keys } },
  });
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = "";
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Upsert a platform config value. */
export async function setPlatformConfig(
  key: string,
  value: string,
  opts?: { isSecret?: boolean; updatedBy?: string },
): Promise<void> {
  await prisma.platformConfig.upsert({
    where: { key },
    update: { value, updatedBy: opts?.updatedBy },
    create: {
      key,
      value,
      isSecret: opts?.isSecret ?? false,
      updatedBy: opts?.updatedBy,
    },
  });
}

/** Keys treated as secret — never returned in clear text to the client. */
export const SECRET_KEYS = new Set(["XERO_CLIENT_SECRET", "XERO_CLIENT_ID"]);
