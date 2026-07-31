const express = require('express');
const router = express.Router();
// تأكد من استيراد middleware الرفع الخاص بك (multer)
const upload = require('../configration/uploadFile');
// استيراد الدوال المحدثة من الـ Controller
const { addVideo, getVideos, deleteVideo } = require('../controllers/howToUseCaro');

// ✅ 1. جلب جميع فيديوهات "طريقة العمل مع كارنو"
router.get("/", getVideos);

// ✅ 2. إضافة فيديو جديد (باستخدام multer لرفع ملف واحد باسم 'video')
router.post('/add', upload.single('video'), addVideo);

// ✅ 3. حذف فيديو محدد (باستخدام الـ id في الـ params)
router.delete("/delete/:id", deleteVideo);

module.exports = router;