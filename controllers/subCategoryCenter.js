const SubCategoryCenter= require("../models/subCategoryCenter");
const MainCategoryCenter = require("../models/mainCategoryCenter"); 

const addSubCategoryCenter = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const { nameEn, nameAr, mainCategoryCenterId } = req.body;

        if (!nameEn || !nameAr || !mainCategoryCenterId) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "en" ? "All fields are required" : "جميع الحقول مطلوبة"
            });
        }

        // 2. 🔥 التعديل هنا: استخدم الموديل (MainCategoryCenter) وليس المتغير
        const mainCategoryExists = await MainCategoryCenter.findById(mainCategoryCenterId);
        
        if (!mainCategoryExists) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang === "en" ? "Main Category not found" : "التصنيف الرئيسي غير موجود"
            });
        }

const existingCategory = await SubCategoryCenter.findOne({
    mainCategoryCenterId: mainCategoryCenterId, // ابحث فقط داخل هذا القسم
    $or: [
        { "name.en": nameEn },
        { "name.ar": nameAr }
    ]
});

if (existingCategory) {
    return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "Sub category already exists in this main category" : "اسم التصنيف الفرعي موجود بالفعل في هذا التصنيف الرئيسي"
    });
}

        await SubCategoryCenter.create({
            name: { en: nameEn, ar: nameAr },
            mainCategoryCenterId
        });

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Sub category created successfully" : "تم إنشاء التصنيف الفرعي بنجاح"
        });
    } catch (err) {
        next(err);
    }
}
const getAllSubCategoryCenter=async(req,res,next)=>{
    try{
        const lang=req.headers["accept-language"] || "en";
        const mainCategoryCenterId=req.params.id;
        const subCategories=await SubCategoryCenter.find({mainCategoryCenterId});
        const formattedCategories=subCategories.map(cat=>({id:cat._id,text:cat.name[lang]}));
        return res.status(200).send({
            status:true,
            code:200,
            message:lang==="en"?"sub categories retrieved successfully":"تم استرجاع التصنيفات الفرعية بنجاح",
            data:formattedCategories
        });
    }
    catch(err){
        next(err);
    }
}


// ✅ دالة حذف تصنيف فرعي محدد
const deleteSubCategoryCenter = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";
        const { id } = req.params; // سنستقبل المعرف من الرابط

        // 1. البحث عن القسم والتأكد من وجوده قبل الحذف
        const subCategory = await SubCategoryCenter.findById(id);
        
        if (!subCategory) {
            return res.status(404).send({
                status: false,
                code: 404,
                message: lang === "en" ? "Sub category not found" : "التصنيف الفرعي غير موجود"
            });
        }

        // 2. تنفيذ عملية الحذف
        await SubCategoryCenter.findByIdAndDelete(id);

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Sub category deleted successfully" : "تم حذف التصنيف الفرعي بنجاح"
        });
    } catch (err) {
        // التعامل مع أخطاء الـ ID غير الصحيح (CastError)
        next(err);
    }
};

module.exports={
    addSubCategoryCenter,
    getAllSubCategoryCenter,
    deleteSubCategoryCenter
};
