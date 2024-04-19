import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


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

    //3.
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) throw new ApiError(400, `${username} or ${email} already exists`)

    //4.
    const avatarLocalPath = req.files?.avatar[0]?.path; //currently not uploaded on cloudinary
    const coverImageLocalPath = req.files?.converImage[0]?.path;

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

    //8.
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user")
    }

    //9.
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )


})


export {registerUser}