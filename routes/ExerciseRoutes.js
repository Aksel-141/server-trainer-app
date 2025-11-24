const prisma = require("../prismaInit");
const router = require("express").Router();
const sharp = require("sharp");

const path = require("path");
const fs = require("fs");
const { uploadMedia } = require("../uploadMedia");

router.get("/all", async (req, res) => {
  try {
    const items = await prisma.exercise.findMany({
      include: {
        muscles: {
          include: {
            muscle: true, // отримуємо об'єкт Muscle з name
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

    const result = items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      images: e.images.map((img) => img.path),
      video: e.videos.length > 0 ? e.videos[0].path : null,
      muscles: e.muscles.map((em) => em.muscle.nameEn),
      createdAt: e.createdAt,
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
              (m) => typeof m === "string" && m.trim()
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

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.exercise.findUnique({
      where: { id: Number(id) },
      include: {
        muscles: {
          include: {
            muscle: true, // отримуємо об'єкт Muscle з name
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

    if (!item)
      return res.status(404).json({
        ok: false,
        error: "Такого запису не знайдено",
      });

    const result = {
      id: item.id,
      title: item.title,
      description: item.description,
      images: item.images.map((img) => ({
        id: img.id,
        path: img.path,
        order: img.order,
      })),
      video: item.videos.length > 0 ? item.videos[0].path : null,
      muscles: item.muscles.map((em) => em.muscle.nameEn),
      musclesInfo: item.muscles.map((m) => ({
        id: m.muscle.id,
        nameUa: m.muscle.nameUa,
        nameEn: m.muscle.nameEn,
      })),
      createdAt: item.createdAt,
    };

    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

router.post(
  "/create",
  uploadMedia.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, muscles } = req.body;
      //Збереження файлів в папку і отримання url
      console.log(req.body);

      const exercise = await prisma.exercise.create({
        data: {
          title: title,
          description: description,
          muscles: {
            create: JSON.parse(muscles)?.map((item) => ({
              muscle: {
                connect: { nameEn: item },
              },
            })),
          },
        },
      });

      // Збереження зображень
      if (req.files.images) {
        let i = 0;
        for (const file of req.files.images) {
          const outputPath = "uploads/" + title + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
          await prisma.exerciseImage.create({
            data: {
              exerciseId: exercise.id,
              path: "/" + outputPath,
              order: i,
            },
          });
          fs.unlinkSync(file.path);
          i++;
        }
      }

      // Збереження відео
      if (req.files.video) {
        const videoUrl = "/uploads/" + req.files.video[0].filename;
        await prisma.exerciseVideo.create({
          data: {
            exerciseId: exercise.id,
            path: videoUrl,
          },
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);
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
        include: { muscles: true, images: true, videos: true },
      });

      if (!item)
        return res.status(404).json({
          ok: false,
          error: "Такого запису не знайдено",
        });

      // Оновлення основних полів вправи
      await prisma.exercise.update({
        where: { id: Number(id) },
        data: {
          title: title || item.title,
          description: description || item.description,
          muscles: muscles
            ? {
                deleteMany: {}, // Видалити всі старі зв'язки
                create: JSON.parse(muscles).map((item) => ({
                  muscle: {
                    connect: { nameEn: item },
                  },
                })),
              }
            : undefined,
        },
      });

      // Обробка зображень
      if (req.files.images) {
        // Отримати поточну максимальну позицію
        const maxOrder =
          item.images.length > 0
            ? Math.max(...item.images.map((img) => img.order))
            : -1;

        let i = maxOrder + 1;
        for (const file of req.files.images) {
          const outputPath =
            "uploads/" + (title || item.title) + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
          await prisma.exerciseImage.create({
            data: {
              exerciseId: Number(id),
              path: "/" + outputPath,
              order: i,
            },
          });
          fs.unlinkSync(file.path);
          i++;
        }
      }

      // Обробка відео
      if (req.files.video) {
        // Видалити старе відео
        for (const oldVideo of item.videos) {
          const oldVideoPath = path.join(__dirname, "..", oldVideo.path);
          if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);
          await prisma.exerciseVideo.delete({ where: { id: oldVideo.id } });
        }

        // Додати нове відео
        const videoUrl = "/uploads/" + req.files.video[0].filename;
        await prisma.exerciseVideo.create({
          data: {
            exerciseId: Number(id),
            path: videoUrl,
          },
        });
      }

      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  }
);

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Отримати всі медіа файли перед видаленням
    const exercise = await prisma.exercise.findUnique({
      where: { id: Number(id) },
      include: { images: true, videos: true },
    });

    if (exercise) {
      // Видалити файли зображень
      for (const image of exercise.images) {
        const imagePath = path.join(__dirname, "..", image.path);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }

      // Видалити файли відео
      for (const video of exercise.videos) {
        const videoPath = path.join(__dirname, "..", video.path);
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      }
    }

    // Видалити вправу (каскадне видалення медіа записів з БД)
    await prisma.exercise.delete({
      where: { id: Number(id) },
    });

    console.log(id);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Видалити окреме зображення
router.delete("/:exerciseId/image/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;

    // Знайти зображення
    const image = await prisma.exerciseImage.findUnique({
      where: { id: Number(imageId) },
    });

    if (!image) {
      return res.status(404).json({
        ok: false,
        error: "Зображення не знайдено",
      });
    }

    // Видалити файл
    const imagePath = path.join(__dirname, "..", image.path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Видалити запис з БД
    await prisma.exerciseImage.delete({
      where: { id: Number(imageId) },
    });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

module.exports = router;
