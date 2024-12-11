const { sendMessage } = require('../controllers/chat');

function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Sự kiện tham gia room
    socket.on('joinRoom', (roomID) => {
      socket.join(roomID);
      console.log(`User ${socket.id} joined room: ${roomID}`);
    });

    // Sự kiện gửi tin nhắn
    socket.on('sendMessage', async (data) => {
      const {senderType,userID, companyID, content, roomID } = data;
      
      try {
        // Tạo giả middleware để truyền thông tin vào controller
        const req = {
          body: { content, roomID,senderType,userID,companyID},
        };

        const res = {
          status: (code) => ({
            json: (response) => {
              if (code !== 200) {
                console.error(`Error ${code}:`, response.message);
              }
            },
          }),
        };

        // Gọi controller để xử lý lưu tin nhắn và phát sự kiện
        await sendMessage(req, res, io);
      } catch (error) {
        console.error(`Error sending message: ${error.message}`);
      }
    });
    
    

    // Sự kiện ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = initializeSocket;
