import { router } from "./trpc";
import { authRouter } from "./routers/auth";
import { bookingsRouter } from "./routers/bookings";
import { usersRouter } from "./routers/users";
import { sitesRouter } from "./routers/sites";
import { holidayRouter } from "./routers/holiday";
import { analyticsRouter } from "./routers/analytics";

export const appRouter = router({
  auth: authRouter,
  bookings: bookingsRouter,
  users: usersRouter,
  sites: sitesRouter,
  holiday: holidayRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
