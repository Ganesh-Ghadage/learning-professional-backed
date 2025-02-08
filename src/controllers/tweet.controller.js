import { Tweet } from "../models/tweets.models.js";
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from "mongoose";

const createTweet = asyncHandler( async(req, res) => {
      const { content } = req.body

      if(!content || content?.trim() === ""){
            throw new ApiError(400, "Content is required")
      }

      if(!req?.user?._id){
            throw new ApiError(403, "User must be logged in")
      }

      const tweet = await Tweet.create({
            owner: new mongoose.Types.ObjectId(req?.user?._id),
            content
      })

      if(!tweet){
            throw new ApiError(500, "Something went wrong tweet not created")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, tweet, "Tweet created successfully"))

})

const getUserTweets = asyncHandler(async(req, res) => {
      const { userId } = req.params

      if(!mongoose.Types.ObjectId.isValid(userId)){
            throw new ApiError(400, "Invalid User Id")
      }

      const tweets = await Tweet.find({
            owner: userId
      }).populate("owner", "_id userName email avatar")

      if (!tweets || tweets.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No tweets found for user"));
      }

      return res
            .status(200)
            .json(new ApiResponse(200, tweets, "Tweets fetched successfully"))
})

const updateTweet = asyncHandler(async(req, res) => {
      const { tweetId } = req.params
      const { content } = req.body

      if(!mongoose.Types.ObjectId.isValid(tweetId)){
            throw new ApiError(400, "Invalid tweet Id")
      }

      if(!content || content?.trim() === ""){
            throw new ApiError(400, "Content is required")
      }

      const tweet = await Tweet.findById(tweetId)

      if(!tweet){
            throw new ApiError(404, "Tweet not found")
      }

      if (tweet.owner.toString() !== req?.user?._id.toString()) {
            throw new ApiError(403, "You are not authorized to update this tweet");
      }

      tweet.content = content
      const updatedTweet = await tweet.save({ validateBeforeSave: false })

      return res
            .status(200)
            .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async(req, res) => {
      const { tweetId } = req.params

      if(!mongoose.Types.ObjectId.isValid(tweetId)){
            throw new ApiError(400, "Invalid tweet Id")
      }

      const tweet = await Tweet.findById(tweetId)

      if(!tweet){
            throw new ApiError(404, "Tweet not found")
      }

      if (tweet.owner.toString() !== req?.user?._id.toString()) {
            throw new ApiError(403, "You are not authorized to delete this tweet");
      }

      await Tweet.findByIdAndDelete(tweetId)

      return res
            .status(200)
            .json(new ApiResponse(200, {}, "Tweet deleted successfully"))

})


export {
      createTweet,
      getUserTweets,
      updateTweet,
      deleteTweet
}