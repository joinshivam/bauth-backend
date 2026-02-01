require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const { connectDB } = require('./database/database');
const http = require("http");
const { Server } = require("socket.io");
const setupSocket = require("./chat/socket");


const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
let DB_HEALTH = false;
const allowedOrigins = [
  "http://localhost:3000",
  "https://joinshivam-bauth.vercel.app",
  "https://sbb7308z-3000.inc1.devtunnels.ms",
  "https://bauth-client.onrender.com",
  "https://joinshivam-global-chat.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
//app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.set('trust proxy', true);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
(async () => {
    console.log(`start ${new Date()}`);
    try {
        await connectDB();
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
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

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
setupSocket(io);
app.get("/", (req, res) => {
    res.status(200).send("ok");
})

server.listen(PORT, "0.0.0.0", () => {
  console.log("Auth + Chat server running on port", PORT);
});
