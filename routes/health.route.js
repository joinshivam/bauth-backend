const router = require('express').Router();
router.get("/health", (req, res) => {
    res.json({
        msg: "hello"
    });
})