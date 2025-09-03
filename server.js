const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const userAuthRoutes = require("./routes/auth/userAuthRoutes");
const adminAuthRoutes = require("./routes/auth/adminAuthRoutes");
const errorHandler = require("./middlewares/errorHandler");
 
dotenv.config();

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
