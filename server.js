const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const userAuthRoutes = require("./routes/auth/userAuthRoutes");
const adminAuthRoutes = require("./routes/auth/adminAuthRoutes");
const documentRoutes = require("./routes/documentRouter/documentRoutes");
const shopsRoutes = require("./routes/shops/Shop.js");
const addressRoutes = require("./routes/users/addressRoutes.js");
const categoriesRoutes = require("./routes/shops/categoriesRoutes.js");
const userLists = require("./routes/users/usersLists.js");
const errorHandler = require("./middlewares/errorHandler");
const authMiddleware = require("./middlewares/authMiddleware.js");
const path = require("path");

dotenv.config();

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running...");
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth/user", userAuthRoutes);
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/documents", authMiddleware, documentRoutes);
app.use("/api/shops", authMiddleware, shopsRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/categories", categoriesRoutes);
app.use('/api/users', userLists)

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
