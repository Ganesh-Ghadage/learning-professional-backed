import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import fs from 'fs'
import logger from '../utils/logger.js'
import jwt from 'jsonwebtoken'
import { options } from '../constants.js'

const generateAccessAndRefreshToken = async (userId) => {
      //try {
            const user = await User.findById(userId)   
      
            if(!user){
                  throw new ApiError(407, "User Id does not exists")
            }
      
            const accessToken = user.generateAccessToken()
            const refreshToken = user.generateRefreshToken()

            console.log(accessToken)
            console.log(refreshToken)

            user.refreshToken = refreshToken
            await user.save({validateBeforeSave: false})
      
            return {accessToken, refreshToken}
      // } catch (error) {
      //       throw new ApiError(400, "Something went wrong while generating tokens", error)
      // }
}

const registerUser = asyncHandler(async (req, res) => {
      const {userName, fullName, email, password} = req.body
      
      const avatarLocalPath = req.files?.avatar?.[0]?.path
      const coverLocalPath = req.files?.coverImage?.[0]?.path

      try {
      
            [userName, fullName, email, password].some((field) => {
                  if(field === undefined || null) {
                        throw new ApiError(400, 'All fields are required')
                  }
            })
      
            if(userName?.trim() === ""){
                  throw new ApiError(400, 'Username should not be empty')
            }
            if(fullName?.trim() === ""){
                  throw new ApiError(400, 'Fullname should not be empty')
            }
            if(email?.trim() === ""){
                  throw new ApiError(400, 'email should not be empty')
            }
            if(password?.trim() === ""){
                  throw new ApiError(400, 'Password should not be empty')
            }
      
            const existingUser = await User.findOne({
                  $or: [{userName}, {email}]
            })
      
            if(existingUser) {
                  throw new ApiError(409, 'UserName or Email already exists')
            }
      
            let avatar; 
            let coverImage;
            try {
                  avatar = await uploadOnCloudinary(avatarLocalPath)
                  if(coverLocalPath){
                        coverImage = await uploadOnCloudinary(coverLocalPath)
                  }
            } catch (error) {
                  throw new ApiError(500, 'Error in File upload to cloudinary')
            }

            try {
                  const createdUser = await User.create({
                        userName: userName.toLowerCase(),
                        fullName,
                        email,
                        password,
                        avatar: avatar.url,
                        coverImage: coverImage?.url || ""
                  }) 
      
                  // console.log(createdUser)
            
                  const user = await User.findById(createdUser?._id).select(
                        "-password -refreshToken"
                  )
            
                  if(!user){
                        throw new ApiError(500, 'Something went wrong, User is not registered')
                  }
            
                  logger.info(`User registered sucessfully, userId: ${user._id}`)
                  return res.status(201).json(new ApiResponse(201, user, "User registered sucessfully"))
            } catch (error) {
                  console.log('User creation failed', error)
      
                  if(avatar){
                        await deleteFromCloudinary(avatar.url)
                  }
                  if(coverImage){
                        await deleteFromCloudinary(coverImage.url)
                  }

                  throw new ApiError(500, 'Something went wrong, User is not registered and files were deleted from cloudinary', error)
            }
      } catch (error) {
            console.log('User creation failed', error.message)
            if(avatarLocalPath){
                  fs.unlinkSync(avatarLocalPath)
            }
            if(coverLocalPath){
                  fs.unlinkSync(coverLocalPath)
            }

            logger.error(`User creation failed', ${error.message}`)
            throw new ApiError(500, error)
      }
})

const loginUser = asyncHandler(async (req, res) => {
      const {email, userName, password} = req.body

      if(!email || !userName){
            throw new ApiError(404, "Email or UserName is required")
      }

      const user = await User.findOne({
            $or: [{email}, {userName}]
      })

      if(!user){
            throw new ApiError(404, "User not found")
      }

      const isPasswordValid = await user.isPasswordCorrect(password)

      if(!isPasswordValid){
            throw new ApiError(400, "Invalid User Credentials")
      }

      const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

      if(!accessToken || !refreshToken){
            throw new ApiError(404, "Tokens generation failed")
      }


      const loggedUser = await User.findById(user?._id)
            .select("-password -refreshToken")

      if(!loggedUser){
            throw new ApiError(400, "Something went wrong, User is not logged In")
      }

      return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                  new ApiResponse(
                        200, 
                        {
                              user: loggedUser,
                              accessToken,
                              refreshToken
                        },
                        "User Logged in Successfully"
                  )
            )

})

const logoutUser = asyncHandler(async (req, res) => {
      const user = req.user

      if(!user){
            throw new ApiError(400, "Invalid User")
      }

      User.findByIdAndUpdate(
            user._id,
            {
                  $set: {refreshToken: undefined}
            },
            {
                  new: true
            }
      )

      return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out sucessfully"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {

      const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

      if(!incomingRefreshToken){
            throw new ApiError(401, "unauthorized request ")
      }

      try {
            const decodedRefreshToken = jwt.verify(
                  incomingRefreshToken, 
                  process.env.REFRESH_TOKEN_SECRET
            )

            const user = await User.findById(decodedRefreshToken?._id)

            if(!user){
                  throw new ApiError(401, "Invalid refresh token")
            }
      
            if(incomingRefreshToken !== user?.refreshToken){
                  throw new ApiError(401, "Refresh token is Invalid or expired")
            }

            const {accessToken, refreshToken: newRefreshToke} = await generateAccessAndRefreshToken(user?._id)

            return res
                  .status(200)
                  .cookie("accessToken", accessToken, options)
                  .cookie("refreshToken", newRefreshToke, options)
                  .json(
                        new ApiResponse(
                              200, 
                              {
                                    accessToken,
                                    refreshToken: newRefreshToke
                              },
                              "Access token refreshed"
                        )
                  )

      } catch (error) {
            throw new ApiError(404, "Something went wrong while refreshing access toke")
      }


})

const updateUserPassword = asyncHandler(async (req, res) => {
      const { currentPassword, newPassword } = req.body

      //try {
            
            const user = await User.findById(req?.user?._id)

            if(!user){
                  throw new ApiError(400, "User not found")
            }

            const isPasswordValid = await user.isPasswordCorrect(currentPassword)

            if(!isPasswordValid){
                  throw new ApiError(400, "Invalid User Credentials")
            }

            user.password = newPassword
            await user.save({ validateBeforeSave: false })

            return res
                  .status(200)
                  .json(new ApiResponse(200, {}, "User Password Updated Successfully"))

      // } catch (error) {
      //       throw new ApiError(400, "Something went wrong, Password is not changed", error)
      // }
})

const getCurrentUser = asyncHandler(async (req, res) => {
      return res
            .status(200)
            .json(new ApiResponse(200, req.user, "User details fetched successfully"))
})

const updateUserDetails = asyncHandler(async (req, res) => {

      const { fullName, email } = req.body

      if(!fullName || !email){
            throw new ApiError(400, "Fullname and Email are requird")
      }

      const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                  $set: {
                        fullName,
                        email
                  }
            },
            { new: true }
      ).select("-password -refreshToken")

      return res
            .status(200)
            .json(new ApiResponse(200, user, "User details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
      // Get avatar local file path from req.file object
      const avatarLocalPath = req.file?.path

      // validation
      if(!avatarLocalPath){
            throw new ApiError(400, "Avatar File path is not present")
      }

      // fetch user details based on _id from req.user object
      const user = await User.findById(req.user?._id).select("-password -refreshToken")

      // get the public url of avatar
      const publicUrl = user.avatar

      // upload the new avatar image to cloudinary
      const avatar = await uploadOnCloudinary(avatarLocalPath)

      // avatar url validation
      if(!avatar?.url){
            throw new ApiError(400, "File upload failed to cloudinary, Avatar url is not present")
      }

      // update the avater in user and save it
      user.avatar = avatar.url
      const updatedUser = await user.save({ validateBeforeSave: false })

      // if we have avatar url delete it from cloudinary
      if(publicUrl){
            await deleteFromCloudinary(publicUrl)
      }

      return res
            .status(200)
            .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
      const coverLocalPath = req.file?.path

      if(!coverLocalPath){
            throw new ApiError(400, "Cover Image path is not present")
      }

      const user = await User.findById(req.user?._id).select("-password -refreshToken")

      const publicUrl = user.coverImage

      const coverImage = await uploadOnCloudinary(coverLocalPath)

      if(!coverImage?.url){
            throw new ApiError(400, "File upload failed to cloudinary, Cover Image url is not present")
      }

      user.coverImage = coverImage.url
      const updatedUser = await user.save({ validateBeforeSave: false })

      if(publicUrl){
            await deleteFromCloudinary(publicUrl)
      }

      return res
            .status(200)
            .json(new ApiResponse(200, updatedUser, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
      const {userName} = req.params

      if(!userName?.trim()){
            throw new ApiError(400, "UserName is required")
      }

      const channel = await User.aggregate([
            {
                  $match: {
                        userName: userName?.toLowerCase().trim()
                  }
            },
            {
                  $lookup: {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "channel",
                        as: "subscribers"
                  }
            },
            {
                  $lookup: {
                        from: "subscriptions",
                        localField: "_id",
                        foreignField: "subscriber",
                        as: "subscribedTo"
                  }
            },
            {
                  $addFields: {
                        countOfSubscribers: {
                              $size: "$subscribers"
                        },
                        channelSubscribedCount: {
                              $size: "$subscribedTo"
                        },
                        isSubscribed: {
                              $cond: {
                                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                                    then: true,
                                    else: false
                              }
                        }
                        
                  }
            },
            {
                  $project: {
                        fullName: 1,
                        userName: 1,
                        email: 1,
                        subscribers: 1,
                        subscribedTo: 1,
                        countOfSubscribers: 1,
                        channelSubscribedCount: 1,
                        isSubscribed: 1,
                        avatar: 1,
                        coverImage: 1
                  }
            }
      ]);

      if(channel?.length == 0){
            throw new ApiError(400, "Channel not found")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, channel[0], "User channel details fetched successfully"))
})

const getWatchHistroy = asyncHandler(async (req, res) => {
      const userName = req.user?.userName

      if(!userName?.trim()){
            throw new ApiError(400, "UserName is required")
      }

      const watchHistory = await User.aggregate([
            {
                $match: {
                    userName: userName?.toLowerCase().trim(),
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                },
            },
            {
                $unwind: {
                    path: "$watchHistory",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "watchHistory.owner",
                    foreignField: "_id",
                    as: "watchHistory.owner",
                },
            },
            {
                $addFields: {
                    "watchHistory.owner": {
                        $arrayElemAt: ["$watchHistory.owner", 0],
                    },
                },
            },
            {
                $project: {
                    userName: 1,
                    "watchHistory._id": 1,
                    "watchHistory.title": 1,
                    "watchHistory.owner.userName": 1,
                    "watchHistory.owner.fullName": 1,
                    "watchHistory.owner.avatar": 1,
                },
            },
      ]);
        
      // console.log(watchHistory)

      if(!watchHistory.length){
            throw new ApiError(400, "Watch history not found")
      }

      return res
            .status(200)
            .json(new ApiResponse(200, watchHistory[0]?.watchHistory, "Watch history fetched successfully"))
})

export {
      registerUser,
      loginUser,
      logoutUser,
      refreshAccessToken,
      updateUserPassword,
      getCurrentUser,
      updateUserDetails,
      updateUserAvatar,
      updateUserCoverImage,
      getUserChannelProfile,
      getWatchHistroy
}