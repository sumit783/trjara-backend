const express = require("express");
const {
  adminLogin,
  adminLogout,
} = require("../../controllers/auth/supabaseAuthController");

const router = express.Router();

// Admin login via Supabase
router.post("/login", adminLogin);

// Admin logout
router.post("/logout", adminLogout);

module.exports = router;
