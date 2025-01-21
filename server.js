const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");
const { format } = require("date-fns");
const cron = require("node-cron");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 3001;
const ImageStorage = require("./image");

// Initialize with your uploads directory
const imageStorage = new ImageStorage("uploads");
// Store temporary URLs and their expiration times
const tempUrls = new Map();

// Configure CORS
app.use(
  cors({
    origin: [
      "https://bank.ocean00.com",
      "https://www.bank.ocean00.com",
      "https://image.ocean00.com",
      "http://localhost:3000",
      "http://localhost:3001", // Add your development port
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// If you're uploading files, also add:
app.use(express.raw({ limit: "50mb" }));

// Set timeout
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Optionally restart the process
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

app.use("/uploads", express.static("uploads"));

const ensureUploadDir = (dirname) => {
  const uploadPath = path.join(__dirname, `uploads${dirname}`);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    fs.chmod(uploadPath, 0o777); // Fixed: Changed 'p' to 'uploadPath'
  }
  return uploadPath;
};

// API Routes
app.post("/api/saveImage", async (req, res) => {
  try {
    const { image, type, username } = req.body;
    let paths, filenames;
    const formatted3 = format(new Date(), "dd-MM-yyyy");
    switch (type) {
      case "WITHDRAW":
        paths = `WITHDRAW/${formatted3}`;
        filenames = `${username}-WITHDRAW-${format(
          new Date(),
          "dd-MM-yyyy HH-mm-ss"
        )}`;
        break;
      case "DEPOSIT":
        paths = `DEPOSIT/${formatted3}`;
        filenames = `${username}-DEPOSIT-${format(
          new Date(),
          "dd-MM-yyyy HH-mm-ss"
        )}`;
        break;
      default:
        break;
    }

    const result = await imageStorage.saveImage(image, {
      width: 1200,
      quality: 80,
      format: "webp",
      subDirectory: paths,
      filename: filenames,
    });

    if (result.success) {
      console.log(result.success);
      res.status(201).json({ url: result.fileInfo.url });
    } else {
      console.log(result.error);
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "error uploading file" });
  }
});

// Attendance check endpoint

app.get("/", (req, res) => {
  res.status(200).json({ success: "success" });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log("Cron job scheduled for attendance check at 9 PM daily");
});
