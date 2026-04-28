const express = require("express");
const {
  adminLogin,
  adminLogout,
} = require("../../controllers/auth/supabaseAuthController");

const router = express.Router();



// Admin authentication routes
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

module.exports = router;
