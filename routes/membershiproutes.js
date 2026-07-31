const express=require("express");
const router=express.Router();
const {
    addMembership, getMemberships, updateMembership,
    deleteMembership } = require("../controllers/membership");
  
router.get("/", getMemberships);
router.post("/add", addMembership);
router.put('/update/:id', updateMembership);
router.delete('/delete/:id', deleteMembership);

module.exports=router;