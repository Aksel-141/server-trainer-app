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

// Catch-all route to serve React app
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

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
      const { title, description } = req.body;
      //Збереження файлів в папку і отримання url

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
        },
      });

      res.json({ ok: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }

    // const data = req.body;
    // console.log(data);

    // console.log(res);
  }
);

app.listen(6189, () => {
  console.log("Server is running on port 6189");
});
