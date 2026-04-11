import prisma from "../prismaInit.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadMedia } from "../uploadMedia.js";
import { Router } from "express";

// Допоміжні константи для роботи зі шляхами в ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

//✅ Переписано під нову БД
// Отримати всі вправи
router.get("/all", async (req, res) => {
  try {
    // Додаємо підтримку вибору мови (за замовчуванням 'uk')
    const lang = req.query.lang || "uk";

    const items = await prisma.exercise.findMany({
      include: {
        // ВИДАЛЕНО: translations для самої вправи (такої таблиці в схемі немає)
        muscles: {
          include: {
            muscle: {
              include: {
                // Підтягуємо переклади м'язів для обраної мови (тут таблиця перекладів Є)
                translations: {
                  where: { lang: lang },
                  select: { name: true },
                },
              },
            },
          },
        },
        // Запитуємо всі медіафайли вправи
        media: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    const result = items.map((e) => {
      // Розподіляємо медіафайли на зображення та відео
      const images = e.media.filter((m) => m.type === "image");
      const videos = e.media.filter((m) => m.type === "video");

      // Перевіряємо, чи є локалізація у полі metadata (якщо воно використовується як JSON-словник)
      const meta =
        typeof e.metadata === "object" && e.metadata !== null ? e.metadata : {};

      // Намагаємось дістати український переклад з metadata, якщо його немає - беремо базове поле
      const localizedTitle = meta[`title_${lang}`] || meta.title_uk || e.title;
      const localizedDescription =
        meta[`description_${lang}`] || meta.description_uk || e.description;

      return {
        id: e.id,
        slug: e.slug,

        title: localizedTitle,
        description: localizedDescription,

        type: e.type,

        // Віддаємо масив шляхів для зображень
        images: images.map((img) => img.path),

        // Віддаємо шлях першого відео, якщо воно є
        video: videos.length > 0 ? videos[0].path : null,

        // Дістаємо назву м'яза з масиву перекладів
        muscles: e.muscles.map(
          (em) => em.muscle.translations?.[0]?.name || "Без назви",
        ),

        createdAt: e.createdAt,
      };
    });

    res.json({ ok: true, result });
  } catch (error) {
    console.error("Get all exercises error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Експорт вправ
router.get("/export", async (req, res) => {
  try {
    const items = await prisma.exercise.findMany({
      include: {
        muscles: {
          include: {
            muscle: true,
          },
        },
        images: {
          orderBy: {
            order: "asc",
          },
        },
        videos: true,
      },
    });

    const exportData = items.map((e) => ({
      title: e.title,
      description: e.description || "",
      muscles: e.muscles.map((em) => em.muscle.nameEn),
      images: e.images.map((img) => ({
        path: img.path,
        order: img.order,
      })),
      video: e.videos.length > 0 ? e.videos[0].path : null,
      createdAt: e.createdAt,
    }));

    res.json({
      ok: true,
      version: "1.0",
      exportDate: new Date().toISOString(),
      count: exportData.length,
      exercises: exportData,
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({
      ok: false,
      error: "Помилка при експорті вправ",
    });
  }
});

// Імпорт вправ
router.post("/import", async (req, res) => {
  try {
    const { exercises } = req.body;

    if (!Array.isArray(exercises)) {
      return res.status(400).json({
        ok: false,
        error: "Невірний формат даних",
      });
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    for (const exerciseData of exercises) {
      try {
        // Перевірка обов'язкових полів з безпечними значеннями за замовчуванням
        const title = exerciseData.title?.trim();
        if (!title) {
          results.skipped++;
          results.details.push({
            title: "Без назви",
            status: "skipped",
            reason: "Відсутня назва вправи",
          });
          continue;
        }

        // Перевірка чи вправа вже існує
        const existing = await prisma.exercise.findUnique({
          where: { title: title },
        });

        if (existing) {
          results.skipped++;
          results.details.push({
            title: title,
            status: "skipped",
            reason: "Вправа з такою назвою вже існує",
          });
          continue;
        }

        // Безпечна обробка м'язів
        const muscles = Array.isArray(exerciseData.muscles)
          ? exerciseData.muscles.filter(
              (m) => typeof m === "string" && m.trim(),
            )
          : [];

        // Перевірка чи всі м'язи існують в БД
        const validMuscles = [];
        for (const muscleName of muscles) {
          const muscle = await prisma.muscle.findUnique({
            where: { nameEn: muscleName },
          });
          if (muscle) {
            validMuscles.push(muscleName);
          }
        }

        // Створення вправи
        const exercise = await prisma.exercise.create({
          data: {
            title: title,
            description: exerciseData.description?.trim() || "",
            muscles: {
              create: validMuscles.map((muscleName) => ({
                muscle: {
                  connect: { nameEn: muscleName },
                },
              })),
            },
          },
        });

        // Безпечна обробка зображень (без файлів, тільки посилання)
        if (Array.isArray(exerciseData.images)) {
          for (let i = 0; i < exerciseData.images.length; i++) {
            const img = exerciseData.images[i];
            if (img && typeof img.path === "string" && img.path.trim()) {
              await prisma.exerciseImage.create({
                data: {
                  exerciseId: exercise.id,
                  path: img.path,
                  order: typeof img.order === "number" ? img.order : i,
                },
              });
            }
          }
        }

        // Безпечна обробка відео
        if (
          exerciseData.video &&
          typeof exerciseData.video === "string" &&
          exerciseData.video.trim()
        ) {
          await prisma.exerciseVideo.create({
            data: {
              exerciseId: exercise.id,
              path: exerciseData.video,
            },
          });
        }

        results.success++;
        results.details.push({
          title: title,
          status: "success",
          reason: "Успішно імпортовано",
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          title: exerciseData.title || "Невідома вправа",
          status: "error",
          reason: error.message,
        });
      }
    }

    res.json({
      ok: true,
      results: results,
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({
      ok: false,
      error: "Помилка при імпорті вправ",
    });
  }
});

//✅ Переписано під нову БД
// Отримати вправу за ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || "uk";

    const item = await prisma.exercise.findUnique({
      where: { id: Number(id) },
      include: {
        muscles: {
          include: {
            muscle: {
              include: {
                // Тут ми завантажуємо ВСІ переклади, адже фронтенд очікує і uk, і en у musclesInfo
                translations: true,
              },
            },
          },
        },
        media: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        ok: false,
        error: "Такого запису не знайдено",
      });
    }

    const images = item.media.filter((m) => m.type === "image");
    const videos = item.media.filter((m) => m.type === "video");

    const meta =
      typeof item.metadata === "object" && item.metadata !== null
        ? item.metadata
        : {};
    const localizedTitle = meta[`title_${lang}`] || meta.title_uk || item.title;
    const localizedDescription =
      meta[`description_${lang}`] || meta.description_uk || item.description;

    const result = {
      id: item.id,
      slug: item.slug,
      title: localizedTitle,
      description: localizedDescription,
      type: item.type,

      images: images.map((img) => ({
        id: img.id,
        path: img.path,
        order: img.order,
      })),

      video: videos.length > 0 ? videos[0].path : null,

      // Витягуємо лише англійські назви для простого масиву muscles
      muscles: item.muscles.map((em) => {
        const enTrans = em.muscle.translations.find((t) => t.lang === "en");
        return enTrans ? enTrans.name : "Unknown";
      }),

      // Формуємо детальну інформацію про м'язи
      musclesInfo: item.muscles.map((em) => {
        const ukTrans = em.muscle.translations.find(
          (t) => t.lang === "uk" || t.lang === "ua",
        );
        const enTrans = em.muscle.translations.find((t) => t.lang === "en");

        return {
          id: em.muscle.id,
          nameUa: ukTrans ? ukTrans.name : "Без назви", // залишаємо nameUa як ключ для сумісності з фронтендом
          nameEn: enTrans ? enTrans.name : "Unknown",
        };
      }),

      createdAt: item.createdAt,
    };

    res.json({ ok: true, result });
  } catch (error) {
    console.error("Get exercise by id error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Створити нову вправу
router.post(
  "/create",
  uploadMedia.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, muscles } = req.body;
      console.log("Create exercise body:", req.body);

      // 1. Підготовка зв'язків для м'язів
      let muscleConnections = [];
      if (muscles) {
        const parsedMuscles = JSON.parse(muscles);

        // Шукаємо м'язи через таблицю перекладів (англійською), як і при PATCH
        const targetMuscles = await prisma.muscle.findMany({
          where: {
            translations: {
              some: {
                lang: "en",
                name: { in: parsedMuscles },
              },
            },
          },
        });

        muscleConnections = targetMuscles.map((m) => ({
          muscle: {
            connect: { id: m.id },
          },
        }));
      }

      // 2. Обробка файлів та підготовка масиву медіа
      const mediaData = [];

      // Безпечна назва для файлів (видаляємо спецсимволи, щоб не зламати файлову систему)
      const safeTitle = title
        ? title.replace(/[^a-z0-9а-яіїєґ]/gi, "_")
        : "exercise";

      if (req.files.images) {
        let i = 0;
        for (const file of req.files.images) {
          // Додаємо timestamp, щоб уникнути конфліктів імен
          const outputPath =
            "uploads/" + safeTitle + "_" + Date.now() + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);

          mediaData.push({
            type: "image",
            path: "/" + outputPath,
            order: i,
          });

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          i++;
        }
      }

      if (req.files.video) {
        const videoUrl = "/uploads/" + req.files.video[0].filename;
        mediaData.push({
          type: "video",
          path: videoUrl,
        });
      }

      // 3. Генерація унікального slug (оскільки він обов'язковий в схемі)
      const generatedSlug = "exercise-" + Date.now();

      // 4. Створення вправи разом з м'язами та медіа одним запитом!
      const exercise = await prisma.exercise.create({
        data: {
          slug: generatedSlug,
          title: title,
          description: description,
          muscles: {
            create: muscleConnections,
          },
          media: {
            create: mediaData,
          },
        },
      });

      res.json({ ok: true, id: exercise.id });
    } catch (error) {
      console.error("Create exercise error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

//✅ Переписано під нову БД
// Редагувати вправу
router.patch(
  "/:id",
  uploadMedia.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, muscles } = req.body;

      const item = await prisma.exercise.findUnique({
        where: { id: Number(id) },
        // Замість images: true, videos: true використовуємо media: true
        include: { muscles: true, media: true },
      });

      if (!item) {
        return res.status(404).json({
          ok: false,
          error: "Такого запису не знайдено",
        });
      }

      // Підготовка зв'язків для м'язів
      let muscleConnections = undefined;
      if (muscles) {
        const parsedMuscles = JSON.parse(muscles);

        // Оскільки nameEn тепер у перекладах, шукаємо м'язи через таблицю перекладів
        const targetMuscles = await prisma.muscle.findMany({
          where: {
            translations: {
              some: {
                lang: "en",
                name: { in: parsedMuscles },
              },
            },
          },
        });

        muscleConnections = {
          deleteMany: {}, // Видалити всі старі зв'язки
          create: targetMuscles.map((m) => ({
            muscle: {
              connect: { id: m.id },
            },
          })),
        };
      }

      // Оновлення основних полів вправи
      await prisma.exercise.update({
        where: { id: Number(id) },
        data: {
          title: title || item.title,
          description: description || item.description,
          muscles: muscleConnections,
        },
      });

      // Обробка зображень
      if (req.files.images) {
        const imageMedia = item.media.filter((m) => m.type === "image");
        // Отримати поточну максимальну позицію
        const maxOrder =
          imageMedia.length > 0
            ? Math.max(...imageMedia.map((img) => img.order || 0))
            : -1;

        let i = maxOrder + 1;
        for (const file of req.files.images) {
          const outputPath =
            "uploads/" + (title || item.title) + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);

          // Створюємо запис у таблиці медіа з типом "image"
          await prisma.exerciseMedia.create({
            data: {
              exerciseId: Number(id),
              type: "image",
              path: "/" + outputPath,
              order: i,
            },
          });

          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          i++;
        }
      }

      // Обробка відео
      if (req.files.video) {
        const videoMedia = item.media.filter((m) => m.type === "video");

        // Видалити старе відео
        for (const oldVideo of videoMedia) {
          const oldVideoPath = path.join(__dirname, "..", oldVideo.path);
          if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);

          // Видаляємо запис з медіа
          await prisma.exerciseMedia.delete({ where: { id: oldVideo.id } });
        }

        // Додати нове відео
        const videoUrl = "/uploads/" + req.files.video[0].filename;
        await prisma.exerciseMedia.create({
          data: {
            exerciseId: Number(id),
            type: "video",
            path: videoUrl,
          },
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Patch exercise error:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

//✅ Переписано під нову БД
// Видалити вправу
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Отримати всі медіа файли перед видаленням
    const exercise = await prisma.exercise.findUnique({
      where: { id: Number(id) },
      // Запитуємо всі медіа (і зображення, і відео) з нової таблиці
      include: { media: true },
    });

    if (exercise) {
      // Видалити всі фізичні медіафайли, прив'язані до цієї вправи
      for (const item of exercise.media) {
        const filePath = path.join(__dirname, "..", item.path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    // Видалити саму вправу (завдяки onDelete: Cascade медіа записи в БД також видаляться автоматично)
    await prisma.exercise.delete({
      where: { id: Number(id) },
    });

    console.log("Deleted exercise ID:", id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete exercise error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Видалити окреме зображення (або відео)
router.delete("/:exerciseId/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    // Знайти медіа файл
    const mediaItem = await prisma.exerciseMedia.findUnique({
      where: { id: Number(imageId) },
    });

    if (!mediaItem) {
      return res.status(404).json({
        ok: false,
        error: "Медіафайл не знайдено",
      });
    }

    // Видалити фізичний файл з диска
    const filePath = path.join(__dirname, "..", mediaItem.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Видалити запис про медіафайл з БД
    await prisma.exerciseMedia.delete({
      where: { id: Number(imageId) },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete media item error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// module.exports = router;
export default router;
