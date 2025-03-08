require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const sanitizeHTML = require("sanitize-html");
const marked = require("marked");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 5001;
const User = require("./models/User"); // ✅ Import only
const Post = require("./models/Post"); // Ensure Post model exists in models/Post.js

// Ensure Upload Directory Exists
const uploadDir = "./public/uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(null, req.user._id + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Middleware to Handle User Authentication
app.use(async (req, res, next) => {
  res.locals.filterUserHTML = (content) => {
    return sanitizeHTML(marked.parse(content), {
      allowedTags: ["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "img"],
      allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    });
  };

  res.locals.errors = [];

  try {
    if (req.cookies.overSimpleApp) {
      const decoded = jwt.verify(req.cookies.overSimpleApp, process.env.JWTSECRET);
      req.user = await User.findById(decoded.userid);
    }
  } catch (error) {
    req.user = null;
  }

  res.locals.username = req.user ? req.user.username : null;
  res.locals.user = req.user || null;
  next();
});

// Routes
app.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("index", { username: null, errors: [], user: req.user });
});

app.get("/register", (req, res) => res.render("register", { errors: [], user: req.user }));
app.get("/login", (req, res) => res.render("login", { errors: [], user: req.user }));
app.get("/logout", (req, res) => {
  res.clearCookie("overSimpleApp");
  res.redirect("/login");
});

// Middleware to Check Authentication
function mustBeLoggedIn(req, res, next) {
  if (!req.user) return res.redirect("/");
  next();
}

// Dashboard Route
app.get("/dashboard", mustBeLoggedIn, async (req, res) => {
  const posts = await Post.find({ author: req.user._id })
    .populate("author", "username profileImage")
    .sort({ createDate: -1 });

  res.render("dashboard", { username: req.user.username, posts, user: req.user });
});

// Create Post
app.get("/create-post", mustBeLoggedIn, (req, res) => {
  res.render("create-post", { errors: [], user: req.user });
});

app.post("/create-post", mustBeLoggedIn, async (req, res) => {
  if (!req.body.title || !req.body.content)
    return res.render("create-post", { errors: ["All fields are required"], user: req.user });

  await new Post({ title: req.body.title, content: req.body.content, author: req.user._id }).save();
  res.redirect("/dashboard");
});

// View Single Post
app.get("/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id).populate("author", "username profileImage");
  if (!post) return res.status(404).send("Post not found.");
  res.render("single-posts", { post, user: req.user });
});

// Edit Post
app.get("/edit-post/:id", mustBeLoggedIn, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.author.toString() !== req.user._id.toString())
    return res.status(403).send("Unauthorized.");
  res.render("edit-post", { post, user: req.user });
});

// Update Post
app.post("/update-post/:id", mustBeLoggedIn, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.author.toString() !== req.user._id.toString())
    return res.status(403).send("Unauthorized.");

  post.title = req.body.title;
  post.content = req.body.content;
  await post.save();
  res.redirect(`/posts/${req.params.id}`);
});

// Delete Post
app.post("/delete-post/:id", mustBeLoggedIn, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.author.toString() !== req.user._id.toString())
    return res.status(403).send("Unauthorized.");
  await post.deleteOne();
  res.redirect("/dashboard");
});

// Upload Profile Picture
app.post("/upload-profile-image", mustBeLoggedIn, upload.single("profileImage"), async (req, res) => {
  if (!req.file) return res.redirect("/profile");

  await User.findByIdAndUpdate(req.user._id, { profileImage: "/uploads/" + req.file.filename });

  req.user.profileImage = "/uploads/" + req.file.filename;

  res.redirect("/profile");
});

// Profile Page
app.get("/profile", mustBeLoggedIn, (req, res) => {
  res.render("profile", { errors: [], user: req.user });
});

// Register User
app.post("/register", async (req, res) => {
  if (!req.body.username || !req.body.password)
    return res.render("register", { errors: ["All fields required"], user: req.user });

  const hashedPassword = bcrypt.hashSync(req.body.password, 10);
  try {
    await new User({ username: req.body.username, password: hashedPassword }).save();
    res.redirect("/login");
  } catch (error) {
    res.render("register", { errors: ["Username already exists"], user: req.user });
  }
});

// Login User
app.post("/login", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (!user || !bcrypt.compareSync(req.body.password, user.password))
    return res.render("login", { errors: ["Invalid credentials"], user: req.user });

  const token = jwt.sign({ userid: user._id, username: user.username }, process.env.JWTSECRET, { expiresIn: "7d" });
  res.cookie("overSimpleApp", token, { httpOnly: true });
  res.redirect("/dashboard");
});

// Start Server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
