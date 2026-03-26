import prisma from "../prismaInit.js";
import { Router } from "express";
const router = Router();

//✅ Переписано під нову БД
router.get("/muscleByGroup", async (req, res) => {
  try {
    const items = await prisma.muscleGroup.findMany({
      include: {
        translations: true,
        muscles: { include: { muscle: { include: { translations: true } } } },
      },
    });
    console.dir(items, { depth: null });

    const result = items.map((g) => ({
      id: g.id,
      description: g.description,
      translations: (g.translations || []).map((t) => ({
        lang: t.lang,
        name: t.name,
      })),
      muscles: (g.muscles || []).map((m) => ({
        id: m.muscleId,
        muscleName: m.muscle.description,
        translations: (m.muscle.translations || []).map((t) => ({
          lang: t.lang,
          name: t.name,
        })),
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
