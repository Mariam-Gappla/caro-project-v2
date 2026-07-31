const Reel = require("../models/reels");
const ReelComment=require("../models/reelsComment");
const FollowerCenter=require("../models/followerCenter");
const ReelReply=require("../models/reelsReply");
const getReels = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lang = req.headers["accept-language"] || "en";

    // 1. استخراج بارامترات الفلترة والبيجينيشن (تعديل lng إلى long)
    const { cityId, lat, long, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // 2. بناء الاستعلام (Query Build)
    let query = {};

    // فلتر المدينة
    if (cityId) {
      query.cityId = cityId;
    }

    // فلتر الأقرب (إضافة دعم lat و long المرسلة من الرابط)
    if (lat && long) {
      query.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(long), parseFloat(lat)], // ترتيب MongoDB: [الطول، العرض]
          },
          $maxDistance: 100000, // نطاق 100 كم
        },
      };
    }

    // 3. جلب البيانات مع البيجينيشن
    let reelsQuery = Reel.find(query)
      .populate("createdBy")
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    // ملاحظة: عند استخدام $near، يتم الترتيب تلقائياً بالأقرب، لذا نستخدم sort فقط عند غياب الإحداثيات
    if (!lat || !long) {
      reelsQuery = reelsQuery.sort("-createdAt");
    }

    const reels = await reelsQuery;

    // --- الحل البرمجي لخطأ Postman: فصل استعلام العد عن الاستعلام الجغرافي ---
    let countQuery = { ...query };
    if (countQuery.location) {
        delete countQuery.location; // حذف الموقع من العد لتجنب خطأ $near context
    }
    const totalReels = await Reel.countDocuments(countQuery);
    // -----------------------------------------------------------------------

    // 4. جلب التعليقات والردود للريلز الحالية فقط
    const reelIds = reels.map((r) => r._id);
    const comments = await ReelComment.find({ reelId: { $in: reelIds } });
    const commentIds = comments.map((c) => c._id);
    const replies = await ReelReply.find({ commentId: { $in: commentIds } });

    // ماب لحساب التعليقات (نفس منطقك القديم تماماً)
    const commentsCountMap = {};
    comments.forEach((comment) => {
      const rId = comment.reelId.toString();
      commentsCountMap[rId] = (commentsCountMap[rId] || 0) + 1;
    });
    replies.forEach((reply) => {
      const comment = comments.find((c) => c._id.toString() === reply.commentId.toString());
      if (comment) {
        const rId = comment.reelId.toString();
        commentsCountMap[rId] = (commentsCountMap[rId] || 0) + 1;
      }
    });

    // 5. التنسيق النهائي
    const formatedReels = await Promise.all(
      reels.map(async (rel) => {
        const existFollower = await FollowerCenter.findOne({
          userId,
          centerId: rel.createdBy?._id,
        });

        // تصحيح الرابط لضمان عدم وجود أخطاء في السلاش
        const baseUrl = process.env.BASE_URL.endsWith('/') ? process.env.BASE_URL : `${process.env.BASE_URL}/`;

        return {
          id: rel._id,
          description: rel.discription,
          video: rel.video ? (rel.video.startsWith('http') ? rel.video : `${baseUrl}${rel.video}`) : "",
          likes: rel.likedBy.length,
          isLiked: rel.likedBy.includes(userId),
          totalCommentsAndReplies: commentsCountMap[rel._id.toString()] || 0,
          shareCount: rel.shareCount,
          location: rel.location, 
          orderId: rel.orderId,
          userData: {
            id: rel.createdBy?._id,
            username: rel.createdBy?.username,
            image: rel.createdBy?.image ? (rel.createdBy.image.startsWith('http') ? rel.createdBy.image : `${baseUrl}${rel.createdBy.image}`) : "",
            status: rel.createdBy?.status,
            isFollowed: !!existFollower,
          },
        };
      })
    );

    return res.status(200).send({
      status: true,
      code: 200,
      pagination: {
        totalResults: totalReels,
        totalPages: Math.ceil(totalReels / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      },
      message: lang === "en" ? "Reels retrieved successfully" : "تم استرجاع الريلز بنجاح",
      data: formatedReels,
    });
  } catch (error) {
    next(error);
  }
};
const addLike = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const userId = req.user.id;
    const reelId = req.params.id;
    const existReel = await Reel.findOne({ _id: reelId });
    if (!existReel) {
      return res.status(400).send({
        status: 400,
        code: false,
        message: lang == "en" ? "this reel not found" : "هذا الريلز غير موجود"
      });
    }
    const alreadyLiked = existReel.likedBy.includes(userId);
    let updatedRentalOffice;
    if (alreadyLiked) {
      // Remove the like
      updatedRentalOffice = await Reel.findByIdAndUpdate(
        reelId,
        { $pull: { likedBy: userId } },
        { new: true }
      );
    } else {
      // Add the like
      updatedRentalOffice = await Reel.findByIdAndUpdate(
        reelId,
        { $addToSet: { likedBy: userId } }, // $addToSet prevents duplicates
        { new: true }
      );
    }
    return res.status(200).send({
      status: true,
      code: 200,
      message: alreadyLiked
        ? lang === "en"
          ? "Like removed successfully"
          : "تم إزالة الإعجاب بنجاح"
        : lang === "en"
          ? "Like added successfully"
          : "تم إضافة الإعجاب بنجاح",
    });

  }
  catch (err) {
    next(err)
  }
}
const makeShare = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const { reelId } = req.body;
    const reel = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { shareCount: 1 } }, 
      { new: true } 
    );
    
    return res.status(200).send({
      status: true,
      code: 200,
      message:
        lang === "en"
          ? "Share count updated successfully"
          : "تم تحديث عدد المشاركات بنجاح",
    });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getReels,
  addLike,
  makeShare
}


