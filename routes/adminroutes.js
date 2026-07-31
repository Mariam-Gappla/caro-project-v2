const express=require("express");
const router = express.Router();
const { login,
    getAllPosts,
    getAllOrders,
    getRentalOffice,
    approveRentalOffice,
    getPendingRentalOffices,
    getAcceptedRentalOffices,
    getRentalOfficeDetails,
    getRentalOfficePosts,
    deleteRentalPost,
    getRefusedRentalOffices,
    deleteRentalOffice,
    getServiceProviderAccept,
    getServiceProviderRefuse,
    getServiceProviderRequests,
    getServiceProviderDetails,
    updateServiceProviderStatus,
    deleteServiceProvider,
    getUsers,
    deleteUser,
    getUsersForAdmin,
    deleteUserForAdmin,
    getReports,
    getReportDetails, 
    deleteAnyPost,
    getAllPostsForAdmin, getPostDetailsForAdmin,
    getPendingCenterServices,
    getAcceptedCenterServices,
    getCenterServiceDetails,
    getRefusedCenterServices,
    refuseCenterService,
    approveCenterService,
    getCenterServicePosts,
    deleteCenterService,
    getCenterServices,
    getServiceProviderOrdersForAdmin,
    deleteServiceProviderOrder,
    getServiceProviderOrderDetails
} = require("../controllers/admin")
router.post("/adminlogin", login)
router.get("/posts", getAllPosts)
router.get("/Orders", getAllOrders)
router.get("/Rentaloffice", getRentalOffice)
router.post('/approve/:id', approveRentalOffice);
router.get("/pending", getPendingRentalOffices)
router.get('/accepted', getAcceptedRentalOffices);
router.get("/rental-office-details", getRentalOfficeDetails);
router.get("/rental-office-posts", getRentalOfficePosts);
router.delete("/delete/:id", deleteRentalPost);
router.get('/refused', getRefusedRentalOffices);
router.delete("/deleteRental", deleteRentalOffice)
router.get("/serviceProviderAccepted", getServiceProviderAccept);
router.get("/serviceProviderRefused", getServiceProviderRefuse);
router.get("/serviceProviderRequests",getServiceProviderRequests);
router.get("/serviceProvider/:id", getServiceProviderDetails)
router.put("/updateProviderStatus",updateServiceProviderStatus);
router.delete("/deleteserviceProvider/:id", deleteServiceProvider)
router.get("/Users", getUsers)
router.delete("/deleteUsers", deleteUser)
router.get("/Reports", getReports)
router.get("/ReportsDetails/:id", getReportDetails)
router.delete("/DeletePosts/:id", deleteAnyPost)
router.get("/getPosts", getAllPostsForAdmin)
router.get("/getPostsDetails/:id", getPostDetailsForAdmin)
router.get("/users/:type", getUsersForAdmin);
router.delete("/user/:id", deleteUserForAdmin);
router.get('/centerServices/pending', getPendingCenterServices);
router.get('/centerServices/accepted', getAcceptedCenterServices);
router.get('/centerServices/refused', getRefusedCenterServices);
router.get('/centerServices/details', getCenterServiceDetails);
router.delete('/centerServices/delete/:id', deleteCenterService);
router.post('/centerServices/refuse/:id', refuseCenterService);
router.post('/centerServices/approve/:id', approveCenterService);
router.get('/centerServices/posts', getCenterServicePosts);
router.get('/centerServices/all', getCenterServices);
router.get('/serviceProviderOrders', getServiceProviderOrdersForAdmin);
router.get('/serviceProviderOrders/:id', getServiceProviderOrderDetails);
router.delete('/serviceProviderOrders/delete/:id', deleteServiceProviderOrder);


module.exports = router;
