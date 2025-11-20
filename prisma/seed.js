const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const muscleData = require("../muscle-seed-data.json");
const muscleGroupData = require("../muscle-group-seed-data.json");

async function main() {
  console.log("Seeding muscles...");

  for (const muscle of muscleData) {
    await prisma.muscle.upsert({
      where: { nameEn: muscle.nameEn },
      update: {
        nameUa: muscle.nameUa,
        description: muscle.description,
      },
      create: {
        nameEn: muscle.nameEn,
        nameUa: muscle.nameUa,
        description: muscle.description,
      },
    });
    console.log(`✓ ${muscle.nameEn} (${muscle.nameUa})`);
  }

  console.log(`\n✅ Seeded ${muscleData.length} muscles successfully!`);

  console.log("\nSeeding muscle groups...");

  for (const group of muscleGroupData) {
    const muscleGroup = await prisma.muscleGroup.upsert({
      where: { nameEn: group.nameEn },
      update: {
        nameUa: group.nameUa,
        description: group.description,
      },
      create: {
        nameEn: group.nameEn,
        nameUa: group.nameUa,
        description: group.description,
      },
    });

    // Зв'язати м'язи з групою
    for (const muscleName of group.muscles) {
      const muscle = await prisma.muscle.findUnique({
        where: { nameEn: muscleName },
      });

      if (muscle) {
        await prisma.muscleToGroup.upsert({
          where: {
            muscleId_groupId: {
              muscleId: muscle.id,
              groupId: muscleGroup.id,
            },
          },
          update: {},
          create: {
            muscleId: muscle.id,
            groupId: muscleGroup.id,
          },
        });
      }
    }

    console.log(
      `✓ ${group.nameEn} (${group.nameUa}) - ${group.muscles.length} muscles`
    );
  }

  console.log(
    `\n✅ Seeded ${muscleGroupData.length} muscle groups successfully!`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
