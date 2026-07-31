const review = require("../models/ratingForOrder");
const ratingSchemaValidation = require("../validation/ratingForRentalOfficeValidition");
const rentalOfficeOrder = require("../models/rentalOfficeOrders");
const serviceProviderOrders = require("../models/serviceProviderOrders");
const RatingPost=require("../models/ratingPost")
const getMessages = require("../configration/getmessages");
const addRatingForOrderToRentalOffice = async (req, res, next) => {
    try {
        console.log("addRatingForOrderToRentalOffice");
        const lang = req.headers['accept-language'] || 'en';
        const messages = getMessages(lang);
        const userId = req.user.id;
        const { error } = ratingSchemaValidation.ratingSchemaValidation(lang).validate(req.body);
        if (error) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: error.details[0].message
            });
        }
        const { orderId, rating, comment } = req.body;
        const existOrder = await rentalOfficeOrder.findById(orderId)
        if (!existOrder) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: messages.order.notExist
            });
        }
        const existingRating = await review.findOne({ userId, orderId });
        if (existingRating) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: messages.rating.alreadyRated
            });
        }
        console.log(existOrder.paymentStatus, existOrder.isAvailable);
        if (existOrder.paymentStatus == 'paid' && existOrder.isAvailable == true) {
            const ratingData = {
                userId: userId,
                orderId: orderId,
                targetId: existOrder.rentalOfficeId,
                targetType: "rentalOffice",
                rating,
                comment
            }
            await review.create(ratingData);
            return res.status(200).send({
                status: true,
                code: 200,
                message: messages.rating.success
            });
        }
        return res.status(400).send({
            status: false,
            code: 400,
            message: messages.rating.invalidOrder
        });

    }
    catch (error) {
        next(error);
    }
}
const addRatingForOrderToServiceProvider = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const messages = getMessages(lang);
        const userId = req.user.id;
        const { orderId, rating, comment } = req.body;
        const { error } = ratingSchemaValidation.ratingSchemaValidation(lang).validate({ orderId, rating, comment });
        if (error) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: error.details[0].message
            });
        }
        const existOrder = await serviceProviderOrders.findById(orderId);
        if (!existOrder) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: messages.order.notExist
            });
        }
        if (!existOrder.providerId) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: lang == "en"
                    ? "The provider has not yet accepted the order. Please wait for approval."
                    : "لم يقم الموفر بعد بالموافقة على الطلب. يرجى الانتظار حتى تتم الموافقة"
            });
        }
        const existingRating = await review.findOne({ userId, orderId });
        if (existingRating) {
            return res.status(400).send({
                status: false,
                code: 400,
                message: messages.rating.alreadyRated
            });
        }
        if (existOrder.paymentStatus == 'paid') {
            const ratingData = {
                userId: userId,
                orderId: orderId,
                targetId: existOrder.providerId,
                targetType: "serviceProvider",
                rating,
                comment
            }
            await review.create(ratingData);
            return res.status(200).send({
                status: true,
                code: 200,
                message: messages.rating.success
            });
        }
        return res.status(400).send({
            status: false,
            code: 400,
            message: messages.rating.invalidOrder
        });
    }
    catch (error) {
        next(error);
    }
}
const getratingbyrentalOffice = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const messages = getMessages(lang);
        const rentalOfficeId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // 🔢 get total count of ratings
        const totalCount = await review.countDocuments({
            targetId: rentalOfficeId,
            targetType: 'rentalOffice'
        });
        const ratings = await review.find({ targetId: rentalOfficeId, targetType: 'rentalOffice' })
            .populate('userId')
            .select('rating comment createdAt')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        const customizedRatings = ratings.map(rating => {
            const user = rating.userId.toObject();
            return {
                username: user.username,
                image: user.image,
                rating: rating.rating,
                comment: rating.comment ?? " ",
                createdAt: rating.createdAt
            };
        }
        );
        console.log(customizedRatings)
        //customizedRatings,
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "en" ? "Your request has been completed successfully" : "تمت معالجة الطلب بنجاح",
            data: {
                rating: customizedRatings,
                pagination: {
                    page: page,
                    totalPages: Math.ceil(totalCount / limit),
                }
            }
        });
    } catch (error) {
        next(error);
    }
}
const getRatingByServiceProvider = async (req, res, next) => {
    try {
        const lang = req.headers['accept-language'] || 'en';
        const messages = getMessages(lang);
        const serviceProviderId = req.user.id;
        console.log(serviceProviderId);
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // 🔢 get total count of ratings
        const totalCount = await review.countDocuments({
            targetId: serviceProviderId,
            targetType: 'serviceProvider'
        });
        const ratings = await review.find({ targetId: serviceProviderId, targetType: 'serviceProvider' })
            .populate('userId')
            .select('rating comment createdAt')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        console.log(ratings)

        const customizedRatings = ratings.map(rating => {
            const user = rating.userId.toObject();
            return {
                username: user.username,
                image: user.image,
                rating: rating.rating,
                comment: rating.comment ?? " ",
                createdAt: rating.createdAt
            };
        }
        );
        console.log(customizedRatings)
        //customizedRatings,
        return res.status(200).send({
            status: true,
            code: 200,
            message: lang == "en" ? "Your request has been completed successfully" : "تمت معالجة الطلب بنجاح",
            data: {
                rating: customizedRatings,
                pagination: {
                    page: page,
                    totalPages: Math.ceil(totalCount / limit),
                }
            }
        });
    } catch (error) {
        next(error);
    }
}
const changePaymentStatus = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const userId = req.user.id; 
    const { orderId } = req.body;

    const order = await serviceProviderOrders.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? "الطلب غير موجود" : "Order not found"
      });
    }

    order.paymentStatus = 'paid';
    await order.save();

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === 'ar' ? "تم تأكيد الدفع بنجاح" : "Payment confirmed successfully"
    });

  } catch (err) {
    next(err);
  }
};
module.exports = {
    addRatingForOrderToRentalOffice,
    addRatingForOrderToServiceProvider,
    getratingbyrentalOffice,
    getRatingByServiceProvider,
    changePaymentStatus
}