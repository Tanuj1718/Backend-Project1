import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Internal Server Error while generating tokens")
    }
}

const registerUser = asyncHandler( async (req, res)=>{
    //  STEPS: 
    // get the user details from frontend
    // validation (means like email is in correct format, every thing should be filled or not)
    // check if user already exists (can be checked through email or username whichever is unique)
    // check for images, check for avatar (check for everything which is required true in model)
    // upload them in cloudinary
    // now we have links of all the files uploaded in cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check if user is created in db or not(response should not be null)
    // if user is created, return res, else return error

    const {fullName, email, username, password } = req.body
    console.log("email: ", email);

    //2. validation
    if(
        [fullName, email, username, password].some((field)=>(
            field?.trim()===""
        ))){
            throw new ApiError(400, "All fields are required")
        }

    //3. check if user already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) throw new ApiError(400, `${username} or ${email} already exists`)

    //4. taking local path of avatar and cover image 
    const avatarLocalPath = req.files?.avatar[0]?.path; //currently not uploaded on cloudinary
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    //checking for avatar
    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required")

    //5. Uploading on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath) 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400, "Avatar file is required")

    //6. Create user object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //7. Remove password and refreshToken

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //8. checking if user is created or not
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    //9. if all the operations are successfully executed then returning response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )


})

//login
const loginUser = asyncHandler(async (req, res)=>{
    // take data from req body
    // check if username or email is in db or not
    // find the user 
    // if user is available then do password check
    // if password is correct then generate and send access token and refresh token to the user
    // send all these in cookies and then send response

    //1.
    const {username, email, password} = req.body
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }

    //3.
    const user = await User.findOne({
        //below is mongodb operator which takes objects inside an array
        $or: [{username}, {email}] //ya toh username k base pr mil jaye ya email k base par
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    //4.
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    //5.
    //made a method for refresh and access token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    //6.
    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, {
                user: loggedInUser, accessToken, refreshToken
            }, "User logged in Successfully"
        )
    )

})

//logout
//clear cookies and refresh token
const logoutUser = asyncHandler(async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

//token refresh for login 
const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken)?._id
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        //generating new refresh token 
        const options = {
            httpOnly: true, 
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken, newRefreshToken}, "Access token refreshed")
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) throw new ApiError(400, "Invalid Password")

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, username, email} = req.body
    if(!(fullName || username || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                username,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is missing")

    const avatar = await uploadOnCloudinary((avatarLocalPath))
    if(!avatar.url) throw new ApiError(400, "Error while uploading on avatar")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )

})

//TODO for me: make a controller for updating cover image


export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails, updateUserAvatar
}