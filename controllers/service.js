const Service = require("../models/service");
const {saveImage} = require("../configration/saveImage");
// const addService = async (req, res, next) => {
//     try {
//         const lang = req.headers["accept-language"] || "en";
//         const mainCategoryId = req.params.id;
//         const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
//         const { nameEn, nameAr } = req.body;
//         if (!nameEn || !nameAr) {
//             return res.status(400).send({
//                 status: false,
//                 code: 400,
//                 message: lang == "en" ? "service name required in english and arabic" : "اسم الخدمه مطلوب بالعربى والانجليزى"
//             })
//         }
//         const file = req.file;
//         if (!file) {
//             return res.status(200).send({
//                 status: false,
//                 code: 400,
//                 message: lang == "en" ? "service image required" : "صوره الخدمه مطلوبه"
//             })
//         }
//         let imagePath = BASE_URL + saveImage(file)
//         await Service.create({
//             name: { en: nameEn, ar: nameAr },
//            mainCategoryCenterId: mainCategoryId,
//             image: imagePath
//         })
//         return res.status(200).send({
//             status: true,
//             code: 200,
//             message: lang === "ar" ? "تم اضافه الخدمه بنجاح" : "service added successfully"
//         });


//     }
//     catch (err) {
//         next(err);
//     }
// }
const addService = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const mainCategoryId = req.params.id;
        const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

        // --- دعم الطريقتين (JSON و FormData) ---
        // هذا الجزء يحل مشكلة "يجب أن تكون قائمة من المعرفات"
        if (req.body.services && typeof req.body.services === 'string') {
            try {
                req.body.services = JSON.parse(req.body.services);
            } catch (e) {
                // إذا أرسل معرف واحد فقط كنص عدي
                req.body.services = [req.body.services];
            }
        }

        // تحويل الأسماء إذا كانت واصلة كـ String Object من Flutter
        if (typeof req.body.name === 'string') {
            try {
                req.body.name = JSON.parse(req.body.name);
            } catch (e) {}
        }
        // ---------------------------------------

        // استخراج القيم (دعم المباشر أو داخل object)
        const nameEn = req.body.nameEn || (req.body.name && req.body.name.en);
        const nameAr = req.body.nameAr || (req.body.name && req.body.name.ar);

        if (!nameEn || !nameAr) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang == "en" ? "service name required" : "اسم الخدمه مطلوب بالعربى والانجليزى"
            });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang == "en" ? "service image required" : "صوره الخدمه مطلوبه"
            });
        }

        let imagePath = BASE_URL + saveImage(file);

        // الحفظ بناءً على الـ Schema الخاصة بك
        await Service.create({
            name: { en: nameEn, ar: nameAr },
            mainCategoryCenterId: mainCategoryId,
            image: imagePath
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "ar" ? "تم اضافه الخدمه بنجاح" : "service added successfully"
        });

    } catch (err) {
        // إذا كان الخطأ بسبب الـ Validation (Joi)
        if (err.isJoi || err.name === 'ValidationError') {
            return res.status(400).send({
                status: false,
                code: 400,
                message: err.message || (lang === 'ar' ? "خطأ في البيانات المرسلة" : "Validation Error")
            });
        }
        next(err);
    }
}
const getServicesInCenter = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const centerId=req.params.id;
        const services=await Service.find({mainCategoryCenterId:centerId});
        const formatedServices=services.map((service)=>{
            return {
                id:service._id,
                text:service.name[lang],
                image:service.image
            }
        })
        return res.status(200).send({
            status:true,
            code:200,
            message:lang=="en"?"services retrieved successfully":"تم استرجاع الخدمات بنجاح",
            data:formatedServices
        })

    }
    catch {
        next(err)
    }
}
module.exports = { addService, getServicesInCenter }
