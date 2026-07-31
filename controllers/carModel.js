const carModel = require("../models/carModel");
const carName = require('../models/carName');
const CarType = require('../models/carType');

const addModel = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] === 'ar' ? 'ar' : 'en';
    const data = req.body;

    // ✅ 1. إضافة جماعية لسنوات الموديل
    if (Array.isArray(data)) {
      const formattedModels = data.map(item => ({
        typeId: item.typeId, 
        model: {
          en: item.model_en,
          ar: item.model_ar
        }
      }));

      await carModel.insertMany(formattedModels);

      return res.status(200).send({
        status: true,
        code: 200,
        message: lang == "ar" ? "تم إضافة قائمة الموديلات بنجاح" : "Car models list added successfully"
      });
    }

    // ✅ 2. الإضافة الفردية الأصلية
    const { typeId, model_en, model_ar } = req.body;
    if (!typeId || !model_ar || !model_en) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang == "en" ? "Please provide typeId and model" : "من فضلك ادخل الموديل ومعرف النوع"
      });
    }

    await carModel.create({
      typeId,
      model: { en: model_en, ar: model_ar }
    });

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? 'تم إضافة الموديل بنجاح.' : 'Model added successfully.',
    });

  } catch (err) {
    next(err)
  }
};
const getModels = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] === 'ar' ? 'ar' : 'en';
    const { typeId } = req.body;

    if (!typeId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "من فضلك ادخل معرف نوع العربيه" : "Please provide typeId"
      });
    }

    const carModels = await carModel.find({typeId});
    const formattedModels = carModels.map(model => ({
      id: model._id,
      text: lang === 'ar' ? model.model.ar : model.model.en
    }));

    const message = lang === 'ar'
      ? 'تم جلب الموديلات بنجاح.'
      : 'Models fetched successfully.';

    return res.status(200).send({
      status: true,
      code: 200,
      message,
      data: formattedModels
    });

  } catch (err) {
    next(err);
  }
};

const getModel = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] === 'ar' ? 'ar' : 'en';
    const { typeId } = req.params;

    if (!typeId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "من فضلك ادخل معرف نوع العربيه" : "Please provide typeId"
      });
    }

    const carModels = await carModel.find({typeId});
    const formattedModels = carModels.map(model => ({
      id: model._id,
      text: lang === 'ar' ? model.model.ar : model.model.en
    }));

    const message = lang === 'ar'
      ? 'تم جلب الموديلات بنجاح.'
      : 'Models fetched successfully.';

    return res.status(200).send({
      status: true,
      code: 200,
      message,
      data: formattedModels
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  addModel,
  getModels,
  getModel
}