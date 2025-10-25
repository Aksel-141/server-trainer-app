const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const prisma = require("./prismaInit");

const app = express();

const corsOptions = {
  origin: ["http://localhost:5173"],
};

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());

// АПІ БЕКЕНДУ

app.use("/api/exercise", require("./routes/ExerciseRoutes"));
//Створення вправи

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

app.get("/api/routine", async (req, res) => {
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
app.delete("/api/routine/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.routine.delete({
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

//Статистика тренування
app.post("/api/statistics", async (req, res) => {
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
