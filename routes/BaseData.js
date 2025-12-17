import prisma from "../prismaInit.js";
import { Router } from "express";
const router = Router();

router.get("/muscleByGroup", async (req, res) => {
  try {
    const items = await prisma.muscleGroup.findMany({
      include: {
        muscles: {
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
      muscles: (g.muscles || []).map((mt) => ({
        id: mt.muscle.id,
        nameEn: mt.muscle.nameEn,
        nameUa: mt.muscle.nameUa,
        description: mt.muscle.description,
      })),
    }));

    res.json({ ok: true, result: result || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Отримати всі м'язи без групування
router.get("/muscles", async (req, res) => {
  try {
    const muscles = await prisma.muscle.findMany({
      orderBy: { nameUa: "asc" },
    });

    res.json({ ok: true, result: muscles || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Отримати всі категорії програм тренувань
router.get("/routineCategories", async (req, res) => {
  try {
    const categories = await prisma.routineCategory.findMany({
      orderBy: { nameUa: "asc" },
    });

    res.json({ ok: true, result: categories || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// module.exports = router;
export default router;
