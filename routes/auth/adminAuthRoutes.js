const express = require("express");
const {
  adminLogin,
  adminLogout,
} = require("../../controllers/auth/supabaseAuthController");

const {
  getAllCustomers,
  getCustomerById,
} = require("../../controllers/users/userController");

const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");

const router = express.Router();

// Admin authentication routes
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

// Customer management routes (protected by admin auth)
router.get("/customers", adminAuthMiddleware, getAllCustomers);
router.get("/customers/:id", adminAuthMiddleware, getCustomerById);

module.exports = router;
