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
            muscle: true, // отримуємо об’єкт Muscle з name
          },
        },
      },
    });

    const result = items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      images: e.images ? JSON.parse(e.images) : [],
      video: e.video,
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
            muscle: true, // отримуємо об’єкт Muscle з name
          },
        },
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
      images: item.images ? JSON.parse(item.images) : [],
      video: item.video,
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

      const imagesUrls = [];
      if (req.files.images) {
        let i = 0;
        for (const file of req.files.images) {
          const outputPath = "uploads/" + title + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
          imagesUrls.push("/" + outputPath);
          fs.unlinkSync(file.path);
          i++;
        }
      }

      const videoUrl =
        req.files && req.files.video
          ? "/uploads/" + req.files.video[0].filename
          : null;

      await prisma.exercise.create({
        data: {
          title: title,
          description: description,
          images: JSON.stringify(imagesUrls),
          video: req.files.video ? videoUrl : null,
          muscles: {
            create: JSON.parse(muscles)?.map((item) => ({
              muscle: {
                connect: { nameEn: item },
              },
            })),
          },
        },
      });

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
        include: { muscles: true },
      });

      if (!item)
        return res.status(404).json({
          ok: false,
          error: "Такого запису не знайдено",
        });

      //Обробка зображень
      let imagesUrls = item.images ? JSON.parse(item.images) : [];
      if (req.files.images) {
        // Додати нові зображення
        let i = 0;
        for (const file of req.files.images) {
          const outputPath = "uploads/" + title + "_image_" + i + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
          imagesUrls.push("/" + outputPath);
          fs.unlinkSync(file.path);
          i++;
        }
      }
      // Обробка відео
      let videoUrl = item.video;
      if (req.files.video) {
        // Видалити старе відео, якщо є
        if (videoUrl) {
          const oldVideoPath = path.join(__dirname, "..", videoUrl);
          if (fs.existsSync(oldVideoPath)) fs.unlinkSync(oldVideoPath);
        }
        videoUrl = "/uploads/" + req.files.video[0].filename;
      }
      // Оновлення вправи
      await prisma.exercise.update({
        where: { id: Number(id) },
        data: {
          title: title || item.title,
          description: description || item.description,
          images: JSON.stringify(imagesUrls),
          video: videoUrl,
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

module.exports = router;
