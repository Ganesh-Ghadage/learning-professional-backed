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

const deleteFromCloudinary = async (publicUrl) => {
      try {
            const publicId = 'vidtube/' + publicUrl.split('/').pop().split('.').slice(0, -1).join('.')
            
            const result = await cloudinary.uploader.destroy(publicId) 
            
            if (result.result === "ok") {
                  logger.info(`File deleted from Cloudinary: ${publicId}`);
                  return true; 
            } else {
                  logger.warn(`File deletion failed for: ${publicId}`);
                  return false; 
            }
      } catch (error) {
            logger.error("Error deleting file from Cloudinary:", error);
            throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
      }
}

export { uploadOnCloudinary, deleteFromCloudinary }