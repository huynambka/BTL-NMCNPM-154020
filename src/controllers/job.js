const Job = require("../models/Job");
const User = require("../models/User");
const Company = require("../models/Company");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const searchJob = async (req, res) => {
    const keyword = req.query.q || ""; // Nhận từ khóa từ URL

    // Hàm thoát các ký tự đặc biệt trong biểu thức chính quy
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Thêm ký tự thoát trước ký tự đặc biệt
    }

    const escapedKeyword = escapeRegExp(keyword);
    const regex = new RegExp(escapedKeyword, "i"); // Tạo biểu thức chính quy không phân biệt hoa thường

    const jobs = await Job.find({ title: regex }).sort({ deadline: -1 }); // Tìm kiếm các công việc theo tiêu đề khớp với từ khóa
    // jobs.sort((a, b) => new Date(b.deadline) - new Date(a.deadline)); // Sắp xếp theo ngày hết hạn
    var searchJobs = [];
    await Promise.all(
        jobs.map(async (job) => {
            const company = await Company.findById(job.companyId).select("logoPath");
            if (company) {
                searchJobs.push({
                    id: job._id,
                    logo: company.logoPath,
                    title: job.title,
                    companyName: job.companyName,
                    salary: job.salary,
                    location: job.location,
                    keywords: job.skills,
                });
            }
        })
    );
    res.render("jobIT.ejs", {
        title: "Việc làm IT", // Đặt tiêu đề trang
        jobs: searchJobs, // Truyền dữ liệu jobs sang view
    });
};

const showJob = async (req, res) => {
    try {
        const jobId = req.params.jobId;

        const job = await Job.findById(jobId).populate({
            path: "companyId",
            select: "companyName logoPath location phoneNumber email",
        });
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }

        const isCompany = !!req.company; // Token của công ty
        const isUser = !!req.user; // Token của người dùng

        console.log("Token là của công ty:", isCompany);
        console.log("Token là của người dùng:", isUser);

        const loggedInCompanyId = req.company?._id;
        const companyFromJobId = job.companyId?._id;

        if (isCompany && loggedInCompanyId?.toString() === companyFromJobId?.toString()) {
            return res.render("job/show", { job });
        }

        if (isUser) {
            const user = await User.findById(req.user._id).select("-password");
            const isApplied = user.jobs.includes(jobId);
            return res.render("job/show-job-user.ejs", { job, user, isApplied });
        }

        // Trường hợp không hợp lệ
        return res.status(403).json({ message: "Access denied" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "This id is not exist" });
    }
};

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
const applyJob = async (req, res) => {
    try {
        const userId = req.user._id;
        const jobId = req.params.jobId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }
        if (user.jobs.includes(jobId)) {
            return res.status(400).json({ success: false, message: "You have already applied for this job" });
        }
        const { name, phoneNumber, email, cvTitle, coverLetter, isFileUploaded, fileUpload } = req.body;
        if (!name || !phoneNumber || !email) {
            return res.status(400).json({ success: false, message: "Please fill in all fields" });
        }
        if (!cvTitle && !isFileUploaded) {
            return res.status(400).json({ success: false, message: "Please choose a CV or upload a new one" });
        }
        if (isFileUploaded && !fileUpload) {
            return res.status(400).json({ success: false, message: "Please upload a file" });
        }
        if (isFileUploaded && fileUpload) {
            let title = fileUpload.name;

            // Tạo tiêu đề duy nhất cho CV
            const existingTitles = user.CV.map((cv) => cv.name);
            title = generateUniqueTitle(title, existingTitles);

            // Tạo tên file ngẫu nhiên
            const randomFileName = crypto.randomBytes(16).toString("hex");
            const filePath = path.join(__dirname, `../../uploads/${user._id}/cv`, `${randomFileName}.pdf`);

            // Tạo thư mục nếu chưa tồn tại
            const uploadDir = path.dirname(filePath);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Lưu file lên server
            const buffer = Buffer.from(fileUpload.data, "base64");
            fs.writeFileSync(filePath, buffer);

            user.CV.push({ title, path: filePath });

            job.applicants.push({ userId, name, phoneNumber, email, coverLetter, cvTitle: fileUpload.name });
            user.jobs.push(jobId);
            await job.save();
            await user.save();
            return res.status(200).json({ success: true, message: "Apply successfully" });

        }
        if (cvTitle) {
            job.applicants.push({ userId, name, phoneNumber, email, coverLetter, cvTitle });
            user.jobs.push(jobId);
            await job.save();
            await user.save();
            return res.status(200).json({ success: true, message: "Apply successfully" });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: "Error" });
    }
};

const uploadNewCV = async (userId, cv) => {
    try {
        const user = await User.findById(userId);
        let title = cv.name;

        // Tạo tiêu đề duy nhất cho CV
        const existingTitles = user.CV.map((cv) => cv.name);
        title = generateUniqueTitle(title, existingTitles);

        // Tạo tên file ngẫu nhiên
        const randomFileName = crypto.randomBytes(16).toString("hex");
        const filePath = path.join(__dirname, `../../uploads/${user._id}/cv`, `${randomFileName}.pdf`);

        // Tạo thư mục nếu chưa tồn tại
        const uploadDir = path.dirname(filePath);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Lưu file lên server
        const buffer = Buffer.from(cv, "base64");
        fs.writeFileSync(filePath, buffer);

        user.CV.push({ title, path: filePath });
        await user.save();

        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { searchJob, showJob, applyJob };
