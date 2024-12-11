const User = require("../models/User");
const Job = require("../models/Job");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { StatusCodes } = require("http-status-codes");
// Lấy thông tin người dùng
const getUpdate = async (req, res) => {
    try {
        // Kiểm tra ID người dùng từ token
        const userId = req.user._id;

        if (!userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "User ID is not provided" });
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render("updateProfile", { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Hiển thị trang cập nhật thông tin
const updateUser = async (req, res) => {
    try {
        // Lấy userId từ req.body hoặc req.params (nếu không có xác thực JWT)
        const userId = req.user._id;
        console.log(userId);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
        }

        if (req.body.password) {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            req.body.password = hashedPassword;
        }

        // Cập nhật thông tin người dùng
        const updatedUser = await User.findByIdAndUpdate(userId, req.body, { new: true });
        if (!updatedUser) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
        }

        res.status(StatusCodes.OK).json({
            message: "User updated successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
        }
        const user = await User.findById(userId).populate("jobs");
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
        }
        res.render("user/appliedJob.ejs", { jobs: user.jobs, user: user });
    }
    catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message,
        });
    }
}
const generateUniqueTitle = (title, existingTitles) => {
    let baseTitle = title.replace(/(\(\d+\))?(\.pdf)$/i, ""); // Loại bỏ phần (x) nếu có
    let extension = ".pdf";
    let newTitle = title;
    let counter = 1;

    while (existingTitles.includes(newTitle)) {
        newTitle = `${baseTitle} (${counter})${extension}`;
        counter++;
    }

    return newTitle;
};
const getUploadCV= async (req, res) => {
    if(req.user){
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }
        res.render("upCV",{user});
    }
    
}
const uploadCV = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (!req.file) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "No file uploaded",
            });
        }

        const userId = req.user._id;
        let title = req.file.originalname;

        // Cập nhật CV vào cơ sở dữ liệu
        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found",
            });
        }

        // Tạo tiêu đề duy nhất cho CV
        const existingTitles = user.CV.map((cv) => cv.title);
        title = generateUniqueTitle(title, existingTitles);

        // Tạo tên file ngẫu nhiên
        const randomFileName = crypto.randomBytes(16).toString("hex");
        const filePath = path.join(__dirname, `../../uploads/${userId}/cv`, `${randomFileName}.pdf`);

        // Tạo thư mục nếu chưa tồn tại
        const uploadDir = path.dirname(filePath);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Lưu file lên server
        fs.writeFileSync(filePath, req.file.buffer);

        user.CV.push({ title, path: filePath });
        await user.save();

        return res.status(StatusCodes.OK).json({
            success: true,
            message: "CV uploaded successfully",
            cv: { title, path: filePath },
        });
    } catch (error) {
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Error uploading CV",
        });
    }
};
const deleteCV = async (req, res) => {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Unauthorized",
        });
      }
  
      const userId = req.user._id;
      const cvId = req.body.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "User not found",
        });
      }
      const cv = user.CV.find((cv) => cv._id.toString() === cvId);
      if (!cv) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "CV not found",
        });
      }
  
      const filePath = cv.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Xóa file đồng bộ
      } else {
        console.log(`File not found: ${filePath}`);
      }
      const result = await User.updateOne(
        { _id: userId },
        { $pull: { CV: { _id: cvId } } }
      );
  
      if (result.modifiedCount > 0) {
        return res.status(StatusCodes.OK).json({
          success: true,
          message: "CV deleted successfully",
        });
      } else {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "CV not found in database",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting CV",
      });
    }
  };
const getUserInfo = async (req, res) => {
    try {
        // Kiểm tra ID người dùng từ token
        const userId = req.user._id;

        if (!userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "User ID is not provided" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
        }
        res.render("profile", { user });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error", error: error.message });
    }
};

const createInfo = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User ID is not provided" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not found" });
        }
        res.render("UserInfoSetup", { user });

    }
    catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error updating user information",
            error: error.message,
        });
    }
};

const createdInfo = async (req, res) => {
    try {
        const userId = req.user._id;

        const address = {
            detail: req.body["address.detail"],
            ward: req.body["address.ward"],
            district: req.body["address.district"],
            province: req.body["address.province"],
        };

        // Kiểm tra file đã được upload hay chưa
        const avatarPath = req.file ? `/images/${req.file.filename}` : undefined;


        // Đối tượng cập nhật
        const updateData = {
            username: req.body.username,
            fullname: req.body.fullname,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            gender: req.body.gender,
            address: address,
        };

        // Thêm avatarPath vào nếu có
        if (avatarPath) {
            updateData.avatarPath = avatarPath;
        }

        // Cập nhật user trong cơ sở dữ liệu
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};
const applyJob = async (req, res) => {
    try {
        const { job_id: jobId } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "User ID is not provided" });
        }

        if (!jobId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Job ID is not provided" });
        }

        // Find user and job in parallel
        const [user, job] = await Promise.all([
            User.findById(userId),
            Job.findById(jobId),
        ]);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
        }

        if (!job) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "Job not found" });
        }

        // Check if the job has already been applied
        if (user.appliedJobs.includes(jobId) || job.applicant.includes(userId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: "Job already applied" });
        }

        // Update user's applied jobs and job's applicants
        user.appliedJobs.push(jobId);
        job.applicant.push(userId);

        await Promise.all([user.save(), job.save()]);

        res.status(StatusCodes.OK).json({ message: "Job applied successfully" });
    } catch (error) {
        console.error('Error applying for job:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error applying job",
            error: error.message,
        });
    }
};

const getUserProfileForCompany = async (req, res) => {
    try {
        const userId = req.user._id; // Lấy userId từ token
        const user = await User.findById(userId).populate('appliedJobs'); // Populate các công việc đã ứng tuyển
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('profileUser', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const changePassword = async(req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User ID is not provided" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: "User not found" });
        }
        res.render("userChangePassword", { user });

    }
    catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error updating user information",
            error: error.message,
        });
    }
};

const updatedPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "Người dùng không tồn tại" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Mật khẩu xác nhận không khớp" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, message: "Thay đổi mật khẩu thành công" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Đã xảy ra lỗi" });
    }
};


module.exports = {
    getUpdate,
    getUploadCV,
    updateUser,
    getAppliedJobs,
    uploadCV,
    deleteCV,
    getUserInfo,
    getUserProfileForCompany,
    // getUpdateForm,  // Export hàm render form cập nhật
    createInfo,
    createdInfo,
    applyJob,
    getAppliedJobs,
    changePassword,
    updatedPassword,
};
