import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import prisma from "./prismaInit.js";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:4173"],
};

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());

// АПІ БЕКЕНДУ
//Вправи
import exerciseRoutes from "./routes/ExerciseRoutes.js";
app.use("/api/exercise", exerciseRoutes);

//Базові дані
import baseDataRoutes from "./routes/BaseData.js";
app.use("/api/baseData", baseDataRoutes);

//Рутини
import routineRoutes from "./routes/RoutineRoutes.js";
app.use("/api/routine", routineRoutes);

// Створення тренування
app.post("/api/workout", async (req, res) => {
  try {
    const {
      routineId,
      title,
      startTime,
      endTime,
      totalTime,
      exercises,
      muscles,
    } = req.body;

    const workout = await prisma.workout.create({
      data: {
        routineId: routineId || null,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalTime,
        exercises: {
          create: exercises.map((ex, index) => ({
            exerciseId: ex.exerciseId,
            order: index + 1,
            sets: {
              create: ex.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps || null,
                duration: set.duration || null,
                weight: set.weight || null,
                completedAt: new Date(set.completedAt),
              })),
            },
          })),
        },
        muscles: {
          create: muscles.map((muscleId) => ({
            muscleId,
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
        muscles: {
          include: {
            muscle: true,
          },
        },
      },
    });

    res.json({ ok: true, data: workout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: "Something went wrong" });
  }
});

// Отримати всі тренування
app.get("/api/workout", async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: {
        endTime: "desc",
      },
      include: {
        routine: true,
        muscles: {
          include: {
            muscle: true,
          },
        },
      },
    });

    res.json({ ok: true, data: workouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

// Отримати загальну статистику (summary)
app.get("/api/workout/summary", async (req, res) => {
  try {
    const total = await prisma.workout.count();

    const allWorkouts = await prisma.workout.findMany({
      select: {
        totalTime: true,
      },
    });

    const totalTime = allWorkouts.reduce(
      (sum, w) => sum + (w.totalTime || 0),
      0,
    );

    const lastWorkout = await prisma.workout.findFirst({
      orderBy: {
        endTime: "desc",
      },
      select: {
        title: true,
        endTime: true,
        totalTime: true,
      },
    });

    // Статистика за цей тиждень
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekWorkouts = await prisma.workout.count({
      where: {
        endTime: {
          gte: startOfWeek.toISOString(),
        },
      },
    });

    // М'язи які тренувалися цього тижня
    const weekMusclesData = await prisma.workoutMuscle.findMany({
      where: {
        workout: {
          endTime: {
            gte: startOfWeek.toISOString(),
          },
        },
      },
      include: {
        muscle: true,
      },
      distinct: ["muscleId"],
    });

    const weekMuscles = weekMusclesData.map((wm) => wm.muscle.nameEn);

    res.json({
      ok: true,
      data: {
        totalWorkouts: total,
        totalTime: totalTime,
        lastWorkout: lastWorkout
          ? {
              workoutTitle: lastWorkout.title,
              endTime: lastWorkout.endTime,
              workoutTime: lastWorkout.totalTime,
            }
          : null,
        weekWorkouts: weekWorkouts,
        weekMuscles: weekMuscles,
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
