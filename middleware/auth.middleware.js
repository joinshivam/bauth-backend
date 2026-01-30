const Users = require("../models/users");

module.exports = {
    auth: async (req, res, next) => {
        try {
            const token = req.cookies.user_access;
            if (!token) {
                return res.status(401).json({
                    ok: false,
                    message: `Method not allowed ${token}`
                })
            }
            const [sessions] = await Users.getSessionByToken(token);
            if (!sessions || sessions.length === 0) {
                res.clearCookie("user_access");
                return res.status(401).json({
                    ok: false,
                    message: "Session expired or revoked"
                });
            }
            const session = sessions[0];
            if (!session) {
                return res.status(401).json({
                    ok: false,
                    message: `Invalid or expired session.${session}`
                })
            }

            const userId = session.user_id;
            const [rows] = await Users.findById(userId);
            if (!rows || rows.length === 0) {
                const isProduction = process.env.ENV === "production";
                res.cookie("user_access", token, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: "strict",
                    maxAge: 0
                });
                return res.status(401).json({
                    ok: false,
                    message: "User not found or removed."
                });
            }

            req.users = rows[0];
            next();
        } catch (err) {
            console.error("AUTH_MIDDLEWARE_ERROR:", err);
            return res.status(500).json({
                ok: false,
                message: "Server error"
            });
        }
    }
}