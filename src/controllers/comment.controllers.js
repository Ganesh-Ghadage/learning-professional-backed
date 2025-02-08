import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { Comment } from '../models/comments.models.js'
import { mongoose } from 'mongoose'


const getVideoComments = asyncHandler(async (req, res) => {
      const { videoId } = req.params;
      let { page = 1, limit = 10 } = req.query;

      if(!videoId){
            throw new ApiError(400, "Video ID is rquired")
      }

      page = parseInt(page)
      limit = parseInt(limit)

      const aggregationPipeline  = Comment.aggregate([
            {
                  $match: { 
                        videoId: new mongoose.Types.ObjectId(videoId) 
                  }
            },
            {
                  $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner"
                  },
            },
            {
                  $addFields: {
                        owner: {
                              $first: "$owner"
                        }
                  }
            },
            {
                  $sort: {
                        createdAt: -1
                  }
            },
            {
                  $project: {
                        videoId: 1,
                        content: 1,
                        owner: {
                              _id: 1,
                              userName: 1,
                              email: 1,
                              avatar: 1
                        },
                        createdAt: 1
                  }
            }

      ])

      const options = {
            page,
            limit
      }

      const paginateCommtents = await Comment.aggregatePaginate(aggregationPipeline, options)

      return res
            .status(200)
            .json(new ApiResponse(200, paginateCommtents, "Comments retrieved successfully"))
})

const addComment = asyncHandler(async (req, res) => {
      const { videoId } = req.params
      const user = req.user
      const { content } = req.body

      if(!videoId) {
            throw new ApiError(404, "VideoID is missing")
      }

      if(!user){
            throw new ApiError(403, "user is not logged In")
      }

      if(content?.trim() === ""){
            throw new ApiError(404, "Comment should have comment")
      }

      const createdComment = await Comment.create({
            content,
            videoId,
            owner: new mongoose.Types.ObjectId(user._id)
      })

      return res
            .status(200)
            .json(new ApiResponse(200, createdComment, "Comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
      const { commentId } = req.params
      const { content } = req.body

      if(!commentId) {
            throw new ApiError(404, "CommentID is missing")
      }

      const comment = await Comment.findById(commentId)

      if(!comment){
            throw new ApiError(404, "Comment not found")
      }

      if(!comment.owner.equals(req?.user._id)){
            throw new ApiError(403, "User is not owner of the comment")
      }

      if(content?.trim() === ""){
            throw new ApiError(400, "Comment cannot be empty")
      }

      comment.content = content
      const updatedComment = await comment.save({ validateBeforeSave: false })

      return res
            .status(200)
            .json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
      const { commentId } = req.params

      if(!commentId) {
            throw new ApiError(400, "CommentID is missing")
      }

      const comment = await Comment.findById(commentId)

      if(!comment){
            throw new ApiError(404, "Comment not found")
      }

      if(!comment.owner.equals(req?.user._id)){
            throw new ApiError(403, "User is not owner of the comment")
      }

      await Comment.findByIdAndDelete(commentId)

      return res
            .status(200)
            .json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
      getVideoComments,
      addComment,
      updateComment,
      deleteComment
}