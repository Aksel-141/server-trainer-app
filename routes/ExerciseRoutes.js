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

    console.log(items[1]);

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
        for (const file of req.files.images) {
          const outputPath = "uploads/" + Date.now() + ".webp";
          await sharp(file.path).webp({ quality: 80 }).toFile(outputPath);
          imagesUrls.push("/" + outputPath);
          fs.unlinkSync(file.path);
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
