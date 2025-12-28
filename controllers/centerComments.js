const CenterComment = require('../models/centerComments');
const CenterReply = require("../models/centerReplies")
const addComment = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const { entityType, content, entityId } = req.body;
    const userId = req.user.id;
    if (!entityType || !content || !entityId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required'
      });
    }
    const comment = await CenterComment.create({ entityType, content, entityId, userId });
    res.status(200).send({
      status: true,
      code: 200,
      message: lang == "en" ? 'Comment added successfully' : 'تم إضافة التعليق بنجاح',
      data: {
        id: comment._id
      }
    });
  } catch (error) {
    next(error);
  }
}
const getCommentsByPostId = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const postId = req.params.id;
    if (!postId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? 'معرف المنشور مطلوب' : 'Post ID is required'
      });
    }
    const comments = await CenterComment.find({ entityId: postId, entityType: "Post" }).populate('userId', 'username image');
    const formatedComment = comments.map((comment) => {
      return {
        id: comment._id,
        content: comment.content,
        userData: {
          username: comment.userId.username,
          image: comment.userId.image,
        }
      }
    })
    res.status(200).send({
      status: true,
      code: 200,
      message: lang == "en"
        ? "Your request has been completed successfully"
        : "تمت معالجة الطلب بنجاح",
      data: formatedComment
    });
  } catch (error) {
    next(error);
  }
}
const getCommentsByShowRoomPostId = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const postId = req.params.id;
    if (!postId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? 'معرف المنشور مطلوب' : 'Post ID is required'
      });
    }
  } catch (error) {
    next(error);
  }
  const comments = await CenterComment.find({ entityId: postId, entityType: "ShowRoomPosts" }).populate('userId', 'username image');
  const formatedComment = comments.map((comment) => {
    return {
      id: comment._id,
      content: comment.content,
      userData: {
        username: comment.userId.username,
        image: comment.userId.image,
      }
    }
  })
  res.status(200).send({
    status: true,
    code: 200,
    message: lang == "en"
      ? "Your request has been completed successfully"
      : "تمت معالجة الطلب بنجاح",
    data: formatedComment
  });
}
const getPostCommentsWithReplies = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const postId = req.params.id;

    if (!postId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "Post ID is required" : "مطلوب معرف البوست",
      });
    }

    // 📌 هات التعليقات الخاصة بالبوست
    const comments = await CenterComment.find({ entityId: postId, entityType: "Post" })
      .populate("userId", "username image") // المستخدم اللي كتب الكومنت
      .lean();

    // 📌 هات الـ replies لكل كومنت
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CenterReply.find({ commentId: comment._id })
          .populate("userId", "username image") // المستخدم اللي رد
          .lean();

        return {
          id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          userData: {
            username: comment.userId?.username,
            image: comment.userId?.image,
          },
          replies: replies.map((reply) => ({
            id: reply._id,
            content: reply.content,
            createdAt: reply.createdAt,
            user: {
              username: reply.userId?.username,
              image: reply.userId?.image,
            },
          })),
        };
      })
    );

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en"
        ? "Comments and replies retrieved successfully"
        : "تم جلب التعليقات والردود بنجاح",
      data: commentsWithReplies,

    });
  } catch (error) {
    next(error);
  }
};
const getShowRoomPostCommentsWithReplies = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const postId = req.params.id;

    if (!postId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "Post ID is required" : "مطلوب معرف البوست",
      });
    }

    // 📌 هات التعليقات الخاصة بالبوست
    const comments = await CenterComment.find({ entityId: postId, entityType: "ShowRoomPosts" })
      .populate("userId", "username image") // المستخدم اللي كتب الكومنت
      .lean();

    // 📌 هات الـ replies لكل كومنت
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CenterReply.find({ commentId: comment._id })
          .populate("userId", "username image") // المستخدم اللي رد
          .lean();

        return {
          id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          userData: {
            username: comment.userId?.username,
            image: comment.userId?.image,
          },
          replies: replies.map((reply) => ({
            id: reply._id,
            content: reply.content,
            createdAt: reply.createdAt,
            user: {
              username: reply.userId?.username,
              image: reply.userId?.image,
            },
          })),
        };
      })
    );

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en"
        ? "Comments and replies retrieved successfully"
        : "تم جلب التعليقات والردود بنجاح",
      data: commentsWithReplies,

    });
  } catch (error) {
    next(error);
  }
};
const getCommentsByCenterId = async (req, res, next) => {
  try {
    const lang = req.headers['accept-language'] || 'en';
    const centerId = req.params.id;
    if (!centerId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === 'ar' ? 'معرف المنشور مطلوب' : 'Post ID is required'
      });
    }
    const comments = await CenterComment.find({ entityId: centerId, entityType: "User" }).populate('userId', 'username image');
    const formatedComment = comments.map((comment) => {
      return {
        id: comment._id,
        content: comment.content,
        createdAt: comment.createdAt,
        userData: {
          username: comment.userId.username,
          image: comment.userId.image,
        }
      }
    })
    res.status(200).send({
      status: true,
      code: 200,
      message: lang == "en"
        ? "Your request has been completed successfully"
        : "تمت معالجة الطلب بنجاح",
      data: formatedComment
    });
  } catch (error) {
    next(error);
  }
}
const getCenterCommentswithReplies = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const centerId = req.params.id;

    if (!centerId) {
      return res.status(400).send({
        status: false,
        code: 400,
        message: lang === "en" ? "center ID is required" : "معرف السنتر مطلوب",
      });
    }

    // 📌 هات التعليقات الخاصة بالبوست
    const comments = await CenterComment.find({ entityId: centerId, entityType: "User" })
      .populate("userId", "username image") // المستخدم اللي كتب الكومنت
      .lean();

    // 📌 هات الـ replies لكل كومنت
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await CenterReply.find({ commentId: comment._id })
          .populate("userId", "username image") // المستخدم اللي رد
          .lean();

        return {
          id: comment._id,
          content: comment.content,
          createdAt: comment.createdAt,
          userData: {
            username: comment.userId?.username,
            image: comment.userId?.image,
          },
          replies: replies.map((reply) => ({
            id: reply._id,
            content: reply.content,
            createdAt: reply.createdAt,
            userData: {
              username: reply.userId?.username,
              image: reply.userId?.image,
            },
          })),
        };
      })
    );

    return res.status(200).send({
      status: true,
      code: 200,
      message: lang === "en"
        ? "Comments and replies retrieved successfully"
        : "تم جلب التعليقات والردود بنجاح",
      data: commentsWithReplies,

    });
  } catch (error) {
    next(error);
  }
}
const getEntityByTypeAndId = async (req, res, next) => {
  try {
    const lang = req.headers["accept-language"] || "en";
    const { id, type } = req.query;

    if (!id || !type) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "id and type are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        code: 400,
        message: "Invalid ID format",
      });
    }

    let Model;
    let populateOptions = [];

    switch (type) {
      case "Post":
        Model = Post;
        populateOptions = [
          {
            path: "userId",
            select: "username image status phone categoryCenterId",
            populate: {
              path: "categoryCenterId",
              select: `name.${lang}`,
            },
          },
          { path: "cityId", select: `name.${lang}` },
        ];
        break;

      case "ShowRoomPost":
        Model = ShowRoomPost;
        populateOptions = [
          { path: "showroomId", select: "username image phone" },
          { path: "cityId", select: `name.${lang}` },
        ];
        break;

      case "Search":
        Model = Search;
        populateOptions = [{ path: "userId", select: "username image" }];
        break;

      case "Tweet":
        Model = Tweet;
        populateOptions = [{ path: "userId", select: "username image" }];
        break;

      case "Service":
        Model = Service;
        populateOptions = [
          {
            path: "centerId",
            select: "username image status phone categoryCenterId",
            populate: {
              path: "categoryCenterId",
              select: `name.${lang}`,
            },
          },
          { path: "cityId", select: `name.${lang}` },
        ];
        break;

      default:
        return res.status(400).json({
          status: false,
          code: 400,
          message: "Invalid type",
        });
    }

    let entity = await Model.findById(id).populate(populateOptions);

    if (!entity) {
      return res.status(404).json({
        status: false,
        code: 404,
        message: "Entity not found",
      });
    }

    return res.status(200).json({
      status: true,
      code: 200,
      message:
        lang === "en"
          ? `${type} retrieved successfully`
          : `${type} تم استرجاعه بنجاح`,
      data: entity,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addComment,
  getCommentsByPostId,
  getCommentsByShowRoomPostId,
  getPostCommentsWithReplies,
  getShowRoomPostCommentsWithReplies,
  getCommentsByCenterId,
  getCenterCommentswithReplies,
  getEntityByTypeAndId
}