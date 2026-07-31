const RentalOffice = require("../models/rentalOffice");
const ServiceProvider = require("../models/serviceProvider");
const CenterService = require("../models/centerServices");
const User = require("../models/user");
const Post = require("../models/post");

// --- دالة إحصائيات اليوم الحالي فقط ---
const getTodayPendingStats = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const [rentalToday, providerToday, centerToday] = await Promise.all([
            RentalOffice.countDocuments({ status: "pending", createdAt: { $gte: startOfToday, $lte: endOfToday } }),
            ServiceProvider.countDocuments({ status: "pending", createdAt: { $gte: startOfToday, $lte: endOfToday } }),
            CenterService.countDocuments({ status: "pending", createdAt: { $gte: startOfToday, $lte: endOfToday } })
        ]);

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Today's pending stats" : "إحصائيات طلبات اليوم المعلقة",
            data: {
                date: startOfToday.toISOString().split('T')[0],
                total: rentalToday + providerToday + centerToday,
                breakdown: {
                    rentalOffices: rentalToday,
                    serviceProviders: providerToday,
                    centers: centerToday
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

// --- دالة المجموع الكلي (كل الوقت) ---
const getTotalPendingCount = async (req, res, next) => {
    try {
        const lang = req.headers["accept-language"] || "en";

        const [rentalTotal, providerTotal, centerTotal] = await Promise.all([
            RentalOffice.countDocuments({ status: "pending" }),
            ServiceProvider.countDocuments({ status: "pending" }),
            CenterService.countDocuments({ status: "pending" })
        ]);

        return res.status(200).send({
            status: true,
            code: 200,
            message: lang === "en" ? "Total overall pending requests" : "إجمالي الطلبات المعلقة الكلي",
            data: {
                totalCount: rentalTotal + providerTotal + centerTotal,
                details: {
                    rentalOffices: rentalTotal,
                    serviceProviders: providerTotal,
                    centers: centerTotal
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

const getTodayNewUsers = async (req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // حساب المستخدمين الذين تم إنشاؤهم اليوم
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });

        return res.status(200).send({
            status: true,
            code: 200,
            data: {
                date: startOfToday.toISOString().split('T')[0],
                newUsersCount: newUsersToday
            }
        });
    } catch (err) {
        next(err);
    }
};

const getTodayPostsCount = async (req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // حساب الإعلانات التي تم إنشاؤها اليوم
        const postsToday = await Post.countDocuments({
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });

        return res.status(200).send({
            status: true,
            code: 200,
            data: {
                date: startOfToday.toISOString().split('T')[0],
                postsCount: postsToday
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTodayPendingStats,
    getTotalPendingCount,
    getTodayNewUsers,
    getTodayPostsCount
};