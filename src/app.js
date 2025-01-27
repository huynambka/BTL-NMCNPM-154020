require("dotenv").config({ path: ".env.example" }); // TODO: Change to .env in production
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Load routes
const router = require("./routes");

// Middleware
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    express.static(path.join(__dirname, "public"), {
        maxAge: "1d", // cache for 1 day
    })
);

const passport = require("./middlewares/passport");
app.use(passport.initialize());

// Template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// Routes
app.use("/auth", router.authRoutes);
app.use("/user", router.userRoutes);
app.use("/company", router.companyRoutes);
app.use("/admin", router.adminRoutes);
app.get("/", router.dashboardRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});
