const express=require("express");
const router=express.Router();
const {addName,getNames,deleteName}=require("../controllers/carName");
const upload=require("../configration/uploadFile");
router.get("/",getNames);
router.post("/",upload.single("image"),addName)
router.delete("/delete/:id", deleteName)


module.exports=router