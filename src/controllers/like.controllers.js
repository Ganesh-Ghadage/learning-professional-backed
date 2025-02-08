import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import mongoose from 'mongoose'
import { Like } from '../models/like.models.js'
import { Video } from '../models/video.models.js'
import { Comment } from '../models/comments.models.js'
import { Tweet } from '../models/tweets.models.js'

const toggleVideoLike = asyncHandler(async(req, res) => {
      const { videoId } = req.params

      if(!mongoose.Types.ObjectId.isValid(videoId)){
            throw new ApiError(400, "Invalid Video Id")
      }

      if (!req?.user?._id) {
            throw new ApiError(403, "User must be logged in");
      }

      const video = await Video.findById(videoId)

      if(!video){
            throw new ApiError(404, "Video not found")
      }

      const existingLike = await Like.findOne({
            likedBy: req?.user?._id,
            video: videoId
      })

      if(!existingLike){
            const newLike = await Like.create({
                  likedBy: req?.user?._id,
                  video: videoId
            })

            return res
                  .status(200)
                  .json(new ApiResponse(200, newLike, "User liked the video"))
      }else {
            await Like.deleteOne({ _id: existingLike._id });

            return res
                  .status(200)
                  .json(new ApiResponse(200, {}, "User disliked the video"))
      }
})

const toggleCommentLike = asyncHandler(async(req, res) => {
      const { commentId } = req.params

      if(!mongoose.Types.ObjectId.isValid(commentId)){
            throw new ApiError(400, "Invalid Comment Id")
      }

      if (!req?.user?._id) {
            throw new ApiError(403, "User must be logged in");
      }

      const comment = await Comment.findById(commentId)

      if(!comment){
            throw new ApiError(404, "Comment not found")
      }

      const existingLike = await Like.findOne({
            likedBy: req?.user?._id,
            comment: commentId
      })

      if(!existingLike){
            const newLike = await Like.create({
                  likedBy: req?.user?._id,
                  comment: commentId
            })

            return res
                  .status(200)
                  .json(new ApiResponse(200, newLike, "User liked the comment"))
      }else {
            await Like.deleteOne({ _id: existingLike._id });

            return res
                  .status(200)
                  .json(new ApiResponse(200, {}, "User disliked the comment"))
      }
})


const toggleTweetLike = asyncHandler(async(req, res) => {
      const { tweetId } = req.params

      if(!mongoose.Types.ObjectId.isValid(tweetId)){
            throw new ApiError(400, "Invalid Tweet Id")
      }

      if (!req?.user?._id) {
            throw new ApiError(403, "User must be logged in");
      }

      const tweet = await Tweet.findById(tweetId)

      if(!tweet){
            throw new ApiError(404, "Tweet not found")
      }

      const existingLike = await Like.findOne({
            likedBy: req?.user?._id,
            tweet: tweetId
      })

      if(!existingLike){
            const newLike = await Like.create({
                  likedBy: req?.user?._id,
                  tweet: tweetId
            })

            return res
                  .status(200)
                  .json(new ApiResponse(200, newLike, "User liked the tweet"))
      }else {
            await Like.deleteOne({ _id: existingLike._id });

            return res
                  .status(200)
                  .json(new ApiResponse(200, {}, "User disliked the tweet"))
      }
})

const getLikedVideos = asyncHandler(async(req, res) => {
      
      if (!req?.user?._id) {
            throw new ApiError(403, "User must be logged in");
      }

      const likedVideos = await Like.find({
            likedBy: req?.user?._id,
            video: { $ne: null }
      }).populate("video")

      return res
            .status(200)
            .json(new ApiResponse(200, likedVideos, "Liked video fetched successfully"))

})

export {
      toggleVideoLike,
      toggleCommentLike,
      toggleTweetLike,
      getLikedVideos
}