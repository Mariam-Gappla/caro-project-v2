const carRental = require("../models/carRental");
const { carRentalWeeklyValiditionSchema, rentToOwnSchema, carRentalWeeklyValiditionUpdateSchema, rentToOwnUpdateSchema } = require("../validation/carRentalValidition");
const getMessages = require("../configration/getmessages");
const Name = require("../models/carName");
const Reel = require("../models/reels");
const Model = require("../models/carModel");
const rentalOfficeOrder = require("../models/rentalOfficeOrders");
const { saveImage } = require("../configration/saveImage");
const carRentalArchive = require("../models/carArchive");
const path = require("path");
const fs = require("fs");
const addCar = async (req, res, next) => {
  try {
    const files = req.files || [];
    const imageBuffers = req.files || [];
    const lang = req.headers['accept-language'] || 'en';
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/';
    // ⏰ نحفظ اسم الصورة مرة واحدة لكل صورة
    const imagePaths = [];
     let videoPath;
    const fileInfos = files.map(file => {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join('/var/www/images', fileName);
      imagePaths.push(`${BASE_URL}images/${fileName}`);
      return { fileName, filePath, buffer: file.buffer };
    });
    console.log(imagePaths);
    const { rentalType } = req.body;
    if (rentalType == "weekly/daily") {
       console.log(req.body);
      const { error } = carRentalWeeklyValiditionSchema(lang).validate({
        ...req.body,
        images: imagePaths,
      });
      if (error) {
        return res.status(400).send({
          code: 400,
          status: false,
          message: error.details[0].message
        });
      }
      const video = req.files.video;
      let videoPath;
      if (video && video.length === 1) {
        videoPath = `${BASE_URL}${saveImage(video[0])}`;
      }
      await carRental.create({
       ...req.body,
       images: imagePaths,
        rentalOfficeId: req.user.id,
        videoCar: videoPath
      });

    }
    else if (rentalType == "rent to own") {
      const { error } = rentToOwnSchema(lang).validate({
        ...req.body,
        images: imagePaths,
      });
      if (error) {
        return res.status(400).send({
          code: 400,
          status: false,
          message: error.details[0].message
        });
      }
      const video = req.files.video;
      if (video && video.length === 1) {
        videoPath = `${BASE_URL}${saveImage(video[0])}`;
      }
      await carRental.create({
        title: req.body.title,
        rentalType: req.body.rentalType,
        images: imagePaths,
        nameId: req.body.nameId,
        modelId: req.body.modelId,
        carTypeId: req.body.carTypeId,
        licensePlateNumber: req.body.licensePlateNumber,
        carPrice: req.body.carPrice,
        monthlyPayment: req.body.monthlyPayment,
        odoMeter: req.body.odoMeter,
        finalPayment: req.body.finalPayment,
        city: req.body.city,
        area: req.body.area,
        carDescription: req.body.carDescription,
        deliveryOption: req.body.deliveryOption,
        ownershipPeriod: req.body.ownershipPeriod,
        rentalOfficeId: req.user.id,
        videoCar: videoPath
      });
    }
    // 💾 احفظ الملفات باستخدام الأسماء اللي جهزناها
    fileInfos.forEach(file => {
      fs.writeFileSync(file.filePath, file.buffer);
      console.log('Saved file at:', file.filePath);
    });
    if (videoPath) {
      await Reel.create({
        video: post.video,
        title: post.title,
        createdBy: post.userId
      });
    }



    return res.status(200).send({
      code: 200,
      status: true,
      message: lang == "ar" ? "تم اضافه السياره بنجاح" : "car added successfully"
    });
  } catch (err) {
    console.error("🔥 Error inside addCar:", err);
    next(err);
  }
}
const getCarsByRentalOfficeForUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lang = req.headers['accept-language'] || 'en';
    const messages = getMessages(lang);

    // 📌 pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 📌 جايب rentalType من query
    const rentalType = req.query.rentalType; // مثال: weekly/daily أو rent to own
    const search = req.query.search;
    // 📌 بناء الفلتر
    const filter = { rentalOfficeId: id };
    if (rentalType) {
      filter.rentalType = rentalType;
    }
    if (search) {
      filter.title = search;
    }

    // 📌 اجمالي عدد العربيات
    const totalCars = await carRental.countDocuments(filter);

    // 📌 العربيات بحد pagination
    const cars = await carRental.find(filter)
      .skip(skip)
      .limit(limit);

    if (!cars || cars.length === 0) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: messages.rentalOffice.haveCars
      });
    }

    const formattedCars = await Promise.all(
      cars.map(async (car) => {
        const name = await Name.findById(car.nameId).lean();
        const model = await Model.findById(car.modelId).lean();

        let formattedOrder = {};

        if (car.rentalType === "weekly/daily") {
          formattedOrder = {
            id: car._id,
            title: car.title,
            rentalType: car.rentalType,
            images: car.images,
            carDescription: car.carDescription,
            carModel: lang == "en" ? model?.model?.en : model?.model?.ar,
            city: car.city,
            odoMeter: car.odoMeter,
            pricePerExtraKilometer: car.pricePerExtraKilometer,
            pricePerFreeKilometer: car.pricePerFreeKilometer
          };
        } else if (car.rentalType === "rent to own") {
          formattedOrder = {
            id: car._id,
            title: car.title,
            rentalType: car.rentalType,
            images: car.images,
            carDescription: car.carDescription,
            ownershipPeriod: car.ownershipPeriod,
            price: car.carPrice,
            finalPayment: car.finalPayment,
            carModel: lang == "en" ? model?.model?.en : model?.model?.ar,
            city: car.city,
            monthlyPayment: car.monthlyPayment,
            odoMeter: car.odoMeter
          };
        }

        return formattedOrder;
      })
    );

    return res.status(200).send({
      code: 200,
      status: true,
      message: lang == "en"
        ? "Your request has been completed successfully"
        : "تمت معالجة الطلب بنجاح",
      data: {
        cars: formattedCars,
        pagination: {
          page: page,
          totalPages: Math.ceil(totalCars / limit),
        }
      }
    });

  } catch (err) {
    next(err);
  }
};
const getCarById = async (req, res, next) => {
  try {
    const carId = req.params.id;
    const lang = req.headers['accept-language'] || 'en';
    const messages = getMessages(lang);
    const car = await carRental.findOne({ _id: carId }).populate("nameId").populate("modelId").populate("carTypeId").lean();
    console.log(car)
    if (!car) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: messages.rentalCar.existCar
      })
    }
    const name = await Name.findOne({ _id: car.nameId });
    const model = await Model.findOne({ _id: car.modelId });
    let formatedData;
    const { __v, rentalOfficeId, nameId, modelId, carTypeId, ...data } = car;
    if (car.rentalType == "weekly/daily") {
      formatedData = {
        ...data,
        nameId: {
          id: nameId._id,
          carName: lang == "en" ? nameId.carName.en : nameId.carName.ar
        },
        modelId: {
          id: modelId._id,
          model: lang == "en" ? modelId.model.en : modelId.model.ar
        },
        carTypeId: {
          id: carTypeId._id,
          type: lang == "en" ? carTypeId.type.en : carTypeId.type.ar
        },
      }
    }
    else {
      formatedData = {
        ...data,
        nameId: {
          id: nameId._id,
          carName: lang == "en" ? nameId.carName.en : nameId.carName.ar
        },
        modelId: {
          id: modelId._id,
          model: lang == "en" ? modelId.model.en : modelId.model.ar
        },
        carTypeId: {
          id: carTypeId._id,
          type: lang == "en" ? carTypeId.type.en : carTypeId.type.ar
        },
      }

    }
    return res.status(200).send({
      status: true,
      code: 200,
      message: lang == "en" ? "Your request has been completed successfully" : "تمت معالجة الطلب بنجاح",
      data: formatedData
    })
  }
  catch (err) {
    next(err)
  }
}
const updateCar = async (req, res, next) => {
  try {
    const id = req.params.id;
    const lang = req.headers['accept-language'] || 'en';
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/';
    const messages = getMessages(lang);

    const imageBuffers = req.files || [];

    // 1. جيب العربية المرتبطة بالمستخدم الحالي
    const car = await carRental.findOne({ _id: id, rentalOfficeId: req.user.id });
    if (!car) {
      return res.status(404).send({
        status: false,
        message: lang === "en" ? "Car not found" : "السيارة غير موجودة"
      });
    }

    // 2. جهزي الصور اللي عايز يحذفها
    const imagesToDelete = req.body.imagesToDelete
      ? Array.isArray(req.body.imagesToDelete)
        ? req.body.imagesToDelete
        : [req.body.imagesToDelete]
      : [];

    // 3. حذف الصور من السيرفر
    imagesToDelete.forEach(imgUrl => {
      const fileName = imgUrl.split('/').pop();
      const filePath = path.join('/var/www/images', fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    // 4. الصور القديمة اللي هتفضل بعد الحذف
    let updatedImages = car.images.filter(img => !imagesToDelete.includes(img));

    // 5. جهزي الصور الجديدة
    const fileInfos = imageBuffers.map(file => {
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join('/var/www/images', fileName);
      updatedImages.push(BASE_URL + fileName);
      return { fileName, filePath, buffer: file.buffer };
    });

    // 6. اختاري الـ schema المناسب حسب rentalType
    const rentalType = req.body.rentalType || car.rentalType;

    const schema = rentalType === "weekly/daily"
      ? carRentalWeeklyValiditionUpdateSchema(lang)
      : rentToOwnUpdateSchema(lang);

    const { error } = schema.validate({ ...req.body, images: updatedImages });
    if (error) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: error.details[0].message
      });
    }

    // 7. تحديث بيانات السيارة
    await carRental.updateOne(
      { _id: id },
      {
        $set: {
          ...req.body,
          images: updatedImages
        }
      }
    );

    // 8. حفظ الصور الجديدة على السيرفر
    fileInfos.forEach(file => {
      fs.writeFileSync(file.filePath, file.buffer);
    });

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en" ? "Car updated successfully" : "تم تحديث السيارة بنجاح"
    });

  } catch (err) {
    next(err);
  }
};
const deleteCar = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const id = req.params.id;

    const car = await carRental.findOne({ _id: id });
    if (!car) {
      return res.status(404).send({
        status: false,
        code: 404,
        message: lang == "ar" ? "السيارة غير موجودة" : "Car not found"
      });
    }

    // تحويل الكائن وحذف _id
    const carData = car.toObject();
    delete carData._id;

    // حفظ في الأرشيف
    const archivedCar = await carRentalArchive.create({
      ...carData,
      originalCarId: car._id
    });

    // تحديث الطلبات
    await rentalOfficeOrder.updateMany(
      { carId: car._id },
      { $set: { archivedCarId: archivedCar._id } }
    );

    // حذف من الجدول الأصلي
    await carRental.findOneAndDelete({ _id: id });

    return res.status(200).send({
      code: 200,
      status: true,
      message: lang == "ar" ? "تم حذف الاعلان بنجاح" : "Car listing deleted successfully"
    });

  } catch (error) {
    next(error);
  }
};
const getSearchCar = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const messages = getMessages(lang);

    const searchQuery = req.query.name || '';

    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ابني الفلتر حسب اللغة
    let nameFilter = {};
    if (lang === "ar") {
      nameFilter["carName.ar"] = { $regex: searchQuery, $options: "i" };
    } else {
      nameFilter["carName.en"] = { $regex: searchQuery, $options: "i" };
    }

    // هات الأسماء
    const names = await Name.find(nameFilter).lean();
    if (!names.length) {
      return res.status(400).send({
        code: 400,
        status: false,
        message: lang === "en"
          ? "No car names match your search"
          : "لا توجد أسماء سيارات تطابق بحثك"
      });
    }

    // هات كل الـ nameIds
    const nameIds = names.map(n => n._id);

    // هات العربيات مع pagination
    const totalCars = await carRental.countDocuments({ nameId: { $in: nameIds } });
    const cars = await carRental.find({ nameId: { $in: nameIds } })
      .skip(skip)
      .limit(limit)
      .lean();
    // format
    const formattedCars = await Promise.all(
      cars.map(async (car) => {
        const name = names.find(n => n._id.toString() === car.nameId.toString());
        const model = await Model.findById(car.modelId).lean();

        let formattedOrder = {};
        if (car.rentalType === "weekly/daily") {
          formattedOrder = {
            title: lang === "ar"
              ? `تأجير سيارة ${name?.carName?.ar || ""} ${model?.model?.ar || ""}`
              : `Renting a car ${name?.carName?.en || ""} ${model?.model?.en || ""}`,
            rentalType: car.rentalType,
            images: car.images,
            carDescription: car.carDescription,
            carModel: lang === "en" ? model?.model?.en : model?.model?.ar,
            city: car.city,
            odoMeter: car.odoMeter,
            pricePerExtraKilometer: car.pricePerExtraKilometer,
            pricePerFreeKilometer: car.pricePerFreeKilometer
          };
        } else if (car.rentalType === "rent to own") {
          formattedOrder = {
            title: lang === "ar"
              ? `تملك سيارة ${name?.carName?.ar || ""} ${model?.model?.ar || ""}`
              : `Owning a car ${name?.carName?.en || ""} ${model?.model?.en || ""}`,
            rentalType: car.rentalType,
            images: car.images,
            carDescription: car.carDescription,
            ownershipPeriod: car.ownershipPeriod,
            price: car.carPrice,
            finalPayment: car.finalPayment,
            carModel: lang === "en" ? model?.model?.en : model?.model?.ar,
            city: car.city,
            monthlyPayment: car.monthlyPayment,
            odoMeter: car.odoMeter
          };
        }

        return formattedOrder;
      })
    );

    return res.status(200).send({
      code: 200,
      status: true,
      message: lang === "en"
        ? "Your request has been completed successfully"
        : "تمت معالجة الطلب بنجاح",
      data: formattedCars,
      pagination: {
        page,
        totalPages: Math.ceil(totalCars / limit)
      },
    });

  } catch (err) {
    next(err);
  }
};


module.exports = {
  addCar,
  getCarsByRentalOfficeForUser,
  getCarById,
  updateCar,
  getSearchCar,
  deleteCar
}