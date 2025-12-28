const express=require("express");
const router=express.Router();
const { addCurrency,getCurrencies}=require("../controllers/currency");
router.post("/", addCurrency);
router.get("/",getCurrencies);
module.exports=router;