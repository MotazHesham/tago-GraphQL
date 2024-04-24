const express = require("express");

const authController = require("../controllers/authController");
const authValidator = require("../validations/authValidation");

const router = express.Router();

router.post(
    "/login",
    authValidator.postSigninValidation,
    authController.postLogin
); 

router.put(
    "/signup",
    authValidator.postSignupValidation,
    authController.putSignup
);
router.post("/logout", authController.postLogout);

// router.get("/resetPassword", authController.getReset);
// router.post("/resetPassword", authController.postReset);
// router.get("/resetPassword/:token", authController.getToken);
// router.post("/new-password", authController.postNewpassword);

module.exports = router;
