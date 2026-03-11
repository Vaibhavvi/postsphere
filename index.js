const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const UserModel = require('./models/user');
const PostModel = require('./models/post');

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine and views directory
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// -------------------------------------------
// Routes
// -------------------------------------------

// Home page
app.get("/", async (req, res) => {
    const posts = await PostModel.find().sort({ createdAt: -1 });
    res.render("index", { 
        posts,
        user: req.user // set this from your session or JWT middleware
    });
});

// Registration page
app.get("/register", (req, res) => {
    res.render("registration");
});

// Register user
app.post("/register", async (req, res) => {
    try {
        let { username, name, email, age, password } = req.body;

        // Check if user exists
        let user = await UserModel.findOne({ email });
        if (user) {
            return res.status(500).send("User already exists!");
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Create user
        let newUser = await UserModel.create({
            username,
            name,
            email,
            age,
            password: hash
        });

        // Generate JWT token
        let token = jwt.sign({ email: email, userid: newUser._id }, "shhhhh");
        res.cookie("token", token);

        res.send("Registration Successful");
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }
});

// Login page
app.get("/login", (req, res) => {
    res.render("login");
});

// Login user
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).send("Invalid email or password");
        }

        // Redirect to homepage
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.status(500).send("Server error");
    }
});

// Logout user
app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

// Start server
app.listen(3000, () => {
    console.log("Server running on localhost:3000");
});