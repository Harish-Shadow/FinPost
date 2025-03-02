require("dotenv").config();
const jwt = require("jsonwebtoken");
const sanitizeHTML = require("sanitize-html");
const marked = require("marked");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const express = require("express");
const Database = require("better-sqlite3");

// Initialize the database
const db = new Database("ourApp.db");
db.pragma("journal_mode = WAL");

const app = express();
const PORT = process.env.PORT || 3001;

// Create users & posts tables if they don't exist
const createTables = db.transaction(() => {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`
  ).run();

  db.prepare(
    `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        createDate TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        authorid INTEGER NOT NULL,
        FOREIGN KEY (authorid) REFERENCES users(id)
    )`
  ).run();
});

// Run the table creation function
createTables();

// Set EJS as the view engine
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Middleware to initialize user session
app.use((req, res, next) => {
  res.locals.filterUserHTML = function (content) {
    return sanitizeHTML(marked.parse(content), {
      allowedTags: ["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "img"],
      allowedAttributes: {
        a: ["href"],
        img: ["src", "alt"]
      }
    });
  };

  res.locals.errors = [];

  try {
    if (req.cookies.overSimpleApp) {
      const decoded = jwt.verify(req.cookies.overSimpleApp, process.env.JWTSECRET);
      req.user = decoded;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  res.locals.username = req.user ? req.user.username : null;
  next();
});

// Routes
app.get("/", (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("index", { username: null, errors: [], page: "home" });
});

app.get("/login", (req, res) => {
  res.render("login", { errors: [], page: "login" });
});

app.get("/register", (req, res) => {
  res.render("register", { errors: [], page: "register" });
});

app.get("/logout", (req, res) => {
  res.clearCookie("overSimpleApp");
  res.redirect("/login");
});

app.get("/dashboard", (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }

  const postsStatement = db.prepare(
    "SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.authorid = users.id WHERE users.id = ? ORDER BY posts.createDate DESC"
  );

  const posts = postsStatement.all(req.user.userid);

  res.render("dashboard", {
    username: req.user.username,
    posts,
    page: "dashboard",
  });
});



// Middleware for post validation
function sharedPostValidation(req, res) {
  const errors = [];

  if (typeof req.body.title !== "string") req.body.title = "";
  if (typeof req.body.body !== "string") req.body.body = ""; // ✅ Fix: use "content" instead of "body"

  req.body.title = sanitizeHTML(req.body.title.trim(), { allowedTags: [], allowedAttributes: {} });
  req.body.body = sanitizeHTML(req.body.body.trim(), { allowedTags: [], allowedAttributes: {} });

  if (!req.body.title) errors.push("You must provide a title.");
  if (!req.body.body) errors.push("You must provide content.");

  return errors;
}

// Middleware to check authentication
function mustBeLoggedIn(req, res, next) {
  if (!req.user) return res.redirect("/");
  next();
}

app.get("/create-post", mustBeLoggedIn, (req, res) => {
  res.render("create-post", { errors: [], page: "create-post" });
});

// ✅ Fixed: Handle post creation correctly
app.post("/create-post", mustBeLoggedIn, (req, res) => {
  const errors = sharedPostValidation(req, res);

  if (errors.length) {
    return res.render("create-post", { errors, page: "create-post" });
  }

  console.log("Creating post with data:", req.body);

  const statement = db.prepare(
    `INSERT INTO posts (title, content, authorid, createDate) VALUES (?, ?, ?, ?)`
  );

  try {
    const result = statement.run(
      req.body.title,
      req.body.body, // ✅ Ensure 'content' is passed here
      req.user.userid,
      new Date().toISOString()
    );

    res.redirect(`/dashboard`);
  } catch (error) {
    console.error("Database insert error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ✅ Fixed: Render edit post page
app.get("/edit-post/:id", mustBeLoggedIn, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);

  if (!post) return res.status(404).send("Post not found.");
  if (post.authorid !== req.user.userid) return res.status(403).send("Unauthorized.");

  res.render("edit-post", { post });
});

// ✅ Fixed: Update post
app.post("/update-post/:id", mustBeLoggedIn, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);

  if (!post) return res.status(404).send("Post not found.");
  if (post.authorid !== req.user.userid) return res.status(403).send("Unauthorized.");

  db.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?").run(
    req.body.title,
    req.body.body,
    req.params.id
  );

  res.redirect(`/posts/${req.params.id}`);
});

// ✅ Fixed: Delete post
app.post("/delete-post/:id", mustBeLoggedIn, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);

  if (!post) return res.status(404).send("Post not found.");
  if (post.authorid !== req.user.userid) return res.status(403).send("Unauthorized.");

  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);

  res.redirect("/");
});

// ✅ Fixed: View single post
app.get("/posts/:id", (req, res) => {
  const post = db.prepare(
    "SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.authorid = users.id WHERE posts.id = ?"
  ).get(req.params.id);

  if (!post) return res.status(404).send("Post not found.");

  res.render("single-posts", { post, user: req.user });
});

// ✅ Fixed: Login route
app.post("/login", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(req.body.username);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
    return res.render("login", { errors: ["Invalid credentials"], page: "login" });
  }

  const token = jwt.sign({ userid: user.id, username: user.username }, process.env.JWTSECRET, { expiresIn: "7d" });
  res.cookie("overSimpleApp", token, { httpOnly: true });

  res.redirect("/dashboard");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
