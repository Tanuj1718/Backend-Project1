import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"})) //agar json m data aayega toh
app.use(express.urlencoded({extended: true, limit: "16kb"})) // agar url se data aayega toh
app.use(express.static("public")) //file pdf images store krke k liye
app.use(cookieParser()) //cookie se data lene k liye



//routes
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter) //router alag file m j isliye use likh rhe h wrna get likhte h::--::eg. of route-> https://localhost:8000/api/v1/users/register



export { app }