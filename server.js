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

//Повноцінні тренування
import workoutRoutes from "./routes/WorkoutRoutes.js";
app.use("/api/workout", workoutRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Роут для реакту, який хоститься разом з серваком
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(6189, "0.0.0.0", () => {
  console.log("Server is running on port 6189");
});
