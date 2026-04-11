import { Router } from "express";

const router = Router();

//✅ Переписано під нову БД
// Створення рутини
router.post("/create", async (req, res) => {
  try {
    const { title, description, categoryIds, routineExercises } = req.body;
    console.log("Create routine payload:", {
      title,
      description,
      categoryIds,
      routineExercises,
    });

    const routine = await prisma.routine.create({
      data: {
        title,
        description,
        // Прив'язка до категорій через проміжну таблицю
        categories: {
          create: (categoryIds || []).map((categoryId) => ({
            categoryId: Number(categoryId),
          })),
        },
        // Прив'язка вправ до рутини із зазначенням порядку та показників
        exercises: {
          create: (routineExercises || []).map((ex, index) => ({
            exerciseId: Number(ex.exerciseId),
            order: index + 1,
            reps: ex.reps ? Number(ex.reps) : null,
            sets: ex.sets ? Number(ex.sets) : null,
            duration: ex.duration ? Number(ex.duration) : null,
            rest: ex.rest ? Number(ex.rest) : null,
          })),
        },
      },
      include: {
        // Підтягуємо зв'язані вправи з урахуванням нової схеми
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              include: {
                // Використовуємо media замість images/videos
                media: {
                  orderBy: { order: "asc" },
                },
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
        // Підтягуємо категорії та їх переклади
        categories: {
          include: {
            category: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });

    res.json({ ok: true, data: routine });
  } catch (error) {
    console.error("Create routine error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//✅ Переписано під нову БД
// Отримання всіх рутин
router.get("/api/routine", async (req, res) => {
  try {
    const lang = req.query.lang || "uk";

    const items = await prisma.routine.findMany({
      include: {
        categories: {
          include: {
            category: {
              include: {
                // Підтягуємо переклади категорій
                translations: {
                  where: { lang: lang },
                },
              },
            },
          },
        },
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              include: {
                // Підтягуємо медіа (замість окремих images та videos)
                media: {
                  orderBy: {
                    order: "asc",
                  },
                },
                muscles: {
                  include: {
                    muscle: {
                      include: {
                        // Підтягуємо всі переклади м'язів
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

    // Форматуємо результат для сумісності з фронтендом
    const formattedItems = items.map((routine) => {
      return {
        ...routine,
        categories: routine.categories.map((c) => ({
          ...c,
          category: {
            ...c.category,
            name: c.category.translations?.[0]?.name || "Без назви",
          },
        })),
        exercises: routine.exercises.map((re) => {
          // Розбиваємо media назад на images та videos
          const images = re.exercise.media.filter((m) => m.type === "image");
          const videos = re.exercise.media.filter((m) => m.type === "video");

          return {
            ...re,
            exercise: {
              ...re.exercise,
              images: images,
              videos: videos,
              // Відновлюємо структуру об'єктів м'язів
              muscles: re.exercise.muscles.map((em) => {
                const ukTrans = em.muscle.translations.find(
                  (t) => t.lang === "uk" || t.lang === "ua",
                );
                const enTrans = em.muscle.translations.find(
                  (t) => t.lang === "en",
                );

                return {
                  ...em,
                  muscle: {
                    ...em.muscle,
                    nameUa: ukTrans ? ukTrans.name : "Без назви",
                    nameEn: enTrans ? enTrans.name : "Unknown",
                  },
                };
              }),
            },
          };
        }),
      };
    });

    res.json({ ok: true, data: formattedItems });
  } catch (error) {
    console.error("Get routines error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Отримання рутини за ID
router.get("/api/routine/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || "uk";
    console.log("Get routine by ID:", id);

    const item = await prisma.routine.findUnique({
      where: { id: Number(id) },
      include: {
        categories: {
          include: {
            category: {
              include: {
                // Підтягуємо переклади категорій
                translations: {
                  where: { lang: lang },
                },
              },
            },
          },
        },
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              include: {
                // Використовуємо media замість окремих images та videos
                media: {
                  orderBy: {
                    order: "asc",
                  },
                },
                muscles: {
                  include: {
                    muscle: {
                      include: {
                        // Підтягуємо всі переклади м'язів
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

    if (!item) {
      return res.status(404).json({ ok: false, error: "Рутину не знайдено" });
    }

    // Форматуємо результат для сумісності з фронтендом
    const formattedItem = {
      ...item,
      categories: item.categories.map((c) => ({
        ...c,
        category: {
          ...c.category,
          name: c.category.translations?.[0]?.name || "Без назви",
        },
      })),
      exercises: item.exercises.map((re) => {
        // Розбиваємо media назад на images та videos
        const images = re.exercise.media.filter((m) => m.type === "image");
        const videos = re.exercise.media.filter((m) => m.type === "video");

        return {
          ...re,
          exercise: {
            ...re.exercise,
            images: images,
            videos: videos,
            // Відновлюємо структуру об'єктів м'язів
            muscles: re.exercise.muscles.map((em) => {
              const ukTrans = em.muscle.translations.find(
                (t) => t.lang === "uk" || t.lang === "ua",
              );
              const enTrans = em.muscle.translations.find(
                (t) => t.lang === "en",
              );

              return {
                ...em,
                muscle: {
                  ...em.muscle,
                  nameUa: ukTrans ? ukTrans.name : "Без назви",
                  nameEn: enTrans ? enTrans.name : "Unknown",
                },
              };
            }),
          },
        };
      }),
    };

    res.json({ ok: true, data: formattedItem });
  } catch (error) {
    console.error("Get routine by ID error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Видалення рутини
router.delete("/api/routine/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.routine.delete({
      where: { id: Number(id) },
    });

    console.log("Deleted routine ID:", id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Delete routine error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

//✅ Переписано під нову БД
// Оновлення рутини
router.patch("/api/routine/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryIds, routineExercises } = req.body;
    const lang = req.query.lang || "uk";

    // Спочатку видаляємо старі зв'язки (назви таблиць відповідають вашій схемі)
    await prisma.routineExercise.deleteMany({
      where: { routineId: Number(id) },
    });

    // У вашій схемі проміжна таблиця називається RoutineToCategory, а не RoutineCategory
    await prisma.routineToCategory.deleteMany({
      where: { routineId: Number(id) },
    });

    // Оновлюємо рутину та додаємо нові зв'язки
    const routine = await prisma.routine.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        categories: {
          create: (categoryIds || []).map((categoryId) => ({
            categoryId: Number(categoryId),
          })),
        },
        exercises: {
          create: (routineExercises || []).map((ex, index) => ({
            exerciseId: Number(ex.exerciseId),
            order: index + 1,
            reps: ex.reps ? Number(ex.reps) : null,
            sets: ex.sets ? Number(ex.sets) : null,
            duration: ex.duration ? Number(ex.duration) : null,
            rest: ex.rest ? Number(ex.rest) : null,
          })),
        },
      },
      include: {
        // Підтягуємо зв'язані вправи та категорії для відправки оновлених даних на фронтенд
        exercises: {
          orderBy: {
            order: "asc",
          },
          include: {
            exercise: {
              include: {
                media: {
                  orderBy: { order: "asc" },
                },
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
        categories: {
          include: {
            category: {
              include: {
                translations: {
                  where: { lang: lang },
                },
              },
            },
          },
        },
      },
    });

    // Форматуємо результат для сумісності з фронтендом
    const formattedRoutine = {
      ...routine,
      categories: routine.categories.map((c) => ({
        ...c,
        category: {
          ...c.category,
          name: c.category.translations?.[0]?.name || "Без назви",
        },
      })),
      exercises: routine.exercises.map((re) => {
        const images = re.exercise.media.filter((m) => m.type === "image");
        const videos = re.exercise.media.filter((m) => m.type === "video");

        return {
          ...re,
          exercise: {
            ...re.exercise,
            images: images,
            videos: videos,
            muscles: re.exercise.muscles.map((em) => {
              const ukTrans = em.muscle.translations.find(
                (t) => t.lang === "uk" || t.lang === "ua",
              );
              const enTrans = em.muscle.translations.find(
                (t) => t.lang === "en",
              );

              return {
                ...em,
                muscle: {
                  ...em.muscle,
                  nameUa: ukTrans ? ukTrans.name : "Без назви",
                  nameEn: enTrans ? enTrans.name : "Unknown",
                },
              };
            }),
          },
        };
      }),
    };

    res.json({ ok: true, data: formattedRoutine });
  } catch (error) {
    console.error("Patch routine error:", error);
    res.status(500).json({
      ok: false,
      error: "Щось пішло не так на сервері",
    });
  }
});

export default router;
