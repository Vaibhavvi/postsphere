const express = require('express');
const app = express();
const path = require('path');
const UserModel = require('./models/user');
const PostModel = require('./models/post');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

// middleware use for parsing json and urlencoded data and serving static files

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// Middleware for setting up the view engine and views directory

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.get("/", (req, res) => {
    res.render("registration");
});

app.post("/register", async (req, res) => {
    let { username, name, email, age, password } = req.body;

    let user = await UserModel.findOne({ email });
    if (user) return res.status(500).send("User already exists !");

    bcrypt.genSalt(10, (err, salt) => {

        bcrypt.hash(password, salt, async (err, hash) => {

            let user = await UserModel.create({
                username,
                name,
                email,
                age,
                password: hash
            });

            let token = jwt.sign(
                { email: email, userid: user._id },
                "shhhhh"
            );

            res.cookie("token", token);
            res.send("Registration Successful !");
        });

    });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
});

app.get("/logout", (req, res) => {
});

app.listen(3000, (req, res) => {
    console.log("Server host on localhost 3000 : ")
})