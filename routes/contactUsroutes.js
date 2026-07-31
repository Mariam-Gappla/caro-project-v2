const express = require('express');
const router = express.Router();
const {addcontactUs,    getContactList,
    getContactDetails,
    adminReply}= require("../controllers/contactUs");
router.post("/sendMessage", addcontactUs);
router.get("/contacts", getContactList);
router.get("/contact-details/:id", getContactDetails);
router.post("/contact-reply", adminReply);




module.exports = router;