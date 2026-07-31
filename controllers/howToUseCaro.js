const HowToUseCaro = require('../models/howToUseCaro');
const getMessages = require("../configration/getmessages");
const fs = require('fs');
const path = require('path');

// دالة مساعدة لحفظ الملف
const saveFile = (file, folder = 'videos') => {
  if (!file) return null;

  const originalName = file.originalname.replace(/\s+/g, '');
  const fileName = `${Date.now()}-${originalName}`;
  const saveDir = path.join(__dirname, '..', 'public', folder);
  const filePath = path.join(saveDir, fileName);

  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  // فحص: إذا كان multer يستخدم memoryStorage
  if (file.buffer) {
    fs.writeFileSync(filePath, file.buffer);
  } 
  // فحص: إذا كان multer يستخدم diskStorage (يتم نقل الملف فقط)
  else if (file.path) {
    fs.renameSync(file.path, filePath);
  } 
  else {
    return null; // هنا نمنع حدوث الخطأ ونعيد null
  }

  return `${folder}/${fileName}`;
};
// ✅ 1. إضافة فيديو جديد (طريقة العمل مع كارنو)
const addVideo = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    
    if (!req.file) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: lang === 'ar' ? 'تأكد من اختيار فيديو وإرساله باسم video' : 'Please select a video with field name: video'
      });
    }

    const relativePath = saveFile(req.file, 'videos');
    
    if (!relativePath) {
       return res.status(400).json({
         status: false,
         code: 400,
         message: "Failed to process video file (Buffer/Path missing)"
       });
    }

    const baseUrl = process.env.BASE_URL || 'https://api.carnoapp.com';
    const videoUrl = `${baseUrl}/${relativePath}`;

    // ملاحظة: الـ Schema لديك تتطلب مصفوفة فيديوهات
    await HowToUseCaro.create({ 
      videos: [{ url: videoUrl }] 
    });

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? 'تم إضافة الفيديو بنجاح' : 'Video added successfully',
    });

  } catch (err) {
    next(err);
  }
};

// ✅ 2. جلب جميع الفيديوهات
const getVideos = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const videos = await HowToUseCaro.find().sort({ createdAt: -1 });

    // تنسيق البيانات لإرجاع الـ id مع الـ url
    const formattedData = videos.map(doc => ({
      id: doc._id,
      url: doc.videos[0].url
    }));

    return res.status(200).json({
      status: true,
      code: 200,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// ✅ 3. حذف فيديو محدد
const deleteVideo = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { id } = req.params;

    const videoDoc = await HowToUseCaro.findById(id);
    if (!videoDoc) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: lang === 'ar' ? 'الفيديو غير موجود' : 'Video not found'
      });
    }

    // حذف الملف من السيرفر فعلياً
    const fileUrl = videoDoc.videos[0].url;
    const filePath = path.join(__dirname, '..', fileUrl.replace(process.env.BASE_URL || 'http://localhost:3000', ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // حذف الوثيقة من قاعدة البيانات
    await HowToUseCaro.findByIdAndDelete(id);

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? 'تم حذف الفيديو بنجاح' : 'Video deleted successfully',
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  addVideo,
  getVideos,
  deleteVideo
};