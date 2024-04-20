import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.fields([
    //we have to upload files which cannot be uploaded through express so we uses multer middleware just before our main function registerUser. we have to take two files so we made two objects. now we can send images. 
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), registerUser)

router.route("/login").post(loginUser)

//SECURED ROUTES
router.route("/logout").post(verifyJWT, logoutUser)


export default router;