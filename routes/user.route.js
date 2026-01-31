const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const { auth } = require("../middleware/auth.middleware");
const { uploadPhoto } = require("../middleware/upload.middleware");

// PUBLIC ROUTES
router.post("/signup", userController.register);
router.post("/login", userController.login);
router.post("/username", userController.isUser);
router.post("/username-check", userController.username_check);

// PROTECTED ROUTES
router.post("/verify", userController.login);
router.post("/me", auth, userController.getMe);
router.get("/session-history",auth, userController.getSessions);
router.get("/all", auth, userController.getAll);
router.post("/logout", auth, userController.logout);

// UPDATE PROFILE ROUTES
router.put("/update-name", auth, userController.updateName);
router.put("/update-dob", auth, userController.updateDOB);
router.put("/update-gender", auth, userController.updateGender);
router.put("/update-username", auth, userController.updateUsername);
router.put("/update-phone", auth, userController.updatePhone);
router.put("/update-password", auth, userController.updatePassword);
router.put("/update-photo", auth, uploadPhoto.single("photo"),userController.updatePhoto);

// DELETE Account
router.delete("/delete/:id", auth, userController.delete);

// EXPORT ROUTER
module.exports = router;
