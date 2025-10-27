const prisma = require("../prismaInit");
const router = require("express").Router();

router.get("/muscleByGroup", async (req, res) => {
  try {
    const items = await prisma.muscleListGroup.findMany({
      include: {
        muscleToGroup: {
          include: {
            muscle: true,
          },
        },
      },
      orderBy: { nameUa: "asc" },
    });
    const result = items.map((g) => ({
      id: g.id,
      nameEn: g.nameEn,
      nameUa: g.nameUa,
      description: g.description,
      muscles: (g.muscleToGroup || []).map((mt) => ({
        id: mt.muscle.id,
        nameEn: mt.muscle.nameEn,
        nameUa: mt.muscle.nameUa,
        description: mt.muscle.description,
      })),
    }));

    res.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

module.exports = router;
