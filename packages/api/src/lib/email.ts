/**
 * Shared iValeter email helper.
 *
 * All transactional emails go through this module so branding,
 * SMTP config, and from-address are consistent everywhere.
 *
 * SMTP env vars (already set on Railway):
 *   SMTP_HOST  — smtp.office365.com
 *   SMTP_PORT  — 587
 *   SMTP_USER  — chris@totalvaleting.co.uk
 *   SMTP_PASS  — (password)
 */

import nodemailer from "nodemailer";

// ─── Brand colours ────────────────────────────────────────────────────────────
const BRAND_ORANGE = "#E8650A";
const BRAND_CREAM  = "#F5F0E8";
const BRAND_INK    = "#1C1A16";

// ─── Transporter (lazy singleton) ─────────────────────────────────────────────
type NMTransporter = ReturnType<typeof nodemailer.createTransport>;
let _transporter: NMTransporter | null = null;

function getTransporter(): NMTransporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.office365.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      type: "login",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
  return _transporter;
}

// ─── HTML shell ───────────────────────────────────────────────────────────────
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>iValeter</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_CREAM};font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_CREAM};padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND_INK};padding:28px 36px;border-radius:12px 12px 0 0;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              i<span style="color:${BRAND_ORANGE};">Valeter</span>
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px;border-radius:0 0 12px 12px;border:1px solid #e8e5df;border-top:none;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#7A7974;">
              iValeter — Powered by Total Valeting Services Ltd<br/>
              This email was sent from a monitored mailbox. You can reply directly to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── CTA button helper ─────────────────────────────────────────────────────────
function ctaButton(label: string, url: string): string {
  return `<p style="margin:28px 0 0;">
    <a href="${url}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;">
      ${label}
    </a>
  </p>`;
}

// ─── Core send ─────────────────────────────────────────────────────────────────
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const smtpUser = process.env.SMTP_USER ?? "";
  const smtpPass = process.env.SMTP_PASS ?? "";
  if (!smtpUser || !smtpPass) {
    console.warn("[email] SMTP not configured — skipping email to", opts.to);
    return;
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"iValeter" <${smtpUser}>`,
    replyTo: opts.replyTo ?? smtpUser,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

// ─── Transactional templates ───────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.ivaleter.co.uk";

/** Timesheet sent to client for approval */
export async function emailTimesheetSentToClient(opts: {
  to: string;
  clientName: string;
  siteName: string;
  weekStarting: string;
  totalHours: string;
  approvalUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Timesheet ready for approval — ${opts.siteName} w/c ${opts.weekStarting}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_INK};">Timesheet ready for approval</h2>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">Hi ${opts.clientName},</p>
      <p style="margin:0 0 16px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        The timesheet for <strong>${opts.siteName}</strong> for the week commencing
        <strong>${opts.weekStarting}</strong> is ready for your review.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <tr>
          <td style="padding:12px 16px;background:${BRAND_CREAM};border-radius:8px;font-size:14px;color:${BRAND_INK};">
            <strong>Total hours:</strong> ${opts.totalHours}
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;color:${BRAND_INK};font-size:14px;line-height:1.6;">
        Please review and approve within <strong>4 hours</strong>. If no action is taken, the timesheet
        will be automatically approved.
      </p>
      ${ctaButton("Review & Approve", opts.approvalUrl)}
    `),
  });
}

/** Timesheet approved by client */
export async function emailTimesheetApproved(opts: {
  to: string | string[];
  siteName: string;
  weekStarting: string;
  approvedBy: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Timesheet approved — ${opts.siteName} w/c ${opts.weekStarting}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_INK};">Timesheet approved ✓</h2>
      <p style="margin:0 0 20px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        The timesheet for <strong>${opts.siteName}</strong> (w/c ${opts.weekStarting})
        has been approved by <strong>${opts.approvedBy}</strong>.
      </p>
      <p style="margin:0;color:#7A7974;font-size:14px;">
        This timesheet will now proceed to payroll.
      </p>
      ${ctaButton("View in iValeter", `${APP_URL}/org/attendance`)}
    `),
  });
}

/** Timesheet disputed by client */
export async function emailTimesheetDisputed(opts: {
  to: string | string[];
  siteName: string;
  weekStarting: string;
  disputedBy: string;
  note: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Timesheet disputed — ${opts.siteName} w/c ${opts.weekStarting}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#A13544;">Timesheet disputed</h2>
      <p style="margin:0 0 20px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        The timesheet for <strong>${opts.siteName}</strong> (w/c ${opts.weekStarting})
        has been disputed by <strong>${opts.disputedBy}</strong>.
      </p>
      <div style="background:#FFF0F0;border-left:4px solid #A13544;padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
        <p style="margin:0;font-size:14px;color:${BRAND_INK};line-height:1.6;">
          <strong>Dispute note:</strong><br/>${opts.note}
        </p>
      </div>
      <p style="margin:0;color:#7A7974;font-size:14px;">
        Please review and resolve this dispute as soon as possible.
      </p>
      ${ctaButton("View Dispute", `${APP_URL}/org/attendance`)}
    `),
  });
}

/** Holiday request approved */
export async function emailHolidayApproved(opts: {
  to: string;
  valeterName: string;
  startDate: string;
  endDate: string;
  days: number;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: "Your holiday request has been approved",
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_INK};">Holiday approved ✓</h2>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">Hi ${opts.valeterName},</p>
      <p style="margin:0 0 20px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        Your holiday request has been approved.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;background:${BRAND_CREAM};border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};border-bottom:1px solid #e8e5df;">
            <strong>From:</strong> ${opts.startDate}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};border-bottom:1px solid #e8e5df;">
            <strong>To:</strong> ${opts.endDate}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};">
            <strong>Days:</strong> ${opts.days}
          </td>
        </tr>
      </table>
      ${ctaButton("View in iValeter", `${APP_URL}/valeter`)}
    `),
  });
}

/** Holiday request rejected */
export async function emailHolidayRejected(opts: {
  to: string;
  valeterName: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: "Your holiday request has been declined",
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#A13544;">Holiday request declined</h2>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">Hi ${opts.valeterName},</p>
      <p style="margin:0 0 16px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        Unfortunately your holiday request for <strong>${opts.startDate} – ${opts.endDate}</strong>
        has been declined.
      </p>
      ${opts.reason ? `<div style="background:#FFF0F0;border-left:4px solid #A13544;padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
        <p style="margin:0;font-size:14px;color:${BRAND_INK};">${opts.reason}</p>
      </div>` : ""}
      <p style="margin:0;color:#7A7974;font-size:14px;">
        Please speak to your manager if you have any questions.
      </p>
    `),
  });
}

/** Bank detail change — notify account manager */
export async function emailBankChangeRequest(opts: {
  to: string;
  accountManagerName: string;
  valeterName: string;
  reviewUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Action required: bank detail change request from ${opts.valeterName}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_INK};">Bank detail change request</h2>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">Hi ${opts.accountManagerName},</p>
      <div style="background:#FFF8F0;border-left:4px solid ${BRAND_ORANGE};padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 20px;">
        <p style="margin:0;font-size:15px;color:${BRAND_INK};font-weight:600;">
          ${opts.valeterName} has submitted a bank detail change request.
        </p>
      </div>
      <p style="margin:0 0 16px;color:${BRAND_INK};font-size:14px;line-height:1.6;">
        <strong>You must call ${opts.valeterName} to verbally verify their new bank details
        before approving this request.</strong> Do not approve until you have spoken with them directly.
      </p>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">
        Once verified, log in to iValeter to review and approve the change.
      </p>
      ${ctaButton("Review Request", opts.reviewUrl)}
    `),
  });
}

/** New booking created — notify valeter */
export async function emailNewBookingAssigned(opts: {
  to: string;
  valeterName: string;
  vehicleReg: string;
  siteName: string;
  readyByTime: string;
  jobUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `New job assigned — ${opts.vehicleReg} at ${opts.siteName}`,
    html: wrapHtml(`
      <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND_INK};">New job assigned</h2>
      <p style="margin:0 0 20px;color:#7A7974;font-size:14px;">Hi ${opts.valeterName},</p>
      <p style="margin:0 0 20px;color:${BRAND_INK};font-size:15px;line-height:1.6;">
        A new job has been assigned to you.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;background:${BRAND_CREAM};border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};border-bottom:1px solid #e8e5df;">
            <strong>Vehicle:</strong> ${opts.vehicleReg}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};border-bottom:1px solid #e8e5df;">
            <strong>Site:</strong> ${opts.siteName}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:${BRAND_INK};">
            <strong>Ready by:</strong> ${opts.readyByTime}
          </td>
        </tr>
      </table>
      ${ctaButton("View Job", opts.jobUrl)}
    `),
  });
}
