
const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise && mongoose.connection.readyState === 2) {
    return connectionPromise;
  }
  const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/NutriConnectDatabase";

  connectionPromise = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      console.log("MongoDB Connected Successfully");
    })
    .catch((err) => {
      connectionPromise = null;
      console.error("MongoDB Connection Failed:", err.message);
      if (!process.env.VERCEL) {
        process.exit(1);
      }
      throw err;
    });

  return connectionPromise;
};

module.exports = connectDB;

