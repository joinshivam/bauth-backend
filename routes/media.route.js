const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { AvatarSvg } = require("../utils/avtar")
const { auth } = require("../middleware/auth.middleware");
const Users = require("../models/users");

router.get("/:username", auth, async (req, res) => {
    try {
        const Username = req.params.username.toString().toLowerCase().trim();
        const UserId = req.users.id;
        const [rows] = await Users.findByUsername(Username);
        if (!rows.length) {
            return res.status(403).json({ message: "401 Media Restricted" });
        }

        const user = rows[0];
        if (user?.id !== UserId) {
            return res.status(403).json({ message: "403 Media Restricted forbidden" });
        }
        if (user.photo) {
            const filePath = path.join(
                __dirname,
                "../uploads/profile",
                user.photo
            );

            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            }
        }

        const svg = AvatarSvg(user.name);
        res.setHeader("Content-Type", "image/svg+xml");
        return res.send(svg);


    } catch (err) {
        console.error("PROFILE_PHOTO_ERROR:", err);
        res.status(500).json({ ok: false, message: err.message });
    }
});
router.get("/resources/:filename", auth, async (req, res) => {
    try {
        const requestedFile = req.params.filename;

        const filePath = path.join(__dirname, "../uploads/resources", requestedFile);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ ok: false, message: "File not found" });
        }

        res.sendFile(filePath);

    } catch (err) {
        console.error("PROFILE_PHOTO_ERROR:", err);
        res.status(500).json({ ok: false, message: err.message });
    }
});

module.exports = router;
