const express = require('express');
const bodyParser = require("body-parser");
const mongodb = require('mongodb');
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require('uuid');
const path = require("path");

const app = express();
app.set("view engine", "ejs");

const jsonParser = bodyParser.json();

app.use(jsonParser);
app.use(cookieParser());

const uri = 'mongodb://localhost:27017';
const client = new mongodb.MongoClient(uri);
let dbo = null;

async function dbInit() {
    await client.connect();
    dbo = client.db("ITI");
    app.listen(8088, function() {
        console.log('Server is listening at port 8088');
    });
}

dbInit();

async function auth(req, res, next) {
    if (req.cookies.sid) {
        const user = await dbo.collection("users").findOne({ sid: req.cookies.sid });
        if (user) {
            req.user = user;
            next();
        } else {
            res.render("message.ejs",{ msg: "Error: Not Authenticated User" });
        }
    } else {
        res.render("message.ejs",{ msg: "Error: Not Authenticated User" });
    }
}

app.get("/bootstrap" , function(req,res) {
    res.sendFile(path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css'));
})

app.get('/login', function(req, res) {
    res.render('login.ejs');
});

app.post('/login', async function(req, res) {
    const data = req.body;
    console.log(data);
    if (data.email && data.password.length >= 8) {
        const user = await dbo.collection("users").
        findOne({ "email": data.email, "password": data.password });
        if (user) {
            const uuid = uuidv4();
            await dbo.collection("users").updateOne({ _id: user._id }, { $set: { sid: uuid } });
            res.cookie("sid", uuid);
            console.log("Good");
            res.send({ msg: "Success" });
        } else {
            console.log("Bad");
            res.send({ msg: "User Not Found" });
        }
    } else {
        console.log("Very Bad");
        res.send({ msg: "Invalid Username or Password" });
    }
});

app.get("/", async function(req, res) {
    res.redirect("/login");
});

app.get("/index", function(req, res) {
    res.render("index.ejs");
});

app.get("/register", function(req, res) {
    res.render("register.ejs");
});

app.post("/register",  async function(req, res) {
    const data = req.body;
    console.log(data);

            await dbo.collection("users").insertOne({email: data.email , password: data.password});
            // res.send({ msg: "Success" });
            res.redirect("/login");
});


app.get("/profile", auth, async function(req, res) {
    console.log();
    res.render("user.ejs" , {"user" : req.user});
});

app.get("/logout", auth, async function(req, res) {
    await dbo.collection("users").updateOne({ _id: req.user._id }, { $set: { sid: "" } });
    res.clearCookie("sid");
    res.send({ msg: "Logout Success" });
});