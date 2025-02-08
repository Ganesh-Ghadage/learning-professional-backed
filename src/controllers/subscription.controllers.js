import { ApiError } from '../utils/ApiError.js'
import { ApiResponce } from '../utils/ApiResponce.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import mongoose from 'mongoose'
import { Subscription } from '../models/subscriptio.models.js'
import { User } from '../models/user.models.js'

const toggleSubscription = asyncHandler(async (req, res) => {
      const { channelId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(channelId)) {
            throw new ApiError(400, "Invalid Channel ID");
      }

      if (channelId.toString() === req?.user?._id.toString()) {
            throw new ApiError(405, "User cannot subscribe to their own channel");
      }

      const existingSubscription = await Subscription.findOne({
            subscriber: req?.user?._id,
            channel: channelId
      });

      if (!existingSubscription) {
            // Subscribe
            try {
                  const subscribedChannel = await Subscription.create({
                        subscriber: req?.user?._id,
                        channel: channelId
                  });
      
                  return res.status(200).json(
                        new ApiResponce(200, subscribedChannel, `User subscribed to channel ${channelId}`)
                  );
            } catch (error) {
                  throw new ApiError(500, "Something went wrong, unable to subscribe");
            }
      }

      // Unsubscribe
      try {
            await Subscription.findByIdAndDelete(existingSubscription._id);

            return res.status(200).json(
                  new ApiResponce(200, {}, `User unsubscribed from channel ${channelId}`)
            );
      } catch (error) {
            throw new ApiError(500, "Something went wrong while unsubscribing");
      }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
      const { channelId } = req.params

      if (!mongoose.Types.ObjectId.isValid(channelId)) {
            throw new ApiError(400, "Invalid Channel ID");
      }

      if (channelId.toString() !== req?.user?._id.toString()) {
            throw new ApiError(403, "Your are not authorized to get subscriber list fo this channel");
      }

      const channelExists = await User.findById(channelId);
      if (!channelExists) {
            throw new ApiError(404, "Channel not found");
      }

      const subscriberList = await Subscription.find({
            channel: channelId
      })
      .populate("subscriber", "_id userName email avatar")
      .select("-_id subscriber");

      if (subscriberList.length === 0) {
            return res
                  .status(200)
                  .json(new ApiResponce(200, [], "No subscribers found for this channel"));
      }

      const subscribers = subscriberList.map(subscriber => subscriber.subscriber)

      return res
            .status(200)
            .json(new ApiResponce(200, subscribers, "Channel subscribers fetched successfully" ))
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
      const { subscriberId } = req.params

      if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
            throw new ApiError(400, "Invalid subscriber ID");
      }

      if (subscriberId.toString() !== req?.user?._id.toString()) {
            throw new ApiError(403, "Your are not authorized to get channel list for this user");
      }

      const subscriberExists = await User.findById(subscriberId);
      if (!subscriberExists) {
            throw new ApiError(404, "Subscriber not found");
      }

      const channelList = await Subscription.find({
            subscriber: subscriberId
      })
      .populate("channel", "_id userName email avatar")
      .select("-_id channel");

      if (channelList.length === 0) {
            return res
                  .status(200)
                  .json(new ApiResponce(200, [], "User has not subscribed to any of channel"));
      }

      const channels = channelList.map(channel => channel.channel)

      return res
            .status(200)
            .json(new ApiResponce(200, channels, "Channel list fetched successfully" ))

})

export {
      toggleSubscription,
      getUserChannelSubscribers,
      getSubscribedChannels
}