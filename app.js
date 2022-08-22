const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const viewpath = __dirname + '/public/';
app.use(express.static(viewpath));

mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.2a2mc.mongodb.net/drag-game`)
    .then(() => console.log("Connected to DB"))
    .catch((err) => console.log(err));

const User = require("./models/user.model");
const { writeFile, readFile } = require("fs");
const { dirname } = require("path");
const path = require("path");

app.post("/register", async function (req, res, next) {
    const { username, password } = req.body;
    if (!username) return res.status(400).send({ message: "username invalid" });
    if (!password || password.length < 8) return res.status(400).send({ message: "password invalid" });
    const cryptedPassword = crypto.createHash("sha256").update(password).digest("hex");
    User.create({ username: username, password: cryptedPassword }, function (err, docs) {
        if (err) return res.status(400).send({ message: "username already present" });
        return res.json(req.body);
    });
});

app.post("/login", validateUser, async function (req, res, next) {
    return res.status(200).send({ message: "Correct login credentials" });
});

app.post("/score", validateUser, async function (req, res, next) {
    let score = req.body.score || 0;
    readFile("./scorelist.json", { encoding: "utf-8" }, function (err, data) {
        if (err) return res.status(500).send({ message: "server error" });
        const arr = JSON.parse(data);
        arr.unshift({ username: req.body.username, score: score });
        if (arr.length > 10) arr.length = 10;
        writeFile("./scorelist.json", JSON.stringify(arr), function () {
            return res.status(200).send();
        });
    });
});

app.get("/score", validateUser, async function (req, res, next) {
    return res.sendFile(path.join(__dirname, "scorelist.json"));
});

app.listen(8080, function () {
    console.log("Server started on port 8080");
});

async function validateUser(req, res, next) {
    try {
        const [username, password] = basicAuthCredentials(req);
        User.findOne({ username: username }, function (err, docs) {
            if (err || docs === null)
                return res.status(401).send({ message: "unauthorized access" });
            if (docs.password !== crypto.createHash("sha256").update(password).digest("hex"))
                return res.status(401).send({ message: "password wrong" });
            req.body.username = docs.username.toString();
            next();
        });
    } catch(err) {
        return res.status(401).send({ message: "unauthorized access" });
    }
}

function basicAuthCredentials(req) {
    const base64Credentials = req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    return credentials.split(':');
}
