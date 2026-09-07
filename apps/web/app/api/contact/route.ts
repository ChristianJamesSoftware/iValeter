/**
 * Demo / Contact form submission
 *
 * Receives a POST from the public /home page form and emails
 * the enquiry to info@totalvaleting.co.uk via Microsoft 365 SMTP.
 *
 * The recipient address is NEVER exposed to the browser — it lives
 * only in the server-side environment variable CONTACT_EMAIL_TO.
 *
 * Required env vars (set in Railway):
 *   SMTP_HOST          smtp.office365.com
 *   SMTP_PORT          587
 *   SMTP_USER          The M365 mailbox that sends (e.g. noreply@totalvaleting.co.uk)
 *   SMTP_PASS          That mailbox's password (or app password)
 *   CONTACT_EMAIL_TO   info@totalvaleting.co.uk  (hidden recipient)
 */

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface DemoFormBody {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as DemoFormBody;
    const { name, company, email, phone } = body;

    // Basic validation
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 },
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const smtpHost = process.env.SMTP_HOST ?? "smtp.office365.com";
    const smtpPort = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const smtpUser = process.env.SMTP_USER ?? "";
    const smtpPass = process.env.SMTP_PASS ?? "";
    const recipientEmail = process.env.CONTACT_EMAIL_TO ?? "";

    // Fail loudly if not configured — don't silently drop enquiries
    if (!smtpUser || !smtpPass || !recipientEmail) {
      console.error("[contact] SMTP not configured — missing env vars");
      return NextResponse.json(
        { error: "Email service not configured. Please contact us directly." },
        { status: 500 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // STARTTLS on port 587
      auth: {
        type: "login",
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const submittedAt = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "full",
      timeStyle: "short",
    });

    await transporter.sendMail({
      from: `"iValeter Website" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email.trim(),
      subject: `New Demo Request — ${name.trim()}${company?.trim() ? ` (${company.trim()})` : ""}`,
      text: [
        "New demo request from ivaleter.co.uk",
        "",
        `Name:     ${name.trim()}`,
        `Company:  ${company?.trim() || "Not provided"}`,
        `Email:    ${email.trim()}`,
        `Phone:    ${phone?.trim() || "Not provided"}`,
        "",
        `Submitted: ${submittedAt}`,
        "",
        "Reply directly to this email to respond to the enquiry.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; color: #1C1A16;">
          <div style="background: #E8650A; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: white; font-size: 18px;">New Demo Request</h2>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">From ivaleter.co.uk</p>
          </div>
          <div style="background: #F5F0E8; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #D4D1CA; border-top: none;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #7A7974; width: 100px;">Name</td>
                <td style="padding: 8px 0; font-weight: 600;">${name.trim()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7A7974;">Company</td>
                <td style="padding: 8px 0;">${company?.trim() || "<em style='color:#BAB9B4'>Not provided</em>"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7A7974;">Email</td>
                <td style="padding: 8px 0;"><a href="mailto:${email.trim()}" style="color: #E8650A;">${email.trim()}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7A7974;">Phone</td>
                <td style="padding: 8px 0;">${phone?.trim() || "<em style='color:#BAB9B4'>Not provided</em>"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #7A7974;">Submitted</td>
                <td style="padding: 8px 0; font-size: 12px; color: #7A7974;">${submittedAt}</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #D4D1CA;">
              <a href="mailto:${email.trim()}" style="display: inline-block; background: #E8650A; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">Reply to ${name.trim()}</a>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`[contact] Demo request from ${email.trim()} sent to ${recipientEmail}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[contact] Email send failed:", err);
    return NextResponse.json(
      { error: "Failed to send — please try again." },
      { status: 500 },
    );
  }
}
