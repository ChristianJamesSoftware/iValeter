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
  { name: "Full Valet", durationMins: 90 },
  { name: "Mini Valet", durationMins: 45 },
  { name: "Showroom Prep", durationMins: 30 },
  { name: "Handover Detail", durationMins: 60 },
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
  await prisma.jobStatusHistory.deleteMany();
  await prisma.jobPhoto.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.holidayRequest.deleteMany();
  await prisma.leaveAllowance.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.site.deleteMany();
  await prisma.organisation.deleteMany();

  const passwordHash = (pw: string) => bcrypt.hashSync(pw, 10);

  console.log("Creating organisation...");
  const org = await prisma.organisation.create({
    data: { name: "Total Valeting", slug: "totalvaleting", plan: "enterprise" },
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
    const serviceType = await prisma.serviceType.findFirst({
      where: { departmentId: dept.id },
      orderBy: { durationMins: i % 2 === 0 ? "desc" : "asc" },
    });
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
