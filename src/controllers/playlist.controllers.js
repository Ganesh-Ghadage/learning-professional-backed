import mongoose, {isValidObjectId} from "mongoose"
import { Playlist } from "../models/playlist.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const createPlaylist = asyncHandler(async (req, res) => {
      const { name, description } = req.body

      if(!name || name?.trim() === ''){
            throw new ApiError(400, "Playlist name is required")
      }

      if(!description || description?.trim() === ''){
            throw new ApiError(400, "Description is required")
      }

      const playlist = await Playlist.create({
            name,
            description,
            owner: new mongoose.Types.ObjectId(req?.user?._id)
      })

      if(!playlist){
            throw new ApiError(500, "Playlist creation failed")
      }

      return res
            .status(201)
            .json(new ApiResponse(201, playlist, "Playlist created succesfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
      const { userId } = req.params
      
      if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid user Id")
      }

      const userPlaylists = await Playlist.find({
            owner: userId
      }).populate("videos")

      if(userPlaylists.length === 0){
            throw new ApiError(404, "No playlist found")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, userPlaylists, "Playlists fetched successfully"))

})

const getPlaylistById = asyncHandler(async (req, res) => {
      const { playlistId } = req.params

      if(!isValidObjectId(playlistId)){
            throw new ApiError(400, "Invalid Playlist Id")
      }

      const playlist = await Playlist.findById(playlistId).populate("videos")

      if(!playlist){
            throw new ApiError(404, "Playlist not found")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
    
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
      const { playlistId, videoId } = req.params

      if(!isValidObjectId(playlistId)){
            throw new ApiError(400, "Invalid Playlist Id")
      }

      if(!isValidObjectId(videoId)){
            throw new ApiError(400, "Invalid Video Id")
      }

      const playlist = await Playlist.findById(playlistId)

      if(!playlist){
            throw new ApiError(404, "Playlist not found")
      }

      if (playlist.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to modify this playlist");
      }

      const videoExists = await Video.exists({ _id: videoId });

      if (!videoExists) {
            throw new ApiError(404, "Video not found");
      }

      const updatedPlaylist = await Playlist.findByIdAndUpdate(
            { _id: playlistId, owner: req?.user?._id },
            { $addToSet: { videos: videoId } }, 
            { new: true }
      );

      if(!updatedPlaylist){
            throw new ApiError(500, "Something went wrong while adding video to playlist")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist"))

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
      const { playlistId, videoId } = req.params
      
      if(!isValidObjectId(playlistId)){
            throw new ApiError(400, "Invalid Playlist Id")
      }

      if(!isValidObjectId(videoId)){
            throw new ApiError(400, "Invalid Video Id")
      }

      const playlist = await Playlist.findById(playlistId)

      if(!playlist){
            throw new ApiError(404, "Playlist not found")
      }

      if (playlist.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to modify this playlist");
      }

      if (!playlist.videos.includes(videoId)) {
            throw new ApiError(400, "Video is already removed from playlist");
      }

      const updatedPlaylist = await Playlist.findByIdAndUpdate(
            { _id: playlistId, owner: req?.user?._id },
            { $pull: { videos: videoId } }, 
            { new: true } 
      );

      if(!updatedPlaylist){
            throw new ApiError(500, "Something went wrong while removing video from playlist")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
      const { playlistId } = req.params

      if(!isValidObjectId(playlistId)){
            throw new ApiError(400, "Invalid Playlist Id")
      }

      const playlist = await Playlist.findById(playlistId)

      if(!playlist){
            throw new ApiError(404, "Playlist not found")
      }

      if (playlist.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to delete this playlist");
      }

      await Playlist.findByIdAndDelete(playlistId)

      return res
            .status(200)
            .json(new ApiResponse(200, {}, "Playlist deleted successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
      const { playlistId } = req.params
      const { name, description } = req.body

      if(!isValidObjectId(playlistId)){
            throw new ApiError(400, "Invalid Playlist Id")
      }

      if(!name || name?.trim() === ''){
            throw new ApiError(400, "Playlist name is required")
      }

      if(!description || description?.trim() === ''){
            throw new ApiError(400, "Description is required")
      }

      const playlist = await Playlist.findById(playlistId)

      if(!playlist){
            throw new ApiError(404, "Playlist not found")
      }

      if (playlist.owner.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "You are not authorized to update this playlist");
      }

      const updatedPlaylist = await Playlist.findByIdAndUpdate(
            { _id: playlistId, owner: req?.user?._id },
            {
                  $set: {
                        name,
                        description
                  }
            },
            { new: true }
      )

      if(!updatedPlaylist){
            throw new ApiError(500, "Something went wrong while updating playlist")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}