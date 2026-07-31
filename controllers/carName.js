const CarName = require("../models/carName");
const {saveImage}=require("../configration/saveImage");
const addName = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const data = req.body;

    // 1. حالة المصفوفة (Array)
    if (Array.isArray(data)) {
      const formattedNames = data.map(item => ({
        carName: { 
          en: item.name_en, 
          ar: item.name_ar 
        },
        // نستخدم || للتعامل مع Image كابيتال أو سمول
        image: item.image || item.Image 
      }));

      await CarName.insertMany(formattedNames, { ordered: false });

      return res.status(200).send({
        status: true,
        code: 200,
        message: lang == "ar" ? "تم إضافة قائمة الشركات بنجاح" : "Car brands list added successfully"
      });
    }

    // 2. حالة الكائن الواحد (Single Object)
    const { name_en, name_ar } = req.body;
    // نبحث عن الرابط في الـ body أولاً (مثل الجيسون اللي أرسلته)
    let imageUrl = req.body.image || req.body.Image; 

    if (!name_en || !name_ar) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "ar" ? "من فضلك أدخل اسم السيارة باللغتين" : "Please provide car name in both languages"
      });
    }

    // إذا لم يوجد رابط في الـ body، نبحث عن ملف مرفوع
    if (!imageUrl && req.file) {
      let savedPath = saveImage(req.file);
      imageUrl = `${process.env.BASE_URL}${savedPath}`;
    }

    // إذا لم يوجد لا رابط ولا ملف، نرجع الخطأ
    if (!imageUrl) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "ar" ? "الصورة مطلوبة" : "Image is required"
      });
    }

    await CarName.create({
      carName: { en: name_en, ar: name_ar },
      image: imageUrl
    });

    return res.send({
      status: true,
      code: 200,
      message: lang == "ar" ? "تم إضافة اسم السيارة بنجاح" : "Car name added successfully"
    });

  } catch (error) {
    next(error);
  }
};
const getNames = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const rawNames = await CarName.find({});
    // تغيير شكل النتائج
    const names = rawNames.map((n) => ({
      id: n._id,
      text: lang === 'ar' ? n.carName.ar : n.carName.en,
      image:n.image
    }));

    return res.send({
      status: true,
      code: 200,
      message:
        lang === "en"
          ? "Your request has been completed successfully"
          : "تمت معالجة الطلب بنجاح",
      data: names

    });
  } catch (error) {
    next(error);
  }
};

const deleteName = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    // استلام الآيدي من الرابط بعد السلاش
    const { id } = req.params; 

    // البحث والحذف
    const deletedItem = await CarName.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).send({
        status: false,
        code: 404,
        message: lang === "ar" ? "العنصر غير موجود بالفعل" : "Item not found"
      });
    }

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "ar" ? "تم حذف اسم السيارة بنجاح" : "Car name deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};
module.exports = {
  addName,
  getNames,
  deleteName
}