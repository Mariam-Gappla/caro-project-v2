const express=require("express");
const router=express.Router();
const {addMainCategoryActivity,getAllMainCategoryActivity, deleteMainCategoryActivity}=require("../controllers/mainCategoryActivity")
router.post("/",addMainCategoryActivity);
router.get("/", getAllMainCategoryActivity);
router.delete("/:id", deleteMainCategoryActivity);
module.exports=router