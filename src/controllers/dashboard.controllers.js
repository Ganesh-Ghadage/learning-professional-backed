import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscriptio.models.js"
import { Like } from '../models/like.models.js'
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";


const getChannelStats = asyncHandler(async (req, res) => {
      const channel = req.user;

      if (!channel) {
            throw new ApiError(400, "User must be logged in to get channel stats");
      }

      // Get Total Videos & Views
      const videoStats = await Video.aggregate([
            {
                  $match: { owner: new mongoose.Types.ObjectId(channel._id) }
            },
            {
                  $group: {
                        _id: null,
                        totalViews: { $sum: "$views" },
                        totalVideos: { $sum: 1 } 
                  }
            }
      ]);

      const { totalVideos, totalViews } = videoStats[0] || { totalVideos: 0, totalViews: 0 };

      // Get Total Subscribers
      const subscriberStats = await Subscription.aggregate([
            {
                  $match: { channel: new mongoose.Types.ObjectId(channel._id) }
            },
            {
                  $group: {
                        _id: null,
                        subscriberCount: { $sum: 1 } // Fix $count issue
                  }
            }
      ]);

      const { subscriberCount: totalSubscribers } = subscriberStats[0] || { subscriberCount: 0 };

      // Get Total Likes
      const likesStats = await Like.aggregate([
            {
                  $match: { video: { $ne: null } }
            },
            {
                  $lookup: {
                        from: "videos",
                        localField: "video",
                        foreignField: "_id",
                        as: "video"
                  }
            },
            {
                  $addFields: {
                        videoOwner: { $first: "$video.owner" }
                  }
            },
            {
                  $match: { videoOwner: new mongoose.Types.ObjectId(channel._id) }
            },
            {
                  $count: "totalLikes"
            }
      ]);

      const { totalLikes } = likesStats[0] || { totalLikes: 0 };

      // Final Channel Stats Object
      const channelStats = {
            totalViews,
            totalVideos,
            totalSubscribers,
            totalLikes
      };

      logger.info('info', `Channel stats fetched successfully: ${channelStats}`)
      return res.status(200).json(new ApiResponse(200, channelStats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
      let { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc" } = req.query;
  
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

      if (req?.user?._id && mongoose.Types.ObjectId.isValid(req?.user?._id)) {
            matchStage.owner = new mongoose.Types.ObjectId(req?.user?._id);
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
          .json(new ApiResponse(200, videos, "Videos fetched successfully"));
})

export {
      getChannelStats,
      getChannelVideos
}