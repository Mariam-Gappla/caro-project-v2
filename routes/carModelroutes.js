const express=require("express");
const router=express.Router();
const {addModel,getModels,getModel}=require("../controllers/carModel");
router.get("/",getModels);
router.post("/",addModel);
router.get("/getModel/:typeId",getModel)

module.exports=router