import { PrismaClient, Role, BookingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SITE_NAMES = [
  "Arnold Clark Milton Keynes",
  "Lookers Aylesbury",
  "Pentagon Northampton",
];

const DEPARTMENT_NAMES = ["New Car Sales", "Used Car Sales", "Service"];

const SERVICE_TYPES = [
  { name: "Full Valet", durationMins: 90, nominalCode: "4000" },
  { name: "Mini Valet", durationMins: 45, nominalCode: "4000" },
  { name: "Showroom Prep", durationMins: 30, nominalCode: "4010" },
  { name: "Handover Detail", durationMins: 60, nominalCode: "4010" },
  { name: "Paint Protection — Essential (6 months)", durationMins: 60, nominalCode: "4020" },
  { name: "Paint Protection — Standard (1 year)", durationMins: 60, nominalCode: "4020" },
  { name: "Paint Protection — Premium (5 years)", durationMins: 60, nominalCode: "4020" },
  { name: "Paint Protection — Ultimate (10 years)", durationMins: 60, nominalCode: "4020" },
  { name: "Vehicle Photography", durationMins: 30, nominalCode: "4030" },
];

const PLATFORM_CONFIG: Array<{ key: string; value: string; isSecret: boolean }> = [
  { key: "XERO_CLIENT_ID", value: "", isSecret: true },
  { key: "XERO_CLIENT_SECRET", value: "", isSecret: true },
  { key: "XERO_REDIRECT_URI", value: "", isSecret: false },
  { key: "PLATFORM_NAME", value: "iValeter", isSecret: false },
  { key: "SUPPORT_EMAIL", value: "support@ivaleter.co.uk", isSecret: false },
  { key: "DEFAULT_LEAVE_DAYS", value: "28", isSecret: false },
  { key: "FLAG_VEHICLE_INSPECTION", value: "true", isSecret: false },
  { key: "FLAG_PHOTOGRAPHY", value: "true", isSecret: false },
  { key: "FLAG_PAINT_PROTECTION", value: "true", isSecret: false },
  { key: "FLAG_FRESH_SCENT", value: "true", isSecret: false },
  { key: "FLAG_XERO", value: "true", isSecret: false },
];

const VALETER_NAMES: Array<[string, string]> = [
  ["James", "Mitchell"],
  ["Sophie", "Turner"],
  ["Liam", "O'Connor"],
  ["Aisha", "Khan"],
  ["Carlos", "Reyes"],
];

const VEHICLES = [
  { reg: "MK21 ABC", make: "BMW", model: "3 Series", colour: "Black", customer: "John Smith" },
  { reg: "AY70 XYZ", make: "Audi", model: "A4", colour: "White", customer: "Emma Wright" },
  { reg: "NN19 DEF", make: "Mercedes", model: "C-Class", colour: "Silver", customer: "David Lee" },
  { reg: "MK22 GHI", make: "Volkswagen", model: "Golf", colour: "Blue", customer: "Sarah Jones" },
  { reg: "AY21 JKL", make: "Ford", model: "Focus", colour: "Red", customer: "Michael Brown" },
  { reg: "NN20 MNO", make: "Toyota", model: "Corolla", colour: "Grey", customer: "Laura Davis" },
  { reg: "MK19 PQR", make: "Tesla", model: "Model 3", colour: "White", customer: "Chris Evans" },
  { reg: "AY22 STU", make: "Nissan", model: "Qashqai", colour: "Black", customer: "Olivia Wilson" },
  { reg: "NN21 VWX", make: "Land Rover", model: "Discovery", colour: "Green", customer: "Daniel Clark" },
  { reg: "MK20 YZA", make: "Kia", model: "Sportage", colour: "Blue", customer: "Sophie Hall" },
  { reg: "AY19 BCD", make: "Hyundai", model: "Tucson", colour: "Silver", customer: "James Allen" },
  { reg: "NN22 EFG", make: "Mazda", model: "CX-5", colour: "Red", customer: "Grace Young" },
  { reg: "MK21 HIJ", make: "BMW", model: "X5", colour: "Grey", customer: "Thomas King" },
  { reg: "AY20 KLM", make: "Audi", model: "Q3", colour: "White", customer: "Hannah Scott" },
  { reg: "NN19 NOP", make: "Mercedes", model: "GLA", colour: "Black", customer: "Ryan Green" },
  { reg: "MK22 QRS", make: "Volkswagen", model: "Tiguan", colour: "Blue", customer: "Megan Adams" },
  { reg: "AY21 TUV", make: "Ford", model: "Kuga", colour: "Silver", customer: "Joshua Baker" },
  { reg: "NN20 WXY", make: "Toyota", model: "RAV4", colour: "Grey", customer: "Chloe Nelson" },
  { reg: "MK19 ZAB", make: "Peugeot", model: "3008", colour: "Red", customer: "Adam Carter" },
  { reg: "AY22 CDE", make: "Skoda", model: "Octavia", colour: "White", customer: "Lucy Mitchell" },
];

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function main() {
  console.log("Clearing existing data...");
  // Single TRUNCATE CASCADE — wipes all tables regardless of FK order.
  // Far safer than chaining deleteMany() calls which break whenever a new
  // model is added or FK constraints change.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OvertimeRequest", "Message", "AccountManagerMessage",
      "PayRunLine", "TimesheetLine", "Timesheet", "PayRun",
      "ContractorRate", "CustomerInvoiceLineItem", "CustomerInvoice",
      "WeeklyReviewAudit", "WeeklyReview", "AuditChecklistItem", "Audit",
      "Complaint", "VehicleSizeRate", "ClockEvent",
      "JobStatusHistory", "JobPhoto", "Booking",
      "HolidayRequest", "LeaveAllowance", "Invoice",
      "XeroNominalMapping", "XeroConnection",
      "ServiceType", "Department",
      "User", "Dealership", "Site", "Organisation", "PlatformConfig"
    CASCADE
  `);

  console.log("Seeding platform config...");
  for (const cfg of PLATFORM_CONFIG) {
    await prisma.platformConfig.create({ data: cfg });
  }

  const passwordHash = (pw: string) => bcrypt.hashSync(pw, 10);

  console.log("Creating organisation...");
  const org = await prisma.organisation.create({
    data: {
      name: "Total Valeting",
      slug: "totalvaleting",
      plan: "enterprise",
      contactEmail: "hello@totalvaleting.co.uk",
      contactPhone: "01908 000000",
      billingAddress: "1 Valet Way, Milton Keynes, MK1 1AA",
      vatNumber: "GB123456789",
      featureInspection: true,
      featurePhotography: true,
      featureFreshScent: true,
      featurePaintProtection: true,
      featureXero: true,
    },
  });

  console.log("Creating sites, departments, service types...");
  const sites = [];
  for (const siteName of SITE_NAMES) {
    const site = await prisma.site.create({
      data: {
        organisationId: org.id,
        name: siteName,
        address: `${siteName}, UK`,
      },
    });
    const departments = [];
    for (const deptName of DEPARTMENT_NAMES) {
      const dept = await prisma.department.create({
        data: { siteId: site.id, name: deptName },
      });
      for (const st of SERVICE_TYPES) {
        await prisma.serviceType.create({
          data: {
            departmentId: dept.id,
            name: st.name,
            durationMins: st.durationMins,
            nominalCode: st.nominalCode,
          },
        });
      }
      departments.push(dept);
    }
    sites.push({ site, departments });
  }

  console.log("Creating users...");
  const superAdmin = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: "admin@ivaleter.co.uk",
      passwordHash: passwordHash("admin123"),
      firstName: "Platform",
      lastName: "Admin",
      role: Role.super_admin,
      skills: [],
    },
  });

  const orgAdmin = await prisma.user.create({
    data: {
      organisationId: org.id,
      email: "manager@totalvaleting.co.uk",
      passwordHash: passwordHash("test123"),
      firstName: "Olivia",
      lastName: "Manager",
      role: Role.org_admin,
      skills: [],
    },
  });

  const dealershipUsers = [];
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const slug = s.site.name.toLowerCase().split(" ")[0];
    const du = await prisma.user.create({
      data: {
        organisationId: org.id,
        siteId: s.site.id,
        email: `dealer.${slug}@totalvaleting.co.uk`,
        passwordHash: passwordHash("test123"),
        firstName: "Dealer",
        lastName: `Site${i + 1}`,
        role: Role.dealership_user,
        skills: [],
      },
    });
    dealershipUsers.push(du);
  }

  const valeters = [];
  for (let i = 0; i < VALETER_NAMES.length; i++) {
    const [firstName, lastName] = VALETER_NAMES[i]!;
    const site = sites[i % sites.length]!.site;
    const v = await prisma.user.create({
      data: {
        organisationId: org.id,
        siteId: site.id,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@totalvaleting.co.uk`,
        passwordHash: passwordHash("test123"),
        firstName,
        lastName,
        role: Role.valeter,
        skills: i % 2 === 0 ? ["luxury", "paint_correction"] : ["interior"],
      },
    });
    await prisma.leaveAllowance.create({
      data: { userId: v.id, year: new Date().getFullYear(), totalDays: 28, usedDays: i },
    });
    valeters.push(v);
  }

  console.log("Creating bookings...");
  const statuses: BookingStatus[] = [
    BookingStatus.PENDING,
    BookingStatus.PENDING,
    BookingStatus.PENDING,
    BookingStatus.ASSIGNED,
    BookingStatus.ASSIGNED,
    BookingStatus.ASSIGNED,
    BookingStatus.IN_PROGRESS,
    BookingStatus.IN_PROGRESS,
    BookingStatus.IN_PROGRESS,
    BookingStatus.IN_PROGRESS,
    BookingStatus.QC_CHECK,
    BookingStatus.QC_CHECK,
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.COMPLETED,
    BookingStatus.PENDING,
    BookingStatus.ASSIGNED,
    BookingStatus.IN_PROGRESS,
  ];

  for (let i = 0; i < VEHICLES.length; i++) {
    const v = VEHICLES[i]!;
    const status = statuses[i]!;
    const siteEntry = sites[i % sites.length]!;
    const dept = siteEntry.departments[i % siteEntry.departments.length]!;
    const isPhotographyJob = i % 7 === 3;
    const serviceType = isPhotographyJob
      ? await prisma.serviceType.findFirst({
          where: { departmentId: dept.id, name: "Vehicle Photography" },
        })
      : await prisma.serviceType.findFirst({
          where: { departmentId: dept.id, name: { not: "Vehicle Photography" } },
          orderBy: { durationMins: i % 2 === 0 ? "desc" : "asc" },
        });
    const PHOTO_PACKAGES = ["standard", "premium", "full"];
    const photographyPackage = isPhotographyJob
      ? (PHOTO_PACKAGES[i % PHOTO_PACKAGES.length] ?? "standard")
      : null;
    const dealershipUser = dealershipUsers[i % sites.length]!;
    const isPriority = i % 4 === 0; // 5 priority jobs

    const needsValeter =
      status === BookingStatus.ASSIGNED ||
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.QC_CHECK ||
      status === BookingStatus.COMPLETED;

    const eligibleValeters = valeters.filter((val) => val.siteId === siteEntry.site.id);
    const assignedTo = needsValeter
      ? (eligibleValeters[i % Math.max(eligibleValeters.length, 1)] ?? valeters[i % valeters.length]!)
      : null;

    const completedAt = status === BookingStatus.COMPLETED ? hoursFromNow(-1 - (i % 3)) : null;
    const readyByTime =
      status === BookingStatus.COMPLETED ? hoursFromNow(-(i % 3)) : hoursFromNow(1 + (i % 6));

    // Sprinkle add-ons across bookings so the new features are visible on login.
    const includeInspection = i % 4 === 1;
    const inspectionComplete =
      includeInspection &&
      status !== BookingStatus.ASSIGNED &&
      status !== BookingStatus.PENDING;
    const includeFreshScent = i % 3 === 0;
    const PAINT_TIERS = ["essential", "standard", "premium", "ultimate"];
    const paintProtectionTier =
      i % 5 === 2
        ? (PAINT_TIERS[Math.floor(i / 5) % PAINT_TIERS.length] ?? "premium")
        : null;

    const booking = await prisma.booking.create({
      data: {
        organisationId: org.id,
        siteId: siteEntry.site.id,
        departmentId: dept.id,
        serviceTypeId: serviceType!.id,
        vehicleReg: v.reg,
        vehicleMake: v.make,
        vehicleModel: v.model,
        vehicleColour: v.colour,
        customerName: v.customer,
        status,
        isPriority,
        readyByTime,
        includeInspection,
        inspectionComplete,
        includeFreshScent,
        paintProtectionTier,
        photographyPackage,
        freshScentConfirmed:
          includeFreshScent && status === BookingStatus.COMPLETED,
        paintProtectionApplied:
          paintProtectionTier != null && status === BookingStatus.COMPLETED,
        assignedToId: assignedTo?.id ?? null,
        createdById: dealershipUser.id,
        completedAt,
        createdAt: hoursFromNow(-4 - (i % 8)),
      },
    });

    // status history trail
    const trail: BookingStatus[] = [];
    if (needsValeter) trail.push(BookingStatus.ASSIGNED);
    if (
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.QC_CHECK ||
      status === BookingStatus.COMPLETED
    )
      trail.push(BookingStatus.IN_PROGRESS);
    if (status === BookingStatus.QC_CHECK || status === BookingStatus.COMPLETED)
      trail.push(BookingStatus.QC_CHECK);
    if (status === BookingStatus.COMPLETED) trail.push(BookingStatus.COMPLETED);

    let prev: BookingStatus = BookingStatus.PENDING;
    for (const to of trail) {
      await prisma.jobStatusHistory.create({
        data: {
          bookingId: booking.id,
          userId: assignedTo?.id ?? dealershipUser.id,
          fromStatus: prev,
          toStatus: to,
        },
      });
      prev = to;
    }
  }

  // ── Historical completed bookings + clock events for Valet Timings report ──
  console.log("Creating historical bookings and clock events...");

  // Service types to rotate through for realistic variety
  const historicalServiceTypeNames = ["Full Valet", "Mini Valet", "Showroom Prep", "Handover Detail"];
  const vehicleSizes = ["SMALL", "MEDIUM", "LARGE", "XL", "VAN"] as const;

  // 40 completed bookings spread over last 30 days across all sites
  for (let i = 0; i < 40; i++) {
    const daysAgo = 1 + (i % 28); // days 1–28 ago
    const siteEntry = sites[i % sites.length]!;
    const dept = siteEntry.departments[i % siteEntry.departments.length]!;
    const valeterForSite = valeters.find((v) => v.siteId === siteEntry.site.id)
      ?? valeters[i % valeters.length]!;
    const dealershipUser = dealershipUsers[i % dealershipUsers.length]!;

    const stName = historicalServiceTypeNames[i % historicalServiceTypeNames.length]!;
    const serviceType = await prisma.serviceType.findFirst({
      where: { departmentId: dept.id, name: stName },
    });
    if (!serviceType) continue;

    // Booking time: completed between 9am–4pm on day daysAgo
    const completedDate = new Date();
    completedDate.setDate(completedDate.getDate() - daysAgo);
    completedDate.setHours(9 + (i % 7), (i * 13) % 60, 0, 0);
    const readyByTime = new Date(completedDate.getTime() + 30 * 60 * 1000);
    const createdAt = new Date(completedDate.getTime() - 2 * 60 * 60 * 1000);

    const vehicleSize = vehicleSizes[i % vehicleSizes.length]!;

    const historicalBooking = await prisma.booking.create({
      data: {
        organisationId: org.id,
        siteId: siteEntry.site.id,
        departmentId: dept.id,
        serviceTypeId: serviceType.id,
        vehicleReg: `HX${daysAgo}${i} TST`,
        vehicleMake: "Ford",
        vehicleModel: "Focus",
        vehicleColour: "White",
        customerName: `Test Customer ${i + 1}`,
        status: BookingStatus.COMPLETED,
        isPriority: false,
        readyByTime,
        assignedToId: valeterForSite.id,
        createdById: dealershipUser.id,
        completedAt: completedDate,
        vehicleSize,
        createdAt,
      },
    });

    // Add status history
    for (const [from, to] of [
      [BookingStatus.PENDING, BookingStatus.ASSIGNED],
      [BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS],
      [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED],
    ] as const) {
      await prisma.jobStatusHistory.create({
        data: {
          bookingId: historicalBooking.id,
          userId: valeterForSite.id,
          fromStatus: from,
          toStatus: to,
        },
      });
    }

    // Clock events: CLOCK_IN at start of shift, CLOCK_OUT at end
    // Shift covers the full day (8am–5pm) — duration slightly varied per day
    const shiftStart = new Date(completedDate);
    shiftStart.setHours(8, (i * 7) % 20, 0, 0); // 8:00–8:19 clock-in
    const shiftDurationMins = 420 + (i % 60); // 7h–8h, varied
    const shiftEnd = new Date(shiftStart.getTime() + shiftDurationMins * 60 * 1000);

    await prisma.clockEvent.create({
      data: {
        userId: valeterForSite.id,
        siteId: siteEntry.site.id,
        type: "CLOCK_IN",
        timestamp: shiftStart,
        createdAt: shiftStart,
      },
    });
    await prisma.clockEvent.create({
      data: {
        userId: valeterForSite.id,
        siteId: siteEntry.site.id,
        type: "CLOCK_OUT",
        timestamp: shiftEnd,
        createdAt: shiftEnd,
      },
    });
  }

  console.log("Creating holiday requests...");
  await prisma.holidayRequest.create({
    data: {
      userId: valeters[0]!.id,
      startDate: hoursFromNow(24 * 14),
      endDate: hoursFromNow(24 * 21),
      reason: "Family holiday",
    },
  });
  await prisma.holidayRequest.create({
    data: {
      userId: valeters[1]!.id,
      startDate: hoursFromNow(24 * 30),
      endDate: hoursFromNow(24 * 32),
      reason: "Wedding",
      status: "APPROVED",
      adminNote: "Approved — enjoy!",
    },
  });

  console.log("Creating invoices...");
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i]!;
    const lineItems = [
      { description: "Full Valet x12", quantity: 12, unitAmount: 45, nominalCode: "4000" },
      { description: "Mini Valet x8", quantity: 8, unitAmount: 25, nominalCode: "4000" },
      { description: "Paint Protection x3", quantity: 3, unitAmount: 120, nominalCode: "4020" },
    ];
    const totalAmount = lineItems.reduce(
      (acc, li) => acc + li.quantity * li.unitAmount,
      0,
    );
    await prisma.invoice.create({
      data: {
        organisationId: org.id,
        siteId: s.site.id,
        periodStart,
        periodEnd,
        status: i === 0 ? "SENT" : "DRAFT",
        lineItems,
        totalAmount,
        issuedAt: i === 0 ? periodEnd : null,
      },
    });
  }

  console.log("\nSeed complete.");
  console.log("Login credentials:");
  console.log(`  super_admin:      admin@ivaleter.co.uk / admin123`);
  console.log(`  org_admin:        manager@totalvaleting.co.uk / test123`);
  console.log(`  dealership_user:  ${dealershipUsers[0]!.email} / test123`);
  console.log(`  valeter:          ${valeters[0]!.email} / test123`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
