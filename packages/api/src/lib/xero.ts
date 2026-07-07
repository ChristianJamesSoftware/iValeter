import { prisma } from "@ivaleter/db";
import { getPlatformConfig } from "./platform-config";
import { encrypt, decrypt } from "./crypto";

const AUTH_BASE = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";
const API_BASE = "https://api.xero.com/api.xro/2.0";
const SCOPE =
  "accounting.invoices accounting.contacts accounting.settings offline_access";

export interface XeroAccount {
  accountId: string;
  code: string;
  name: string;
  type: string;
  taxType: string;
}

/** Encode the org id into the OAuth state param. */
function encodeState(orgId: string): string {
  return Buffer.from(JSON.stringify({ orgId })).toString("base64url");
}

function decodeState(state: string): { orgId: string } {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

/** Build the Xero consent URL to redirect the user to. */
export async function buildXeroAuthUrl(orgId: string): Promise<string> {
  const clientId = await getPlatformConfig("XERO_CLIENT_ID");
  const redirectUri = await getPlatformConfig("XERO_REDIRECT_URI");
  if (!clientId || !redirectUri) {
    throw new Error(
      "Xero is not configured. Set XERO_CLIENT_ID and XERO_REDIRECT_URI in platform settings.",
    );
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state: encodeState(orgId),
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

/**
 * Exchange the auth code for tokens, fetch the connected tenant, and persist
 * the connection. Returns the path to redirect the user to afterwards.
 */
export async function handleXeroCallback(
  code: string,
  state: string,
): Promise<string> {
  const { orgId } = decodeState(state);
  const clientId = await getPlatformConfig("XERO_CLIENT_ID");
  const clientSecret = await getPlatformConfig("XERO_CLIENT_SECRET");
  const redirectUri = await getPlatformConfig("XERO_REDIRECT_URI");

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Xero token exchange failed: ${await tokenRes.text()}`);
  }
  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const connRes = await fetch(CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
  });
  if (!connRes.ok) {
    throw new Error(`Xero connections fetch failed: ${await connRes.text()}`);
  }
  const tenants = (await connRes.json()) as Array<{
    tenantId: string;
    tenantName: string;
  }>;
  const tenant = tenants[0];
  if (!tenant) {
    throw new Error("No Xero organisations are connected to this login.");
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000);
  await prisma.xeroConnection.upsert({
    where: { organisationId: orgId },
    update: {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: encrypt(token.access_token),
      refreshToken: encrypt(token.refresh_token),
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
    create: {
      organisationId: orgId,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
      accessToken: encrypt(token.access_token),
      refreshToken: encrypt(token.refresh_token),
      tokenExpiresAt: expiresAt,
    },
  });

  return "/org/settings?tab=xero&connected=true";
}

/** Return a valid access token, refreshing it if it has expired. */
export async function getValidToken(organisationId: string): Promise<string> {
  const conn = await prisma.xeroConnection.findUnique({
    where: { organisationId },
  });
  if (!conn) throw new Error("Xero is not connected for this organisation.");

  // Refresh a minute before expiry to avoid edge races.
  if (conn.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decrypt(conn.accessToken);
  }

  const clientId = await getPlatformConfig("XERO_CLIENT_ID");
  const clientSecret = await getPlatformConfig("XERO_CLIENT_SECRET");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decrypt(conn.refreshToken),
    }),
  });
  if (!res.ok) {
    throw new Error(`Xero token refresh failed: ${await res.text()}`);
  }
  const token = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  await prisma.xeroConnection.update({
    where: { organisationId },
    data: {
      accessToken: encrypt(token.access_token),
      refreshToken: encrypt(token.refresh_token),
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    },
  });
  return token.access_token;
}

/** Authenticated request to the Xero accounting API. */
export async function xeroRequest(
  organisationId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const conn = await prisma.xeroConnection.findUnique({
    where: { organisationId },
  });
  if (!conn) throw new Error("Xero is not connected for this organisation.");
  const accessToken = await getValidToken(organisationId);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": conn.tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Xero API ${method} ${path} failed: ${await res.text()}`);
  }
  return res.json();
}

/** Pull the chart of accounts (revenue accounts) from Xero. */
export async function fetchXeroAccounts(
  organisationId: string,
): Promise<XeroAccount[]> {
  const data = (await xeroRequest(organisationId, "GET", "/Accounts")) as {
    Accounts?: Array<{
      AccountID: string;
      Code: string;
      Name: string;
      Type: string;
      TaxType: string;
    }>;
  };
  return (data.Accounts ?? []).map((a) => ({
    accountId: a.AccountID,
    code: a.Code,
    name: a.Name,
    type: a.Type,
    taxType: a.TaxType,
  }));
}

/** Ensure a Xero contact exists for a dealership/site, return its ID. */
export async function findOrCreateContact(
  organisationId: string,
  siteName: string,
  email?: string,
): Promise<string> {
  const where = encodeURIComponent(`Name=="${siteName.replace(/"/g, "")}"`);
  const found = (await xeroRequest(
    organisationId,
    "GET",
    `/Contacts?where=${where}`,
  )) as { Contacts?: Array<{ ContactID: string }> };
  const existing = found.Contacts?.[0];
  if (existing) return existing.ContactID;

  const created = (await xeroRequest(organisationId, "POST", "/Contacts", {
    Contacts: [{ Name: siteName, EmailAddress: email }],
  })) as { Contacts?: Array<{ ContactID: string }> };
  const contactId = created.Contacts?.[0]?.ContactID;
  if (!contactId) throw new Error("Failed to create Xero contact.");
  return contactId;
}

interface InvoiceLineItem {
  description?: string;
  quantity?: number;
  unitAmount?: number;
  nominalCode?: string;
}

/** Push an iValeter invoice to Xero as a draft sales invoice. */
export async function pushInvoiceToXero(
  invoiceId: string,
): Promise<{ xeroInvoiceId: string; xeroInvoiceNumber: string }> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found.");

  const conn = await prisma.xeroConnection.findUnique({
    where: { organisationId: invoice.organisationId },
  });
  if (!conn) throw new Error("Xero is not connected for this organisation.");

  const mappings = await prisma.xeroNominalMapping.findMany({
    where: { organisationId: invoice.organisationId },
  });

  const site = invoice.siteId
    ? await prisma.site.findUnique({ where: { id: invoice.siteId } })
    : null;
  const contactName = site?.name ?? "iValeter Customer";
  const contactId = await findOrCreateContact(
    invoice.organisationId,
    contactName,
  );

  const lines = (invoice.lineItems as InvoiceLineItem[]) ?? [];
  const lineItems = lines.map((li) => ({
    Description: li.description ?? "Valeting services",
    Quantity: li.quantity ?? 1,
    UnitAmount: li.unitAmount ?? 0,
    AccountCode: li.nominalCode ?? mappings[0]?.xeroAccountCode ?? "200",
    TaxType: conn.taxType,
  }));

  const dueDate = new Date(
    Date.now() + conn.paymentTerms * 24 * 60 * 60 * 1000,
  );

  const result = (await xeroRequest(invoice.organisationId, "POST", "/Invoices", {
    Invoices: [
      {
        Type: "ACCREC",
        Contact: { ContactID: contactId },
        Date: new Date().toISOString().slice(0, 10),
        DueDate: dueDate.toISOString().slice(0, 10),
        LineAmountTypes: "Exclusive",
        Status: "DRAFT",
        LineItems: lineItems,
      },
    ],
  })) as {
    Invoices?: Array<{
      InvoiceID: string;
      InvoiceNumber: string;
      Status: string;
    }>;
  };

  const xeroInvoice = result.Invoices?.[0];
  if (!xeroInvoice) throw new Error("Xero did not return an invoice.");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      xeroInvoiceId: xeroInvoice.InvoiceID,
      xeroInvoiceNumber: xeroInvoice.InvoiceNumber,
      xeroStatus: xeroInvoice.Status,
      pushedToXeroAt: new Date(),
    },
  });
  await prisma.xeroConnection.update({
    where: { organisationId: invoice.organisationId },
    data: { lastSyncAt: new Date() },
  });

  return {
    xeroInvoiceId: xeroInvoice.InvoiceID,
    xeroInvoiceNumber: xeroInvoice.InvoiceNumber,
  };
}

/** Pull the latest status of a pushed invoice back from Xero. */
export async function syncInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice?.xeroInvoiceId) {
    throw new Error("Invoice has not been pushed to Xero.");
  }
  const data = (await xeroRequest(
    invoice.organisationId,
    "GET",
    `/Invoices/${invoice.xeroInvoiceId}`,
  )) as { Invoices?: Array<{ Status: string }> };
  const status = data.Invoices?.[0]?.Status;
  if (status) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        xeroStatus: status,
        status: status === "PAID" ? "PAID" : invoice.status,
      },
    });
  }
}
