const Chat = require("../models/Chat");
const User = require("../models/User");
const Company = require("../models/Company");
const sendMessage = async (req,res,io)=>{
    try {

      const chat = new Chat({
        senderType: req.body.senderType,
        userID: req.body.userID,
        companyID: req.body.companyID,
        content: req.body.content,
        roomID: req.body.roomID,
      });
      await chat.save();
      const fullName = await User.findById(req.body.userID).select("fullname");
      const companyName = await Company.findById(req.body.companyID).select("companyName");
      if (io) {
        // io.to(req.body.roomID).emit('receiveMessage', {
        //   senderType: chat.senderType,
        //   userID: chat.userID,
        //   companyID: chat.companyID,
        //   content: chat.content,
        //   roomID: chat.roomID,
        //   createdAt: chat.createdAt,
        // });
        io.emit('receiveMessage', {
          senderType: chat.senderType,
          userID: chat.userID,
          companyID: chat.companyID,
          content: chat.content,
          roomID: chat.roomID,
          createdAt: chat.createdAt,
          user: fullName,
          company: companyName,
        });
      }
      //res.redirect(`/chat/${req.body.roomID}`);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
    }
};
const getMessage = async(req,res)=>{
    const { roomID } = req.params;
    var isCompany = false;
    if (req.company){
        isCompany = true;
    }
    if (req.user && !req.company) {
        isCompany = false;
    }
  try {
    const messages = await Chat.find({ roomID })
      .populate('userID', 'fullname') 
      .populate('companyID', 'companyName') 
      .sort({ createdAt: 1 });
        res.render("chat",{messages,roomID,isCompany});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
  }
}
const index = async (req, res) => {
  try {
    let user;

    // Xác định người dùng hiện tại
    if (req.company) {
      user = req.company;
    } else if (req.user) {
      user = req.user;
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Tìm danh sách các room mà user tham gia
    const rooms = await Chat.find({ 
      $or: [{ userID: user._id }, { companyID: user._id }] 
    }).distinct('roomID')
    if (req.company){
      const chats = await Chat.find({ roomID: { $in: rooms } })
        .populate("userID", "fullname") 
        .exec();
      const roomDetails = rooms.map(roomID => {
          const userChat = chats.find(chat => chat.roomID === roomID);
          return {
            roomID,
            name: userChat?.userID?.fullname || "Unknown user",
          };
        });
        res.render("chatList", { roomDetails });
    }
    else if (req.user){
      const chats = await Chat.find({ roomID: { $in: rooms } })
      .populate("companyID", "companyName") 
      .exec();

    // Chuẩn bị dữ liệu để render
    const roomDetails = rooms.map(roomID => {
      const companyChat = chats.find(chat => chat.roomID === roomID);
      return {
        roomID,
        name: companyChat?.companyID?.companyName || "Unknown Company",
      };
    });
        res.render("chatList", { roomDetails });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching chat rooms", error: error.message });
  }
};

const createRoom = async (req, res) => {
  var userID, companyID, senderType, content;
  if (req.company){
    companyID = req.company._id;
    userID = req.body.id;
    senderType = "Company";
    content = "Xin chào tôi là đai diện phía công ty liên hệ với bạn";
  }
  else if (req.user){
    userID = req.user._id;
    companyID = req.body.id;
    senderType = "User";
    content = "Xin chào tôi là ứng viên liên hệ với công ty";
  }
  const roomID = `${userID}-${companyID}`;
  const chat = new Chat({
    senderType: senderType,
    userID: userID,
    companyID: companyID,
    content: content,
    roomID: roomID,
  });
  await chat.save();
  res.status(200).json({ success: true, message: 'Room created', roomID });
}
module.exports = { sendMessage, getMessage, index ,createRoom};