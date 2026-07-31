const express = require("express");
const router = express.Router();
const statsController = require("../controllers/pendingStatsController");

router.get("/today-pending", statsController.getTodayPendingStats);
router.get("/total-pending", statsController.getTotalPendingCount);
router.get("/today-new-users", statsController.getTodayNewUsers);
router.get("/today-posts", statsController.getTodayPostsCount);

module.exports = router;