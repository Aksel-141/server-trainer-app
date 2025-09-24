const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");

const app = express();
const prisma = new PrismaClient();

const corsOptions = {
  origin: ["http://localhost:5173"],
};

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());

// АПІ БЕКЕНДУ
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    cb(null, Date.now() + ext);
  },
});
const uploadMedia = multer({ storage: multerStorage });

//Створення вправи
app.post(
  "/api/exercise/create",
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

      const videoUrl = req.files.video
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
                connect: { name: item },
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

app.get("/api/exercise/all", async (req, res) => {
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
    console.log(items);

    const f = items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      images: e.images ? JSON.parse(e.images) : [],
      video: e.video,
      muscles: e.muscles.map((em) => em.muscle.name),
      createdAt: e.createdAt,
    }));
    res.json({ ok: true, data: f });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

app.delete("/api/exercise/:id", async (req, res) => {
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

//Створення рутини
app.post("/api/routine/create", async (req, res) => {
  try {
    const { title, description, routineExercises } = req.body;
    console.log({ title, description, routineExercises });
    const routine = await prisma.routine.create({
      data: {
        title,
        description,
        exercises: {
          create: routineExercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index + 1,
            reps: ex.reps || null,
            sets: ex.sets || null,
            duration: ex.duration || null,
            rest: ex.rest || null,
          })),
        },
      },
      include: {
        exercises: { include: { exercise: true } },
      },
    });
    res.json({ ok: true, data: routine });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/routine/all", async (req, res) => {
  try {
    const items = await prisma.routine.findMany({
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscles: {
                  include: {
                    muscle: true, // отримуємо об’єкт Muscle з name
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(items);
    res.json({ ok: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

app.get("/api/routine/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const items = await prisma.routine.findUnique({
      where: { id: Number(id) },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscles: {
                  include: {
                    muscle: true, // отримуємо об’єкт Muscle з name
                  },
                },
              },
            },
          },
        },
      },
    });
    console.log(items);
    res.json({ ok: true, data: items });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});
app.delete("/api/routine/:id");

//Статистика тренування
app.post("/api/statistics/add", async (req, res) => {
  try {
    const { workoutTitle, workoutTime, endTime, muscles } = req.body;
    const data = await prisma.RoutineStatistics.create({
      data: {
        workoutTitle: workoutTitle,
        workoutTime: workoutTime,
        endTime: endTime,
        muscles: JSON.stringify(muscles),
      },
    });

    res.json({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});
app.get("/api/statistics/all");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Роут для реакту, який хоститься разом з серваком
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(6189, "0.0.0.0", () => {
  console.log("Server is running on port 6189");
});
