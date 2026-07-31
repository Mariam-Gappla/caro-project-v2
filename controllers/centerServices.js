const CenterService = require("../models/centerServices");
const {saveImage} = require("../configration/saveImage");
const User=require("../models/user");
const followerCenter=require("../models/followerCenter");
const centerServiceSchema = require("../validation/centerServices");
const mongoose = require('mongoose');
// const addCenterService = async (req, res, next) => {
//     try {
//         const lang = req.headers['accept-language'] || 'en';
//         const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/';
//         const userId = req.user.id;

//         // 🟢 تجهيز اللوكيشن
//         req.body.location = {
//             lat: Number(req.body['location.lat']),
//             long: Number(req.body['location.long'])
//         };
//         delete req.body['location.lat'];
//         delete req.body['location.long'];

//         // 🟢 فاليـديشن
//         const { error } = centerServiceSchema(lang).validate({
//             ...req.body
//         });
//         if (error) {
//             return res.status(400).send({
//                 code: 400,
//                 status: false,
//                 message: error.details[0].message
//             });
//         }

//         // 🟢 تحقق لو الخدمه موجوده قبل كده
//         const existenceCenterService = await CenterService.findOne({ centerId: userId });
//         if (existenceCenterService) {
//             return res.status(400).send({
//                 status: false,
//                 code: 400,
//                 message: lang == "en"
//                     ? "you add your service and allow for you one service"
//                     : "انت قمت بإضافه خدمه من قبل وهو مسموح لك بخدمه واحده"
//             });
//         }

//         // 🟢 الصور
//         let images = [];
//         if (req.files["images"]) {
//             const imageUrls = req.files["images"].map(file => BASE_URL + saveImage(file));
//             if (imageUrls) {
//                 const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
//                 images = [...urls];
//             }
//         }

//         // 🟢 الفيديو (يسمح بواحد فقط)
//         if (req.files["video"] && req.files["video"].length > 1) {
//             return res.status(400).send({
//                 status: false,
//                 code: 400,
//                 message: lang == "en" ? "you can upload max 1 video" : "يمكنك رفع فيديو واحد فقط"
//             });
//         }

//         let video = null;
//         if (req.files["video"]) {
//             const uploadedVideo = req.files["video"];
//             const file = Array.isArray(uploadedVideo) ? uploadedVideo[0] : uploadedVideo;

//             // ✅ تحقق انه فيديو
//             if (!file.mimetype.startsWith("video/")) {
//                 return res.status(400).send({
//                     status: false,
//                     code: 400,
//                     message: lang == "en"
//                         ? "Uploaded file must be a video"
//                         : "الملف المرفوع يجب أن يكون فيديو"
//                 });
//             }

//             // (اختياري) تحقق من الامتداد
//             const allowedExt = ["mp4", "mov", "avi", "mkv"];
//             const ext = file.originalname.split(".").pop().toLowerCase();
//             if (!allowedExt.includes(ext)) {
//                 return res.status(400).send({
//                     status: false,
//                     code: 400,
//                     message: lang == "en"
//                         ? "Video format not supported"
//                         : "صيغة الفيديو غير مدعومة"
//                 });
//             }

//             // حفظ الفيديو
//             video = BASE_URL + saveImage(file);
//         }

//         // 🟢 إنشاء الخدمة
//         const newService = await CenterService.create({
//             products: images,
//             services: req.body.services.map(id => new mongoose.Types.ObjectId(id)),
//             centerId: userId,
//             location: req.body.location,
//             details: req.body.details,
//             video: video
//         });

//         // 🟢 تجربة populate
//         const test = await CenterService.findOne({ centerId: userId }).populate("services");
//         console.log("Populated services:", test.services);

//         return res.status(200).send({
//             status: true,
//             code: 200,
//             message: lang == "en"
//                 ? "Your service has been added successfully"
//                 : "تم اضافه خدمتك بنجاح"
//         });

//     } catch (err) {
//         next(err);
//     }
// };
const addCenterService = async (req, res, next) => {
    try {

        const lang = req.headers['accept-language'] || 'en';
        const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/';
        const userId = req.user.id;

        // 1. دعم خدمات Flutter (JSON أو String)
        if (req.body.services && typeof req.body.services === 'string') {
            try {
                req.body.services = JSON.parse(req.body.services);
            } catch (e) {
                req.body.services = req.body.services.split(',').map(s => s.trim());
            }
        }

        // 2. تجهيز اللوكيشن
        req.body.location = {
            lat: Number(req.body['location.lat']),
            long: Number(req.body['location.long'])
        };
        
        // 3. الفاليديشن (تنظيف الكائن قبل الفحص)
        const bodyToValidate = { ...req.body };
        delete bodyToValidate['location.lat'];
        delete bodyToValidate['location.long'];
        delete bodyToValidate['video']; 

        const { error } = centerServiceSchema(lang).validate(bodyToValidate);
        if (error) {
            return res.status(400).send({
                code: 400, status: false, message: error.details[0].message
            });
        }

        // 4. التحقق من وجود خدمة سابقة
        const existenceCenterService = await CenterService.findOne({ centerId: userId });
        if (existenceCenterService) {
            return res.status(400).send({
                status: false, code: 400,
                message: lang == "en" ? "Service already exists" : "انت قمت بإضافه خدمه من قبل"
            });
        }

        // 5. معالجة الصور (Images -> Products)
        let images = [];
        if (req.files && req.files["images"]) {
            images = req.files["images"].map(file => BASE_URL + saveImage(file));
        }

        // 6. 🟢 معالجة الفيديو (التعديل الجذري هنا) 🟢
let videoUrl = null;

// أولاً: البحث في الملفات المرفوعة (لو الفرونت أرسله كـ File)
if (req.files && req.files["video"] && req.files["video"][0]) {
    videoUrl = BASE_URL + saveImage(req.files["video"][0]);
} 
// ثانياً: البحث في الـ Body (لو الفرونت أرسله كـ String مسار)
else if (req.body.video && typeof req.body.video === 'string' && req.body.video.length > 5) {
    // هنا نعتبر أن النص المرسل هو رابط الفيديو فعلاً
    videoUrl = req.body.video; 
}

// 7. التأكد من أن الفيديو توفر بأي طريقة كانت
if (!videoUrl) {
    return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "en" ? "Video is required" : "ملف الفيديو مطلوب"
    });
}
        // 8. الحفظ النهائي
        await CenterService.create({
            products: images,
            services: req.body.services.map(id => new mongoose.Types.ObjectId(id)),
            centerId: userId,
            location: req.body.location,
            details: req.body.details,
            video: videoUrl
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "en" ? "Added successfully" : "تم اضافه خدمتك بنجاح"
        });

    } catch (err) {
        console.error("Error in addCenterService:", err);
        next(err);
    }
};
const getCenterServiceByCenterId = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const userId=req.user.id
        const centerServiceId = req.params.id;
        const centerService = await CenterService.findOne({ centerId: centerServiceId }).populate("services").lean();   
        if(!centerService)
        {
            return res.status(400).send({
                status:false,
                code:400,
                message:lang=="ar"?"لا توجد خدمات لهذا المركر":"this center does not have services"
            })
        }
        if (userId && userId !== centerServiceId) {
            try {
                // محاولة إنشاء سجل زيارة فريد (Unique)
                // تأكد أن موديل StoreVisitor يستخدم storeId و visitorId كما في الكود السابق
                await StoreVisitor.create({
                    storeId: centerServiceId,
                    visitorId: userId
                });

                // إذا لم يحدث خطأ (Duplicate)، يعني هذه أول زيارة للمستخدم لهذا المركز
                await User.findByIdAndUpdate(
                    centerServiceId,
                    { $inc: { storeVisitorsCount: 1 } }
                );
            } catch (err) {
                // إذا كان الخطأ Duplicate Key (زار مسبقاً) نتجاهله ولا نزيد العداد
                console.log("User already visited this center before.");
            }
        }
        const user = await User.findOne({_id: centerServiceId}).populate("cityId").lean();
        const { services, ...rest } = centerService;
        const follower = await followerCenter.findOne({ userId, centerId: centerServiceId });
        const formatedServices = services.map((ser) => {
            return {
                id: ser._id,
                name: ser.name[lang],
                image: ser.image
            }
        })
        centerService.services = formatedServices;
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "en" ? "Your request has been completed successfully" : "تمت معالجة الطلب بنجاح",
            data: {
                id: centerService._id,
                username:user.username,
                image:user.image,
                phone:user.phone,
                location:centerService.location,
                whatsAppNumber:user.whatsAppNumber,
                details: centerService.details,
                video:centerService.video || "",
                services: centerService.services,
                products: centerService.products,
                city: user.cityId?.name?.[lang] || '',
                isfollowed: follower ? true : false,
                visitorsCount: user.storeVisitorsCount || 0
            }
        })

    }
    catch (err) {
        next(err)
    }
}
module.exports = {
    addCenterService,
    getCenterServiceByCenterId
}