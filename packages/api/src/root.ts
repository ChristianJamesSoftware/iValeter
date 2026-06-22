import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { bookingsRouter } from "./routers/bookings";
import { usersRouter } from "./routers/users";
import { sitesRouter } from "./routers/sites";
import { holidayRouter } from "./routers/holiday";
import { analyticsRouter } from "./routers/analytics";
import { platformRouter } from "./routers/platform";
import { orgSettingsRouter } from "./routers/org-settings";
import { xeroRouter } from "./routers/xero";
import { invoicesRouter } from "./routers/invoices";
import { organisationsRouter } from "./routers/organisations";
import { timesheetsRouter } from "./routers/timesheets";
import { payRunsRouter } from "./routers/payRuns";
import { customerInvoicesRouter } from "./routers/customerInvoices";

export const appRouter = router({
  auth: authRouter,
  bookings: bookingsRouter,
  users: usersRouter,
  sites: sitesRouter,
  holiday: holidayRouter,
  analytics: analyticsRouter,
  platform: platformRouter,
  orgSettings: orgSettingsRouter,
  xero: xeroRouter,
  invoices: invoicesRouter,
  organisations: organisationsRouter,
  // Phase 2 — Payroll & Customer Invoicing
  timesheets: timesheetsRouter,
  payRuns: payRunsRouter,
  customerInvoices: customerInvoicesRouter,
});

export type AppRouter = typeof appRouter;
