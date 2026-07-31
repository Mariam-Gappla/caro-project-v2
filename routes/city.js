const express=require("express");
const router=express.Router();
const { addCity,getCities,updateCity,deleteCity}=require("../controllers/city");
router.post("/",addCity);
router.get("/",getCities)
router.put('/cities/:id', updateCity);
router.delete('/cities/:id', deleteCity);

module.exports=router;