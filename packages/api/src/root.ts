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
import { auditsRouter } from "./routers/audits";
import { invoicesRouter } from "./routers/invoices";
import { organisationsRouter } from "./routers/organisations";
import { timesheetsRouter } from "./routers/timesheets";
import { reportsRouter } from "./routers/reports";
import { valeterTimesheetsRouter } from "./routers/valeter-timesheets";
import { messagesRouter } from "./routers/messages";
import { overtimeRouter } from "./routers/overtime";
import { overtimeReasonsRouter } from "./routers/overtime-reasons";
import { hqRouter } from "./routers/hq";
import { vehicleSizeRatesRouter } from "./routers/vehicle-size-rates";
import { inactiveUsersRouter } from "./routers/inactive-users";
import { addOnsRouter } from "./routers/add-ons";
import { paintProtectionRouter } from "./routers/paint-protection";
import { valetLibraryRouter } from "./routers/valet-library";
import { supportServicesRouter } from "./routers/supportServices";
import { vehicleSizeConfigRouter } from "./routers/vehicle-size-config";
import { valeterDeductionsRouter } from "./routers/valeter-deductions";
import { bankChangesRouter } from "./routers/bank-changes";
import { dealershipRequestsRouter } from "./routers/dealership-requests";
import { dayRatesRouter } from "./routers/day-rates";
import { expensesRouter } from "./routers/expenses";
import { siteSubmissionsRouter } from "./routers/site-submissions";
import { prospectsRouter } from "./routers/prospects";
import { timesheetDeductionsRouter } from "./routers/timesheet-deductions";
import { equipmentRouter } from "./routers/equipment";
import { inspectionTemplatesRouter } from "./routers/inspection-templates";
import { payrollRouter } from "./routers/payroll";
import { serviceChargesRouter } from "./routers/service-charges";
import { recurringJobsRouter } from "./routers/recurring-jobs";

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
  audits: auditsRouter,
  invoices: invoicesRouter,
  organisations: organisationsRouter,
  timesheets: timesheetsRouter,
  reports: reportsRouter,
  valeterTimesheets: valeterTimesheetsRouter,
  messages: messagesRouter,
  overtime: overtimeRouter,
  overtimeReasons: overtimeReasonsRouter,
  hq: hqRouter,
  vehicleSizeRates: vehicleSizeRatesRouter,
  inactiveUsers: inactiveUsersRouter,
  addOns: addOnsRouter,
  paintProtection: paintProtectionRouter,
  valetLibrary: valetLibraryRouter,
  supportServices: supportServicesRouter,
  vehicleSizeConfig: vehicleSizeConfigRouter,
  valeterDeductions: valeterDeductionsRouter,
  bankChanges: bankChangesRouter,
  dealershipRequests: dealershipRequestsRouter,
  dayRates: dayRatesRouter,
  expenses: expensesRouter,
  siteSubmissions: siteSubmissionsRouter,
  prospects: prospectsRouter,
  timesheetDeductions: timesheetDeductionsRouter,
  equipment: equipmentRouter,
  inspectionTemplates: inspectionTemplatesRouter,
  payroll: payrollRouter,
  serviceCharges: serviceChargesRouter,
  recurringJobs: recurringJobsRouter,
});

export type AppRouter = typeof appRouter;
