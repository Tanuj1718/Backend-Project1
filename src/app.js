import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"})) //agar json m data aayega toh
app.use(express.urlencoded({extended: true, limit: "16kb"})) // agar url se data aayega toh
app.use(express.static("public")) //file pdf images store krke k liye
app.use(cookieParser()) //cookie se data lene k liye






export { app }