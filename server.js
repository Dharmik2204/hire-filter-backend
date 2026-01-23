import app from "./app.js";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";
dotenv.config();


const PORT = process.env.PORT || 8080;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on Port ${PORT}`);
        })
    }).catch((err) => {
        console.error("Error", err);
        process.exit(1);
    });
