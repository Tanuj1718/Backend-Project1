//it is required for user id when we log out
//it will verify whether the user exists or not

import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, _ , next)=>{
try {
        const token = await req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
    
            // discuss about frontend
            throw new ApiError(401, "Invalid access token")
        }
    
        req.user = user;
        next()

} catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
}

})

