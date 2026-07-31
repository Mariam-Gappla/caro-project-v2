const express=require("express");
const router=express.Router();
const {addType,getTypes,getType}=require("../controllers/carType");
router.get("/",getTypes);
router.post("/", addType);
router.get("/getType/:nameId",getType)
module.exports=router;
