import { ApiError } from '../utils/ApiError.js'
import { ApiResponce } from '../utils/ApiResponce.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Video } from '../models/video.models.js'
import { Comment } from '../models/comments.models.js'
import { Like } from '../models/like.models.js' 
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import logger from '../utils/logger.js'
import mongoose from 'mongoose'
import fs from 'fs'

const getAllVideos = asyncHandler(async (req, res) => {
      let { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;
  
      // ✅ Ensure `page` and `limit` are numbers
      page = parseInt(page);
      limit = parseInt(limit);
  
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 10;
  
      const matchStage = {};
    
      if (query) {
            matchStage.$or = [
                  { title: { $regex: query, $options: "i" } },
                  { description: { $regex: query, $options: "i" } }
            ];
      }

      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            matchStage.owner = new mongoose.Types.ObjectId(userId);
      }

      // ✅ Sorting options
      const sortStage = {};
      sortStage[sortBy] = sortType === "asc" ? 1 : -1;

      // ✅ Aggregation Pipeline
      const aggregationPipeline = [
            { $match: matchStage },
            {
                  $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner"
                  }
            },
            {
                  $addFields: {
                        owner: { $arrayElemAt: ["$owner", 0] } // Get the first element of the array
                  }
            },
            {
                  $project: {
                        title: 1,
                        description: 1,
                        videoFile: 1,
                        owner: { _id: 1, userName: 1, avatar: 1 },
                        thumbnail: 1,
                        views: 1,
                        createdAt: 1
                  }
            },
            { $sort: sortStage }
      ];

      const options = { page, limit };
      const videos = await Video.aggregatePaginate(Video.aggregate(aggregationPipeline), options);

      logger.log("info", "Video fetched successfully")

      return res
          .status(200)
          .json(new ApiResponce(200, videos, "Videos fetched successfully"));
});
  

const publishVideo = asyncHandler(async (req, res) => {
      const { title, description } = req.body

      const videoLocalPath = req.files?.video[0]?.path
      const thumbnailLocalPath = req.files?.thumbnail[0]?.path

      try {
            if (!title || title.trim() === "") {
                  throw new ApiError(400, "Title is required");
            }
      
            if (!description || description.trim() === "") {
                  throw new ApiError(400, "Description is required");
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
                  logger.error("Cloudinary video upload failed", error);
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

                  logger.error("Database video save failed", error);
                  throw new ApiError(500, "Something went wrong Video not published")
            }

      } catch (error) {
            if(videoLocalPath){
                  fs.unlinkSync(videoLocalPath)
            }
            if(thumbnailLocalPath){
                  fs.unlinkSync(thumbnailLocalPath)
            }

            logger.error("Video upload failed", error)
            throw new ApiError(500, error)
      }
})

const getVideoById = asyncHandler(async (req, res) => {
      const { videoId } = req.params

      if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid Video ID");
      }

      const video = await Video.findById(videoId).populate("owner", "_id userName email avatar");

      if(!video){
            throw new ApiError(404, "Video not found")
      }

      logger.log("info", "Video fetched successfully")
      return res
            .status(200)
            .json(new ApiResponce(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
      const { videoId } = req.params
      const { title, description } = req.body
      const thumbnailLocalPath = req.file?.thumbnail[0]?.path

      try {
            if(!mongoose.Types.ObjectId.isValid(videoId)){
                  throw new ApiError(400, "Invalid Video ID");
            }
      
            if (!title || title.trim() === "") {
                  throw new ApiError(400, "Title is required");
            }
      
            if (!description || description.trim() === "") {
                  throw new ApiError(400, "Description is required");
            }

            const video = await Video.findById(videoId)

            if(!video){
                  throw new ApiError(404, "Video not found")
            }

            if (video.owner.toString() !== req?.user?._id.toString()) {
                  throw new ApiError(403, "You are not authorized to update this video");
            }

            let thumbnail;
            
            if(thumbnailLocalPath){
                  try {
                        thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
      
                        if(!thumbnail){
                              throw new ApiError(500, "Error while updating video to cloudinary")
                        }
      
                  } catch (error) {
                        logger.error("Error while updating video to cloudinary", error)
                        throw new ApiError(500, "Error while updating video to cloudinary")
                  }
            }
            
            try {
                  const updatedVideo = await Video.findByIdAndUpdate(videoId, 
                        {
                              $set: {
                                    title,
                                    description,
                                    ...(thumbnail && {thumbnail: thumbnail?.url})
                              }
                        },
                        {new: true}
                  )

                  if (!updatedVideo) {
                        throw new ApiError(404, "Video not found");
                  }

                  logger.log("info", "Video updated successfully")
                  return res
                        .status(200)
                        .json(new ApiResponce(200, updatedVideo, "Video updated successfully"))
                  
            } catch (error) {
                  
                  if(thumbnail){
                        await deleteFromCloudinary(thumbnail.public_id)
                  }

                  logger.error("Error while updating video in database", error)
                  throw new ApiError(500, "Error while updating video in database")
            }


      } catch (error) {
            logger.error("Error while updating video", error)
            throw new ApiError(500, error.message || "Error while updating video")
      }
})

const deleteVideo = asyncHandler(async (req, res) => {
      const { videoId } = req.params

      try {
            if(!mongoose.Types.ObjectId.isValid(videoId)){
                  throw new ApiError(400, "Invalid Video ID");
            }
      
            const video = await Video.findById(videoId)

            if(!video){
                  throw new ApiError(404, "Video not found")
            }

            if (video.owner.toString() !== req?.user?._id.toString()) {
                  throw new ApiError(403, "You are not authorized to delete this video");
            }
      
            try {
                  if (video.videoFile) {
                        await deleteFromCloudinary(video.videoFile);
                  }
                  if (video.thumbnail) {
                        await deleteFromCloudinary(video.thumbnail);
                  }
            } catch (error) {
                  logger.error("Failed to delete video/thumbnail from Cloudinary", cloudinaryError);
                  throw new ApiError(500, "Failed to delete video from Cloudinary");
            }
      
            await Comment.deleteMany({
                  videoId: video?._id
            })
      
            await Like.deleteMany({
                  video: video?._id
            })
      
            await Video.findByIdAndDelete(videoId)
      
            logger.log('info', `video ${videoId} deleted successfully`)
            return res
                  .status(200)
                  .json(new ApiResponce(200, {}, "Video deleted successfully"))

      } catch (error) {
            logger.error("Error while deleting video:", error);
            throw new ApiError(500, "Error while deleting video");
      }

})

const togglePublishStatus = asyncHandler(async (req, res) => {
      const { videoId } = req.params

      if (!mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid Video ID");
      }

      const video = await Video.findById(videoId)

      if(!video){
            throw new ApiError(404, "Video not found")
      }

      if (video.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to update this video");
      }

      video.isPublished = !video?.isPublished
      await video.save()

      return res
            .status(200)
            .json(new ApiResponce(200, video, "Publish status toggled successfully"))

})

export {
      getAllVideos,
      publishVideo,
      getVideoById,
      updateVideo,
      deleteVideo,
      togglePublishStatus
}