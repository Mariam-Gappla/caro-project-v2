const { handleMessage } = require("../controllers/chat");
// تأكد أن هذا الملف موجود فعلاً في هذا المسار
// const { sendLocation } = require("../controllers/tracking"); 

module.exports = (io) => {
  console.log("🚀 [Socket] Handler is Ready and Running...");

  io.on("connection", (socket) => {
    console.log(`🔌 [CONN] New Connection! ID: ${socket.id}`);

socket.on("joinOrderRoom", (orderId) => {
        if (orderId) {
            socket.join(`order_${orderId}`);
            console.log(`✅ [JOIN] Socket ${socket.id} joined room: order_${orderId}`);

            // إرسال حالة تأكيدية للغرفة اللي انضم لها
            io.to(`order_${orderId}`).emit("orderStatus", { 
                orderId: orderId, 
                status: "searching" 
            });
        }
    });
    socket.on("sendLocation", async (data) => {
      console.log(`📍 [LOC] Location Update for Order: ${data.orderId}`);
      io.emit("locationUpdate", data);
    });

    handleMessage(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`❌ [DISC] User ${socket.id} disconnected. Reason: ${reason}`);
    });
  });
};