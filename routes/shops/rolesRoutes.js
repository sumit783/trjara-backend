const express = require("express");
const router = express.Router();
const roleController = require("../../controllers/shops/roleController");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");

router.post("/", adminAuthMiddleware, roleController.createRole);
router.get("/", adminAuthMiddleware, roleController.getRoles);
router.get("/:id", adminAuthMiddleware, roleController.getRoleById);
router.put("/:id", adminAuthMiddleware, roleController.updateRole);
router.delete("/:id", adminAuthMiddleware, roleController.deleteRole);

module.exports = router;

