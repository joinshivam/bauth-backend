const Users = require("../models/users");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const UAParser = require('ua-parser-js');
const { getDB } = require("../database/database");
const { replacePhoto } = require("../utils/avtar");
const path = require("path");

const createAccessToken = () => {
    return crypto.randomBytes(32).toString("hex");
};
const ACCESS_EXPIRE_SECONDS = parseInt(process.env.ACCESS_TOKEN_EXPIRES || "3600m") * 60;
const isProduction = process.env.ENV === "production";
module.exports = {
    // Curd - c
    register: async (req, res) => {
        try {
            let { name, dob, gender, username, password, aggrement } = req.body;
            const parser = new UAParser(req.headers['user-agent']);
            const deviceInfo = parser.getResult();
            const USER_AGENT = `${deviceInfo.browser.name}-${deviceInfo.os.name}-${deviceInfo.device.type || 'desktop'}-req:${req.headers['user-agent']}`;
            const USER_IP =
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.socket.remoteAddress;
            ;
            const ValidName = Users.validateName(name);
            const ValidDob = Users.validateDob(dob);
            const ValidGender = Users.validateGender(gender);
            const ValidUsername = Users.validateUsername(username);
            const ValidPassword = Users.validatePassword(password);

            if (aggrement === false) return res.status(400).json({ success: false, message: `Please accept agreement to continue.`, field: "aggrement" });

            const db = getDB();
            const postfix = `@${process.env.DOMAIN || "onemb.com"}`
            const [exists] = await Users.findByUsername(username);

            if (exists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Username already Taken!",
                    field: "username"
                });
            }
            const email = ValidUsername + postfix;
            const hashedPassword = await bcrypt.hash(ValidPassword, 10);

            const [Result] = await db.query(
                `INSERT INTO users (name,dob,gender, username,email,postfix, password , agreement) 
                 VALUES (?, ?, ?, ? , ? , ? , ?, ?)`,
                [ValidName, ValidDob, ValidGender, ValidUsername, email, postfix, hashedPassword, aggrement ? 1 : 0]
            );
            const userId = Result.insertId;
            const [userRows] = await Users.findById(userId);
            const user = userRows[0];
            const Email = user?.email

            const accessToken = createAccessToken({ id: user.id, email: Email });

            const SESSION = await Users.setSession({ id: user.id, accessToken: accessToken, agent: USER_AGENT, ip: USER_IP });
            if (!SESSION) {
                return res.json({
                    ok: false,
                    field: "global",
                    message: "Unable to Create Session"
                })
            }
            res.cookie("user_access", accessToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: "none",
                maxAge: ACCESS_EXPIRE_SECONDS * 1000,
                path: "/"
            });
            return res.json({
                success: true,
                message: "Signup success",
                field: "global",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user?.username,
                    phone: user.phone,
                    phone_verify: user.phone_verified,
                    photo: user.photo,
                    gender: user.gender,
                    dob: user.dob,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            });
        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "Global",
                message: `Signup Error :${err?.message || "Unknown Type Error"}`
            });
        }
    },
    // CuRd - r
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const parser = new UAParser(req.headers['user-agent']);
            const deviceInfo = parser.getResult();
            const USER_AGENT = `${deviceInfo.browser.name}-${deviceInfo.os.name}-${deviceInfo.device.type || 'desktop'}-req:${req.headers['user-agent']}`;
            const USER_IP =
                req.headers['x-forwarded-for']?.split(',')[0] ||
                req.socket.remoteAddress;
            ;

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: !username ? "Invalid Username." : "Enter Password to Login"
                });
            }

            const [rows] = await Users.findByUsername(username?.toLowerCase().trim());

            if (!rows || rows.length === 0) return res.status(400).json({ field: "username", success: false, msg: "Users not found" });

            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(400).json({ field: "password", success: false, msg: "Incorrect password" });

            const accessToken = createAccessToken({ id: user.id, email: user?.email });

            const SESSION = await Users.setSession({ id: user.id, accessToken: accessToken, agent: USER_AGENT, ip: USER_IP });
            if (!SESSION) {
                return res.json({
                    ok: false,
                    field: "global",
                    message: `Unable to Login! Session error`
                })
            }
            res.cookie("user_access", accessToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                maxAge: ACCESS_EXPIRE_SECONDS * 1000,
                path: "/"
            });


            res.json({
                success: true,
                message: "Login success",
                user: {
                    id: user?.id,
                    name: user?.name,
                    email: user?.email,
                    username: user?.username,
                    phone: user?.phone,
                    photo: user?.photo,
                    gender: user?.gender,
                    dob: user?.dob,
                    verified: user?.phone_verified,
                    created_at: user?.created_at,
                    updated_at: user?.updated_at
                }
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    isUser: async (req, res) => {
        try {
            const { username } = req.body;
            if (!username?.trim()) {
                return res.status(400).json({
                    success: false,
                    field: "username",
                    message: "Enter Username to login."
                });
            }

            const [rows] = await Users.findByUsername(username?.trim());

            if (!rows || rows.length === 0) return res.status(400).json({ success: false, feild: "global", message: "Users not found! create new account" });
            const user = rows[0];
            res.json({
                success: true,
                username: user.email,
                msg: "pending..."
            });

        } catch (err) {
            console.error("USER_LOGIN_ERROR:", err);
            res.status(500).json({ field: "global", message: err.message });
        }
    },
    verify: async (req, res) => {
        try {
            const { otp } = req.body;
            if (otp === "otp") {
                console.log("Verified account");
            }
        } catch (err) {
            console.log("Error Verify");
        }
    },
    getMe: async (req, res) => {
        try {
            const UsersId = req.users.id;
            const [rows] = await Users.findById(UsersId);

            if (!rows || rows.length === 0) {
                return res.status(404).json({ success: false, message: "Session Invalid" });
            }

            const user = rows[0];
            return res.json({
                success: true,
                user: {
                    id: user?.id,
                    name: user?.name,
                    email: user?.email,
                    username: user?.username,
                    phone: user?.phone,
                    photo: user?.photo,
                    gender: user?.gender,
                    dob: user?.dob,
                    verified: user?.phone_verified,
                    created_at: user?.created_at,
                    updated_at: user?.updated_at
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }

    },
    username_check: async (req, res) => {
        try {
            let { username } = req.body
            username = username.trim().toLowerCase();

            const usernameRegex = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    success: false,
                    available: false,
                    message: "Invalid username.",
                    field: "username"
                });
            }
            if (!username) {
                return res.json({ success: false, available: false, message: "enter any input." });
            }

            const [rows] = await Users.findByUsername(username);

            if (rows.length > 0) {
                return res.json({
                    success: false,
                    available: false,
                    message: "username already taken"
                });
            }
            return res.json({
                success: true,
                available: true,
                message: "Username is available"
            });
        } catch (err) {
            console.log("USERNAME_CHECK_ERR : ", err);
            return res.json({
                success: false,
                available: false,
                message: "unabale to check username! Internal Server Error."
            })
        }
    },
    logout: async (req, res) => {
        try {
            const token = req.cookies?.user_access;
            if (!token) return res.json({ success: false, message: "Unable to logout undefined session" })
            await Users.revokeSession(token);
            res.clearCookie("user_access");
            return res.json({ status: true, msg: "Logged out" });
        } catch (err) {
            console.error("USER_LOGOUT_ERROR:", err);
            return res.status(500).json({ error: err.message });
        }
    },
    logoutAll: async (req, res) => {
        try {
            const token = req.cookies?.user_access;
            const userId = req.users.id;
            if (!token) return res.json({ success: false, message: "Unable to logout by this device" })
            await Users.revokeSessionAll(token, userId);
            res.clearCookie("user_access");
            return res.json({ status: true, msg: "Logged out" });
        } catch (err) {
            console.error("USER_LOGOUT_ERROR:", err);
            return res.status(500).json({ error: err.message });
        }
    },
     getSessions: async (req, res) => {
        try {
            const userId = req.users.id;
            const limit = Number(req.query.limit || 5);

            const [rows] = await Users.findSessionsByUser(userId, limit);

            return res.json({
                success: true,
                limit: limit,
                total: rows.length,
                sessions: rows
            });

        } catch (err) {
            console.error("GET_SESSIONS_ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch sessions"
            });
        }
    }
    ,

    //---------- CUrd - u
    updateName: async (req, res) => {
        try {
            const { id } = req.users;
            const { name } = req.body;

            await Users.updateName(id, name);
            return res.json({ success: true, message: "Name updated" });

        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "name",
                message: err?.message || "Invalid Name"
            });
        }
    },
    updateDOB: async (req, res) => {
        try {
            const { id } = req.users;
            const { dob } = req.body;

            await Users.updateDOB(id, dob);
            return res.json({ success: true, message: "DOB updated" });

        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "dob",
                message: err?.message || "Invalid DOB"
            });
        }
    },
    updateGender: async (req, res) => {
        try {
            const { id } = req.users;
            const { gender } = req.body;

            await Users.updateGender(id, gender);
            return res.json({ success: true, message: "Gender updated" });

        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "gender",
                message: err?.message || "Invalid Gender"
            });
        }
    },
    updatePhone: async (req, res) => {
        try {
            const { id } = req.users;
            const { phone } = req.body;

            await Users.updatePhone(id, phone);
            return res.json({ success: true, message: "Phone updated" });

        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "phone",
                message: err?.message || "Invalid Phone"
            });
        }
    },
    updateUsername: async (req, res) => {
        const { username } = req.body;
        const id = req.users.id;

        try {
            await Users.updateUsername(id, username);
            return res.json({ success: true, message: "Username updated" });
        } catch (err) {
            return res.status(err.status || 400).json({
                success: false,
                field: err?.field || "username",
                message: err?.message || "Invalid Username"
            });
        }
    },
    updatePassword: async (req, res) => {
        try {
            const { id } = req.users;
            const { oldPassword, newPassword } = req.body;

            const [rows] = await Users.findById(id);
            if (rows.length === 0) return res.json({ success: false, message: "Invalid user" });

            const user = rows[0];
            const match = await bcrypt.compare(oldPassword, user.password);

            if (!match) return res.json({ success: false, message: "Old password incorrect" });

            const hashed = await bcrypt.hash(newPassword, 10);

            await Users.updatePassword(id, hashed);

            return res.json({ success: true, message: "Password updated" });
        } catch (err) {
            console.error("PASSWORD_UPDATE_ERR", err)
            return res.status(500).json({ success: false, message: err.message });
        }
    },
    updatePhoto: async (req, res) => {
        try {
            const { id } = req.users;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded"
                });
            }

            const filename = req.file;

            const result = await replacePhoto(id, filename);

            return res.json({
                success: true,
                message: "Photo updated",
                profilePhoto: result?.photo,
                updated_at: result?.updated_at
            });

        } catch (err) {
            console.error("PHOTO_UPDATE_ERR", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },


    // CurD - d
    delete: async (req, res) => {
        const userId = req.users.id;

        try {
            const [rows] = await Users.findById(userId);
            if (!rows || rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            await Users.delete(userId);
            return res.json({ success: true, message: "User Account Deleted! You are unable to Login" });

        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    },

    getAll: async (req, res) => {
        try {
            const [users] = await Users.findAll();
            res.json({ status: true, data: users });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

};
