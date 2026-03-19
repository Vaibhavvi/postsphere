const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");

const UserModel = require('./models/user');
const PostModel = require('./models/post');

// ===============================
// 🔧 CONFIGURATION
// ===============================
const PORT = 3000;
const JWT_SECRET = "shhhhh";

// ===============================
// 🔧 MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ===============================
// 🔐 AUTH MIDDLEWARE
// ===============================
function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).send("You must be logged in...");
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data;
        next();
    } catch (err) {
        return res.status(401).send("Invalid or expired token");
    }
}

// ===============================
// 🎮 CONTROLLERS (LOGIC)
// ===============================

// Home
async function getHome(req, res) {
    const posts = await PostModel.find().sort({ createdAt: -1 });

    res.render("index", {
        posts,
        user: req.user || null
    });
}

// Profile
async function getProfile(req, res) {
    try {
        const user = await UserModel.findById(req.user.userid);
        const posts = await PostModel.find({ user: req.user.userid })
            .sort({ createdAt: -1 });

        res.render("profile", { user, posts });

    } catch (err) {
        res.status(500).send("Server error");
    }
}

// Register
async function registerUser(req, res) {
    try {
        const { username, name, email, age, password } = req.body;

        let user = await UserModel.findOne({ email });
        if (user) return res.send("User already exists!");

        const hash = await bcrypt.hash(password, 10);

        const newUser = await UserModel.create({
            username,
            name,
            email,
            age,
            password: hash
        });

        const token = jwt.sign(
            { email, userid: newUser._id },
            JWT_SECRET
        );

        res.cookie("token", token);
        res.redirect("/profile")

    } catch (err) {
        res.status(500).send("Server error");
    }
}

// Login
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        const user = await UserModel.findOne({ email });
        if (!user) return res.send("Invalid credentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send("Invalid credentials");

        const token = jwt.sign(
            { email, userid: user._id },
            JWT_SECRET
        );

        res.cookie("token", token);
        res.redirect("/profile");

    } catch (err) {
        res.status(500).send("Server error");
    }
}

async function createPost(req, res) {
    try {
        const { content } = req.body;

        await PostModel.create({
            content,
            user: req.user.userid
        });

        res.redirect("/profile");

    } catch (err) {
        res.status(500).send("Error creating post");
    }
}

// Delete Post
app.post("/delete-post/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await PostModel.findById(req.params.id);

        // सुरक्षा: only owner can delete
        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send("Unauthorized");
        }

        await PostModel.findByIdAndDelete(req.params.id);
        res.redirect("/profile");

    } catch (err) {
        res.status(500).send("Error deleting post");
    }
});


// Edit Post (show edit page)
app.get("/edit-post/:id", isLoggedIn, async (req, res) => {
    try {
        const post = await PostModel.findById(req.params.id);

        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send("Unauthorized");
        }

        res.render("edit", { post });

    } catch (err) {
        res.status(500).send("Error loading edit page");
    }
});


// Update Post
app.post("/update-post/:id", isLoggedIn, async (req, res) => {
    try {
        const { content } = req.body;
        const post = await PostModel.findById(req.params.id);

        if (post.user.toString() !== req.user.userid) {
            return res.status(403).send("Unauthorized");
        }

        post.content = content;
        await post.save();

        res.redirect("/profile");

    } catch (err) {
        res.status(500).send("Error updating post");
    }
});

// Read one post
app.get("/post/:id", async (req, res) => {
    try {
        const post = await PostModel.findById(req.params.id);

        res.render("singlePost", { post });

    } catch (err) {
        res.send("Post not found");
    }
});

// Logout
function logoutUser(req, res) {
    res.cookie("token", "");
    res.redirect("/");
}

// ===============================
// 🛣️ ROUTES
// ===============================

// Pages
app.get("/", getHome);
app.get("/profile", isLoggedIn, getProfile);
app.get("/register", (req, res) => res.render("registration"));
app.get("/login", (req, res) => res.render("login"));
app.post("/create-post", isLoggedIn, createPost);

// Actions
app.post("/register", registerUser);
app.post("/login", loginUser);
app.get("/logout", logoutUser);

// ===============================
// 🚀 SERVER
// ===============================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});