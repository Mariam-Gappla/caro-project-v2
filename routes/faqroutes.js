const express = require("express");
const router = express.Router();
const {addFaq, getFaqs, deleteFaq } = require("../controllers/faq.js");
router.post("/", addFaq);
router.get("/", getFaqs);
router.delete("/delete/:id", deleteFaq)
module.exports = router;