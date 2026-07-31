const express = require("express");
const router = express.Router();
const {addNationality,getNationality, updateNationality, deleteNationality }=require("../controllers/nationality")
router.post("/", addNationality);
router.get("/", getNationality);
router.put('/update/:id', updateNationality);
router.delete('/delete/:id', deleteNationality);
module.exports = router;