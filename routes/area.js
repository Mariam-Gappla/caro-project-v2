const express=require("express");
const router=express.Router();
const {addArea, getArea, updateArea, deleteArea}=require("../controllers/area");
router.get("/:cityId",getArea)
router.post("/",addArea)
router.put('/areas/:id', updateArea);
router.delete('/areas/:id', deleteArea);

module.exports=router