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
