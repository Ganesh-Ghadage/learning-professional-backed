import { ApiError } from '../utils/ApiError.js'
import { ApiResponce } from '../utils/ApiResponce.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Video } from '../models/video.models.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import logger from '../utils/logger.js'
import mongoose from 'mongoose'

const getAllVideos = asyncHandler(async (req, res) => {
      const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.params

      if(query?.trim() === ""){
            throw new ApiError(400, "Query must be avaliable to search Video")
      }


})

const publishVideo = asyncHandler(async (req, res) => {
      const { title, description } = req.body

      const videoLocalPath = req.files?.video[0]?.path
      const thumbnailLocalPath = req.files?.thumbnail[0]?.path

      try {
            if(title.trim() === ""){
                  throw new ApiError(400, "Title is required")
            }
      
            if(description.trim() === ""){
                  throw new ApiError(400, "Description is required")
            }
      
            if(!videoLocalPath){
                  throw new ApiError(400, "Video file is required")
            }
      
            if(!thumbnailLocalPath){
                  throw new ApiError(400, "Thumbnail file is required")
            }
      
            let video;
            let thumbnail;
            try {
                  video = await uploadOnCloudinary(videoLocalPath)
                  thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

                  if(!video || !thumbnail){
                        throw new ApiError(502, "Something went wrong while uploading files to cloudinary")
                  }

            } catch (error) {
                  throw new ApiError(500, "Error while uploading file to cloudinary")
            }

            // console.log(video)

            try {
                  const createdVideo = await Video.create({
                        owner: req?.user?._id,
                        videoFile: video?.url,
                        thumbnail: thumbnail?.url,
                        title,
                        description,
                        duration: video?.duration
                  })
      
                  const publishedVideo = await Video.findById(createdVideo?._id)
      
                  if(!publishedVideo){
                        throw new ApiError(500, "Something went wrong Video not published")
                  }

                  logger.log("info", `New video is published by ${publishedVideo.owner}, VideoID: ${publishedVideo._id}`)
                  return res
                  .status(200)
                  .json(new ApiResponce(200, publishedVideo, "Video published successfully"))

            } catch (error) {
                  if(video){
                        await deleteFromCloudinary(video.public_id)
                  }
                  if(thumbnail){
                        await deleteFromCloudinary(thumbnail.public_id)
                  }

                  throw new ApiError(500, "Something went wrong Video not published")
            }

      } catch (error) {
            logger.error("Video upload failed", error)
            throw new ApiError(500, error)
      }
})


export {
      getAllVideos,
      publishVideo
}