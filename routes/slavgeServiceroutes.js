const express=require("express");
const router=express.Router();
const {addSlavgeService,getSlaveServices,deleteSlavgeService}=require("../controllers/slavgeService");
router.post("/",addSlavgeService);
router.get("/", getSlaveServices);
router.delete("/:id", deleteSlavgeService);
module.exports=router;