import dotenv from 'dotenv'
import { app } from './app.js'
import connectDB from './db/index.js'
import logger from './utils/logger.js'

dotenv.config({
    path: './.env'
})

const PORT = process.env.PORT || 8001


connectDB()
.then(() => {
    app.listen(PORT, () => {
        logger.info(`Server is listening to port: ${PORT}`)
        console.log(`Server is listening to port: ${PORT}`)
    })
})
.catch((error) => {
    logger.error("Database connection failed", error)
    console.log("Database connection failed", error)
})