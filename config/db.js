// config/db.js
const mongoose = require("mongoose");
const config = require("./serverConfig");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Stop app if DB connection fails
  }
};

module.exports = connectDB;

