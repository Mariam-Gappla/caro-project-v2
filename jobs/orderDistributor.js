const serviceProviderOrders = require('../models/serviceProviderOrders');
const serviceProvider = require('../models/serviceProvider');

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

const acceptOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const providerId = req.user.id; 
        const io = req.app.get("io");

        const order = await serviceProviderOrders.findById(orderId);
        
        if (!order || order.status !== "pending" || order.ended) {
            return res.status(400).json({ 
                status: false, 
                message: "نعتذر، الطلب تم قبوله من فني آخر أو غير متاح" 
            });
        }

        order.status = "accepted";
        order.providerId = providerId;
        order.ended = true; 
        await order.save();

        if (io) {
            io.to(`order_${order._id}`).emit("orderStatus", {
                orderId: order._id,
                status: "accepted",
                providerId: providerId,
                messageAr: "تم قبول طلبك، المندوب في الطريق إليك"
            });
        }

        return res.status(200).json({ status: true, message: "تم قبول الطلب بنجاح" });

    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};

const runOrderDistributor = async (io) => {
    try {
        const now = new Date();
        const pendingOrders = await serviceProviderOrders.find({ 
            status: "pending", 
            ended: false 
        });

        for (let order of pendingOrders) {
            const diffInMinutes = Math.floor((now - new Date(order.createdAt)) / 60000);
            
            // المرحلة 2: توسع لـ 20كم (بعد دقيقتين)
            if (diffInMinutes >= 2 && diffInMinutes < 4 && order.searchRadius < 20000) {
                console.log(`📡 Expanding Order ${order.orderNumber} to 20km`);
                await expandAndNotify(io, order, 20000, 8000); 
            } 
            // المرحلة 3: توسع لـ 50كم (بعد 4 دقائق)
            else if (diffInMinutes >= 4 && diffInMinutes < 6 && order.searchRadius < 50000) {
                console.log(`📡 Expanding Order ${order.orderNumber} to 50km`);
                await expandAndNotify(io, order, 50000, 20000);
            } 
            // المرحلة 4: الإلغاء لعدم وجود فني (بعد 6 دقائق)
            else if (diffInMinutes >= 6) {
                order.status = "refused"; 
                order.ended = true;
                await order.save();
                
                io.to(`order_${order._id}`).emit("orderStatus", { 
                    orderId: order._id, 
                    status: "canceled",
                    messageAr: "نعتذر، لم يتم العثور على فني متاح حالياً."
                });
                console.log(`❌ Order ${order.orderNumber} timed out.`);
            }
        }
    } catch (error) {
        console.error("DISTRIBUTOR ERROR:", error);
    }
};

const expandAndNotify = async (io, order, newRadius, oldRadius) => {
    order.searchRadius = newRadius;
    if (newRadius === 50000) order.isBroadcasted = true;
    await order.save();

    const targetServiceCode = order.serviceType === 'winch' ? "1" : (order.serviceType === 'battery Jumpstart' ? "3" : "2");
    
    const providers = await serviceProvider.find({ 
        serviceType: { $in: [targetServiceCode] }, 
        status: "accepted",
        isDeleted: false 
    });

    const newProvidersInRange = providers.filter(p => {
        if (p.location?.lat && p.location?.long) {
            const dist = haversineDistance(order.location.lat, order.location.long, p.location.lat, p.location.long) * 1000;
            return dist > oldRadius && dist <= newRadius;
        }   
        return false;
    });

    const eventName = order.serviceType === 'winch' ? "newServiceProviderOrder" : "serviceProviderOrderTire";
    
    newProvidersInRange.forEach(p => {
        if (p.socketId) {
            io.to(p.socketId).emit(eventName, {
                id: order._id,
                serviceType: order.serviceType,
                orderNumber: order.orderNumber,
                location: order.location,
                price: order.price
            });
        }
    });
};

const startOrderDistributor = (io) => {
    console.log("⏱️  Order Distributor Started");
    setInterval(() => runOrderDistributor(io), 60000);
};

module.exports = { startOrderDistributor, acceptOrder };