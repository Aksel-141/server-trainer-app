import { Router } from "express";
import prisma from "../prismaInit.js";
const router = Router();

//✅ Переписано під нову БД
// Створення тренування
router.post("/", async (req, res) => {
  try {
    const { routineId, title, startTime, endTime, totalTime, exercises } =
      req.body;

    const workout = await prisma.workout.create({
      data: {
        routineId: routineId ? Number(routineId) : null,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalTime: Number(totalTime),
        exercises: {
          create: exercises.map((ex, index) => ({
            exerciseId: Number(ex.exerciseId),
            order: index + 1,
            sets: {
              create: ex.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps ? Number(set.reps) : null,
                duration: set.duration ? Number(set.duration) : null,
                weight: set.weight ? Number(set.weight) : null,
                completedAt: new Date(set.completedAt),
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              include: {
                // Підтягуємо переклади м'язів для вправи, якщо вони потрібні фронтенду
                muscles: {
                  include: {
                    muscle: {
                      include: {
                        translations: true,
                      },
                    },
                  },
                },
              },
            },
            sets: {
              orderBy: {
                setNumber: "asc",
              },
            },
          },
        },
      },
    });

    res.json({ ok: true, data: workout });
  } catch (error) {
    console.error("Create workout error:", error);
    res.status(500).json({ ok: false, error: "Something went wrong" });
  }
});

//✅ Переписано під нову БД
// Отримати всі тренування
router.get("/", async (req, res) => {
  try {
    const workouts = await prisma.workout.findMany({
      orderBy: {
        endTime: "desc",
      },
      include: {
        routine: true,
        // Оскільки м'язи не прив'язані до workout напряму, ми підтягуємо їх через вправи
        exercises: {
          include: {
            exercise: {
              include: {
                muscles: {
                  include: {
                    muscle: {
                      include: {
                        translations: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json({ ok: true, data: workouts });
  } catch (error) {
    console.error("Get workouts error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Отримати загальну статистику (summary)
router.get("/summary", async (req, res) => {
  try {
    // 1. Загальна кількість
    const totalCount = await prisma.workout.count();

    // 2. Загальний час
    const allWorkoutsTime = await prisma.workout.findMany({
      select: { totalTime: true },
    });
    const totalTime = allWorkoutsTime.reduce(
      (sum, w) => sum + (w.totalTime || 0),
      0,
    );

    // 3. Останнє тренування
    const lastWorkout = await prisma.workout.findFirst({
      orderBy: { endTime: "desc" },
      select: {
        title: true,
        endTime: true,
        totalTime: true,
      },
    });

    // 4. Статистика за цей тиждень (з понеділка)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekWorkoutsData = await prisma.workout.findMany({
      where: {
        endTime: { gte: startOfWeek },
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscles: {
                  include: {
                    muscle: {
                      include: {
                        translations: {
                          where: { lang: "en" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 5. Обробка унікальних м'язів за тиждень
    const weekMusclesSet = new Set();
    weekWorkoutsData.forEach((workout) => {
      workout.exercises.forEach((we) => {
        we.exercise.muscles.forEach((em) => {
          const muscleName = em.muscle.translations[0]?.name;
          if (muscleName) weekMusclesSet.add(muscleName);
        });
      });
    });

    res.json({
      ok: true,
      data: {
        totalWorkouts: totalCount,
        totalTime: totalTime,
        lastWorkout: lastWorkout
          ? {
              workoutTitle: lastWorkout.title,
              endTime: lastWorkout.endTime,
              workoutTime: lastWorkout.totalTime,
            }
          : null,
        weekWorkouts: weekWorkoutsData.length,
        weekMuscles: Array.from(weekMusclesSet),
      },
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

export default router;
