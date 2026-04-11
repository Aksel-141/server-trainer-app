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
    // console.dir(items, { depth: null });

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

//✅ Переписано під нову БД
// Отримати всі м'язи без групування
router.get("/muscles", async (req, res) => {
  try {
    const muscles = await prisma.muscle.findMany({
      include: { translations: true },
    });
    console.dir(muscles, { depth: null });
    res.json({ ok: true, result: muscles || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Отримати всі категорії програм тренувань
router.get("/routineCategories", async (req, res) => {
  try {
    // Отримуємо мову запиту (наприклад з query: /routineCategories?lang=ua)
    // За замовчуванням ставимо  'uk'
    const lang = req.query.lang || "uk";

    const categories = await prisma.routineCategory.findMany({
      include: {
        translations: {
          where: {
            lang: lang,
          },
          // Підтягуємо лише необхідні поля перекладу
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    // Форматуємо дані (робимо їх пласкими для фронтенду) і сортуємо
    const formattedCategories = categories
      .map((cat) => {
        // Беремо перший знайдений переклад (якщо він є)
        const translation = cat.translations[0];

        return {
          id: cat.id,
          icon: cat.icon,
          color: cat.color,
          name: translation?.name || "Без назви", // Дефолтне значення, якщо перекладу немає
          description: translation?.description || null,
        };
      })
      // Сортуємо масив за алфавітом за полем name вже після вибірки
      .sort((a, b) => a.name.localeCompare(b.name, "uk-UA"));

    res.json({ ok: true, result: formattedCategories });
  } catch (error) {
    console.error("Get routineCategories error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// module.exports = router;
export default router;
