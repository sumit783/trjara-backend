// config/db.js
const mongoose = require("mongoose");
const config = require("./serverConfig");

const connectDB = async () => {
  try {
    // Add connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB Cluster");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("Mongoose disconnected from DB Cluster");
    });

    const conn = await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Wait 15s before timing out initial connection
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    
    // Provide specific guidance for Atlas timeout issues
    if (error.message.includes("selection timeout") || error.message.includes("buffering timed out")) {
      console.error("--------------------------------------------------------------------------------");
      console.error("TROUBLESHOOTING HINT:");
      console.error("1. Check if your public IP is whitelisted in MongoDB Atlas (Network Access).");
      console.error("2. Ensure port 27017 is open and not blocked by a VPN or Firewall.");
      console.error("3. Verify that your MONGO_URI in .env is correct.");
      console.error("--------------------------------------------------------------------------------");
    }
    
    process.exit(1); // Stop app if DB connection fails
  }
};

module.exports = connectDB;

