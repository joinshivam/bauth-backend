require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const { connectDB } = require('./database/database');


const app = express();
const PORT = process.env.ENV_PORT || 5000;
let DB_HEALTH = false;

const allowedOrigins = [
    "http://localhost:3000",
    "localhost:3000",
    "http://127.0.0.1:3000",
    "https://sbb7308z-3000.inc1.devtunnels.ms/",
];

function isAllowed(origin) {
    if (!origin) return true;

    return allowedOrigins.some(allowed => {
        if (allowed.includes("*")) {
            const regex = new RegExp(
                "^" + allowed.replace(/\*/g, ".*") + "$"
            );
            return regex.test(origin);
        }
        return allowed === origin;
    });
}

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowed(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    credentials: true
}));

app.use(cookieParser());
// app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.set('trust proxy', true);
(async () => {
    console.log(`start ${new Date()}`);
    try {
        await connectDB();
        // app.use("/resources/:file", express.static(path.join(__dirname, "uploads/resources/")));
        app.use("/bauth/account/signup", express.static(path.join(__dirname, "public/auth/")));

        app.use("/api/media", require("./routes/media.route"));
        app.use("/api/auth", require("./routes/user.route"));
        DB_HEALTH = true;
    } catch (err) {
        console.log("Database Error : ", {
            msg: err.message || "Error Found",
            db_health: DB_HEALTH ? "alive" : "died",
            ERR_OBJECT: err
        });
    }
})()

app.use("/api/health", (req, res) => {
    try {
        res.json({
            ok: DB_HEALTH,
            database: DB_HEALTH ? "alive" : "died",
            backend: "alive"
        })
    } catch (err) {
        res.json({
            ok: false,
            message: `failed to connect : ${err.message}`,
            status_code: err?.status_code
        });
    }
})

app.get("/ping", (req, res) => {
    res.json({ ok: true, status: "backend-alive" });
});




app.listen(PORT, "0.0.0.0", () => console.log("Server running on port 5000"));
