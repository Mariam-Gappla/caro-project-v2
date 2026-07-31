const express=require("express");
const router=express.Router();
const {addWinchOrder,addTireOrder,getOrdersbyServiceType,getOrderByIdForUser,changeStatusForOrder,ordersAndProfit,reportForProvider,getOrdersByServiceProvider,getOrderById,endOrder,getServiceLiveStats,changeTripStatus,issueInvoice}=require("../controllers/serviceProviderOrders");
const upload = require("../configration/uploadFile");
router.get("/service-stats", getServiceLiveStats);
router.post("/winch",upload.single("image"),addWinchOrder);
router.post("/others",upload.single("image"),addTireOrder);
router.get("/",getOrdersbyServiceType);
router.get("/ordersAndProfit",ordersAndProfit);
router.get("/report",reportForProvider);
router.get("/ordersForProvider",getOrdersByServiceProvider)
router.post("/changeStatus",changeStatusForOrder);
router.get("/OrderById/:id",getOrderById);
router.get("/orders/user/:id", getOrderByIdForUser);
router.put("/changeTripStatus", changeTripStatus);
router.put("/issueInvoice", issueInvoice);
router.put("/endOrder", endOrder)
module.exports=router;