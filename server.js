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
//Вправи
app.use("/api/exercise", require("./routes/ExerciseRoutes"));
app.use("/api/baseData", require("./routes/BaseData"));

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

// Отримати всі тренування
app.get("/api/statistics/all", async (req, res) => {
  try {
    const statistics = await prisma.routineStatistics.findMany({
      orderBy: {
        endTime: "desc",
      },
    });

    res.json({ ok: true, data: statistics });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Отримати загальну статистику (summary)
app.get("/api/statistics/summary", async (req, res) => {
  try {
    const total = await prisma.routineStatistics.count();

    const allWorkouts = await prisma.routineStatistics.findMany({
      select: {
        workoutTime: true,
      },
    });

    const totalTime = allWorkouts.reduce(
      (sum, w) => sum + (w.workoutTime || 0),
      0
    );

    const lastWorkout = await prisma.routineStatistics.findFirst({
      orderBy: {
        endTime: "desc",
      },
    });

    // Статистика за цей тиждень
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekWorkouts = await prisma.routineStatistics.count({
      where: {
        endTime: {
          gte: startOfWeek.toISOString(),
        },
      },
    });

    // М'язи які тренувалися цього тижня
    const weekMuscles = await prisma.routineStatistics.findMany({
      where: {
        endTime: {
          gte: startOfWeek.toISOString(),
        },
      },
      select: {
        muscles: true,
      },
    });

    const musclesSet = new Set();
    weekMuscles.forEach((w) => {
      if (w.muscles) {
        try {
          const muscles = JSON.parse(w.muscles);
          muscles.forEach((m) => musclesSet.add(m));
        } catch (e) {
          console.error("Error parsing muscles:", e);
        }
      }
    });

    res.json({
      ok: true,
      data: {
        totalWorkouts: total,
        totalTime: totalTime,
        lastWorkout: lastWorkout,
        weekWorkouts: weekWorkouts,
        weekMuscles: Array.from(musclesSet),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Роут для реакту, який хоститься разом з серваком
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(6189, "0.0.0.0", () => {
  console.log("Server is running on port 6189");
});
