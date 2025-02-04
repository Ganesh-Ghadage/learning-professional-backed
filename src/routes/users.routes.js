import Router from 'express'
import { 
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
} from '../controllers/user.controllers.js'
import { upload } from '../middlewares/multer.middlewares.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

// unsecure route

router.route('/register').post(
      upload.fields([
            {
                  name: 'avatar',
                  maxCount: 1
            },
            {
                  name: 'coverImage',
                  maxCount: 1
            }
      ]),
      registerUser
)

router.route('/login').post(loginUser)

// secure route

router.route('/logout').post(verifyJWT, logoutUser)
router.route('/refresh-token').post(verifyJWT, refreshAccessToken)
router.route('/update-password').patch(verifyJWT, updateUserPassword)
router.route('/user').get(verifyJWT, getCurrentUser)
router.route('/update-user').patch(verifyJWT, updateUserDetails)
router.route('/update-avatar').patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route('/update-coverImage').patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route('/channel/:userName').get(verifyJWT, getUserChannelProfile)
router.route('/history').get(verifyJWT, getWatchHistroy)

export default router