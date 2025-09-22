const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const muscles = [
    "Груди",
    "Широчайні",
    "Трапеція",
    "Ромбоподібні",
    "Передні дельти",
    "Середні дельти",
    "Задні дельти",
    "Біцепс",
    "Трицепс",
    "Передпліччя",
    "Ягодиці",
    "Квадрицепс",
    "Біцепс стегна",
    "Привідні м’язи стегна",
    "Відвідні м’язи стегна",
    "Ікри",
    "Прямі м’язи живота",
    "Косі м’язи живота",
    "Поперечний м’яз живота",
    "Еректори спини",
  ];

  for (const name of muscles) {
    await prisma.muscle.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Muscles seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
