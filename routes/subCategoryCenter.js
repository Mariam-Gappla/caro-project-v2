const express = require("express");
const router = express.Router();
const { addSubCategoryCenter, getAllSubCategoryCenter, deleteSubCategoryCenter } = require("../controllers/subCategoryCenter");
router.post("/", addSubCategoryCenter);
router.get("/:id", getAllSubCategoryCenter);
router.delete("/delete/:id", deleteSubCategoryCenter);
module.exports = router;