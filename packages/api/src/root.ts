import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { bookingsRouter } from "./routers/bookings";
import { usersRouter } from "./routers/users";
import { sitesRouter } from "./routers/sites";
import { dealershipsRouter } from "./routers/dealerships";
import { holidayRouter } from "./routers/holiday";
import { analyticsRouter } from "./routers/analytics";
import { platformRouter } from "./routers/platform";
import { orgSettingsRouter } from "./routers/org-settings";
import { xeroRouter } from "./routers/xero";
import { invoicesRouter } from "./routers/invoices";
import { organisationsRouter } from "./routers/organisations";
import { timesheetsRouter } from "./routers/timesheets";
import { reportsRouter } from "./routers/reports";
import { valeterTimesheetsRouter } from "./routers/valeter-timesheets";
import { messagesRouter } from "./routers/messages";
import { overtimeRouter } from "./routers/overtime";
import { hqRouter } from "./routers/hq";

export const appRouter = router({
  auth: authRouter,
  bookings: bookingsRouter,
  users: usersRouter,
  sites: sitesRouter,
  dealerships: dealershipsRouter,
  holiday: holidayRouter,
  analytics: analyticsRouter,
  platform: platformRouter,
  orgSettings: orgSettingsRouter,
  xero: xeroRouter,
  invoices: invoicesRouter,
  organisations: organisationsRouter,
  timesheets: timesheetsRouter,
  reports: reportsRouter,
  valeterTimesheets: valeterTimesheetsRouter,
  messages: messagesRouter,
  overtime: overtimeRouter,
  hq: hqRouter,
});

export type AppRouter = typeof appRouter;
