import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from '../middlewares/multer.middlewares.js'
import { 
      publishVideo 
} from "../controllers/video.controllers.js";

const router = Router()

router.use(verifyJWT)

router.route('/').post(
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

export default router