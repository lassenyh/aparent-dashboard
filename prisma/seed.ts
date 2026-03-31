import {
  PrismaClient,
  DietaryPreference,
  RateType,
  ProjectStatus,
  CallSheetStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.callSheetCrew.deleteMany();
  await prisma.callSheet.deleteMany();
  await prisma.projectCrewListMember.deleteMany();
  await prisma.projectCrewList.deleteMany();
  await prisma.projectCrew.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.person.deleteMany();

  const p1 = await prisma.person.create({
    data: {
      firstName: "Ingrid",
      lastName: "Haugen",
      fullName: "Ingrid Haugen",
      email: "ingrid@example.com",
      phone: "+47 900 11 222",
      addressLine: "Eksempelgata 1",
      postalCode: "0162",
      city: "Oslo",
      country: "Norge",
      roles: ["1st AD", "Producer"],
      defaultRate: 8500,
      rateType: RateType.day,
      dietaryPreference: DietaryPreference.vegetarian,
      allergies: "Nøtter",
      isActive: true,
      lastUsedAt: new Date(),
    },
  });

  const p2 = await prisma.person.create({
    data: {
      firstName: "Erik",
      lastName: "Solberg",
      fullName: "Erik Solberg",
      email: "erik.solberg@example.com",
      phone: "+47 901 22 333",
      addressLine: "Bryggen 2",
      postalCode: "5003",
      city: "Bergen",
      country: "Norge",
      roles: ["DOP", "Camera operator"],
      defaultRate: 9500,
      rateType: RateType.day,
      dietaryPreference: DietaryPreference.none,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });

  const p3 = await prisma.person.create({
    data: {
      firstName: "Maja",
      lastName: "Nilsen",
      fullName: "Maja Nilsen",
      email: "maja@example.com",
      phone: "+47 902 33 444",
      addressLine: "Lysaker 3",
      postalCode: "0283",
      city: "Oslo",
      country: "Norge",
      roles: ["Gaffer", "Electrician"],
      defaultRate: 7200,
      rateType: RateType.day,
      dietaryPreference: DietaryPreference.vegan,
      allergies: null,
      isActive: true,
    },
  });

  const p4 = await prisma.person.create({
    data: {
      firstName: "Jonas",
      lastName: "Lie",
      fullName: "Jonas Lie",
      email: "jonas@example.com",
      phone: "+47 903 44 555",
      addressLine: "Munkegata 4",
      postalCode: "7011",
      city: "Trondheim",
      country: "Norge",
      roles: ["Sound mixer", "Boom op"],
      defaultRate: 650,
      rateType: RateType.hour,
      dietaryPreference: DietaryPreference.none,
      allergies: "Laktose (lett)",
      isActive: true,
    },
  });

  await prisma.person.create({
    data: {
      firstName: "Silje",
      lastName: "Aune",
      fullName: "Silje Aune",
      email: "silje@example.com",
      phone: "+47 904 55 666",
      addressLine: "Storgata 5",
      postalCode: "0161",
      city: "Oslo",
      country: "Norge",
      roles: ["Stylist", "Costume"],
      defaultRate: 7800,
      rateType: RateType.day,
      dietaryPreference: DietaryPreference.vegetarian,
      isActive: false,
    },
  });

  const agency = await prisma.agency.create({
    data: {
      name: "Aparent",
      orgNumber: "923 456 789",
      logoUrl: null,
    },
  });

  const customerRema = await prisma.customer.create({
    data: { name: "Rema 1000", logoUrl: null },
  });

  const customerTelenor = await prisma.customer.create({
    data: { name: "Telenor", logoUrl: null },
  });

  const projA = await prisma.project.create({
    data: {
      name: "Rema — vårkampanje 2026",
      agencyId: agency.id,
      customerId: customerRema.id,
      internalTitle: "RM26-SPRING",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-04-15"),
      status: ProjectStatus.active,
      notes: "Hovedinnspilling Oslo-området.",
    },
  });

  const projB = await prisma.project.create({
    data: {
      name: "Telenor — bedrift",
      agencyId: agency.id,
      customerId: customerTelenor.id,
      internalTitle: "TEL-B2B-Q1",
      startDate: new Date("2026-01-10"),
      endDate: new Date("2026-02-28"),
      status: ProjectStatus.archived,
    },
  });

  await prisma.projectCrewList.create({
    data: { projectId: projB.id },
  });

  await prisma.projectCrew.create({
    data: {
      projectId: projA.id,
      personId: p1.id,
      roleOverride: "1st AD",
      sortOrder: 1,
    },
  });

  await prisma.projectCrew.create({
    data: {
      projectId: projA.id,
      personId: p2.id,
      rateOverride: 10000,
      sortOrder: 2,
    },
  });

  await prisma.projectCrew.create({
    data: {
      projectId: projA.id,
      personId: p3.id,
      sortOrder: 3,
    },
  });

  await prisma.projectCrew.create({
    data: {
      projectId: projA.id,
      personId: p4.id,
      sortOrder: 4,
    },
  });

  const projACrew = await prisma.projectCrew.findMany({
    where: { projectId: projA.id },
    orderBy: { sortOrder: "asc" },
  });
  const clA = await prisma.projectCrewList.create({
    data: { projectId: projA.id },
  });
  await prisma.projectCrewListMember.createMany({
    data: projACrew.map((pc, i) => ({
      projectCrewListId: clA.id,
      projectCrewId: pc.id,
      sortOrder: i,
    })),
  });

  const sheet = await prisma.callSheet.create({
    data: {
      projectId: projA.id,
      name: "Dag 3 — Studio",
      date: new Date("2026-03-18"),
      location: "Filmparken Studio A, Oslo",
      generalCallTime: "07:00",
      notes: "Parkering bak bygget. Kaffe 06:45.",
      status: CallSheetStatus.draft,
    },
  });

  await prisma.callSheetCrew.create({
    data: {
      callSheetId: sheet.id,
      personId: p1.id,
      fullNameSnapshot: p1.fullName,
      roleSnapshot: "1st AD",
      phoneSnapshot: p1.phone,
      emailSnapshot: p1.email,
      dietaryPreferenceSnapshot: p1.dietaryPreference,
      allergiesSnapshot: p1.allergies,
      rateSnapshot: p1.defaultRate,
      rateTypeSnapshot: p1.rateType,
      callTime: "07:00",
      sortOrder: 0,
    },
  });

  await prisma.callSheetCrew.create({
    data: {
      callSheetId: sheet.id,
      personId: p2.id,
      fullNameSnapshot: p2.fullName,
      roleSnapshot: "DOP",
      phoneSnapshot: p2.phone,
      emailSnapshot: p2.email,
      dietaryPreferenceSnapshot: p2.dietaryPreference,
      allergiesSnapshot: p2.allergies,
      rateSnapshot: 10000,
      rateTypeSnapshot: p2.rateType,
      callTime: "07:30",
      sortOrder: 1,
    },
  });

  await prisma.callSheetCrew.create({
    data: {
      callSheetId: sheet.id,
      personId: p3.id,
      fullNameSnapshot: p3.fullName,
      roleSnapshot: "Gaffer",
      phoneSnapshot: p3.phone,
      emailSnapshot: p3.email,
      dietaryPreferenceSnapshot: p3.dietaryPreference,
      allergiesSnapshot: p3.allergies,
      rateSnapshot: p3.defaultRate,
      rateTypeSnapshot: p3.rateType,
      sortOrder: 2,
    },
  });

  await prisma.callSheetCrew.create({
    data: {
      callSheetId: sheet.id,
      personId: p4.id,
      fullNameSnapshot: p4.fullName,
      roleSnapshot: "Sound mixer",
      phoneSnapshot: p4.phone,
      emailSnapshot: p4.email,
      dietaryPreferenceSnapshot: p4.dietaryPreference,
      allergiesSnapshot: p4.allergies,
      rateSnapshot: p4.defaultRate,
      rateTypeSnapshot: p4.rateType,
      pickupInfo: "Hent ved hotel lobby 06:45",
      sortOrder: 3,
    },
  });

  await prisma.person.updateMany({
    where: { id: { in: [p1.id, p2.id, p3.id, p4.id] } },
    data: { lastUsedAt: new Date() },
  });

  console.log("Seed OK");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
