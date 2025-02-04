import mongooes from 'mongoose'
import { DB_NAME } from '../constants.js'
import logger from '../utils/logger.js'

const connectDB = async () => {
      try {
            const connectionInstance = await mongooes.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

            logger.info(`Database connection sucesfully to host: ${connectionInstance.connection.host}`)
            console.log(`Database connection sucesfully to host: ${connectionInstance.connection.host}`)
      } catch (error) {
            logger.error("Database connection error", error)
            console.log("Database connection error", error)
            process.exit(1)
      }
}

export default connectDB