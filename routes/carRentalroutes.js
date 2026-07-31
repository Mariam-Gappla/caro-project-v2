const express=require("express");
const router=express.Router();
const {addCar,getCarsByRentalOfficeForUser,getCarById,updateCar,deleteCar,getSearchCar}=require("../controllers/carRental");
const upload=require("../configration/uploadFile");
router.post("/addcar", upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 }
]), addCar);router.get("/search",getSearchCar);
router.get("/carsbyrentaloffice/:id",getCarsByRentalOfficeForUser);
router.put("/:id",upload.fields([
    { name: 'images', maxCount: 10 }]),updateCar)
router.get("/:id",getCarById);
router.delete("/:id",deleteCar);








module.exports=router;