const express = require("express");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");
const roleController = require("../../controllers/shops/roleController");

const router = express.Router();

// Admin-only: Create a role
router.post("/roles", adminAuthMiddleware, roleController.createRole);

// Optional: expose other role endpoints for admins
router.get("/roles", adminAuthMiddleware, roleController.getRoles);
router.get("/roles/:id", adminAuthMiddleware, roleController.getRoleById);
router.put("/roles/:id", adminAuthMiddleware, roleController.updateRole);
router.delete("/roles/:id", adminAuthMiddleware, roleController.deleteRole);

module.exports = router;
