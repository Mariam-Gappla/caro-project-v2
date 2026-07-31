const express= require("express");
const router = express.Router();
const {addRatingForOrderToRentalOffice,addRatingForOrderToServiceProvider,getratingbyrentalOffice,getRatingByServiceProvider,changePaymentStatus}=require("../controllers/ratingForOrder");
router.post("/addforRentalOffice",addRatingForOrderToRentalOffice);
router.post("/addforServiceProvider",addRatingForOrderToServiceProvider);
router.get("/ratingForRentalOffice",getratingbyrentalOffice);
router.get("/ratingByServiceProvider", getRatingByServiceProvider);
router.put("/changePaymentStatus", changePaymentStatus); 
module.exports = router;