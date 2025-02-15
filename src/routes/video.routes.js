import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from '../middlewares/multer.middlewares.js'
import { 
      deleteVideo,
      getAllVideos,
      getVideoById,
      publishVideo, 
      togglePublishStatus, 
      updateVideo
} from "../controllers/video.controllers.js";

const router = Router()

router.use(verifyJWT)

router.route('/')
            .post(
                  upload.fields([
                        {
                              name: 'video',
                              maxCount: 1
                        },
                        {
                              name: 'thumbnail',
                              maxCount: 1
                        }
                  ]),
                  publishVideo
            )
            .get(getAllVideos)

router.route('/:videoId')
            .get(getVideoById)
            .patch(upload.single("thumbnail"), updateVideo)
            .delete(deleteVideo)

router.route('/toggle/publish/:videoId')
            .patch(togglePublishStatus)

export default router