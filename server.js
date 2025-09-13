const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");

const trainingData = require("./trainingData.json");

const corsOptions = {
  origin: ["http://localhost:5173"],
};

app.use(express.static(path.join(__dirname, "dist")));

//app.use(cors(corsOptions));

// API route example
// app.get('/api/listOfTraining', (req, res) => {
//     res.json(trainingData);
// });

// Catch-all route to serve React app
app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(6668, () => {
  console.log("Server is running on port 6668");
});
