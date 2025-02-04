import { v2 as cloudinary } from 'cloudinary';
import logger from './logger.js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

 // Configuration
cloudinary.config({ 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
      api_key: process.env.CLOUDINARY_API_KEY, 
      api_secret: process.env.CLOUDINARY_API_SECRET,
      
});

// file upload logic
const uploadOnCloudinary = async (localFilePath) => {
      try {
            if(!localFilePath) return null;
            const response = await cloudinary.uploader.upload(localFilePath, {
                  resource_type: 'auto',
                  folder: 'vidtube'
            })

            logger.info(`File uploded on cloudinary, File src: ${response.url} `)

            fs.unlinkSync(localFilePath)
            return response
            
      } catch (error) {
            logger.error("Error in file upload on cloudinary", error)
            fs.unlinkSync(localFilePath)
            return null
      }
}

const deleteFromCloudinary = async (publicId) => {
      try {
           const result = await cloudinary.uploader.destroy(publicId) 
           logger.info(`File deleted from cloudinary, File src: ${result?.url} `)
      } catch (error) {
            logger.error("Error in file delete from cloudinary", error)
            return null
      }
}

export { uploadOnCloudinary, deleteFromCloudinary }