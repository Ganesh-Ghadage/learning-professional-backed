import { Router } from "express";
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { 
      addComment, 
      deleteComment, 
      getVideoComments, 
      updateComment 
} from "../controllers/comment.controllers.js";
import { upload } from '../middlewares/multer.middlewares.js'

const router = Router()

router.use(verifyJWT)
router.use(upload.none())

router.route('/:videoId')
            .get(getVideoComments)
            .post(addComment)
router.route('/c/:commentId')
            .patch(updateComment)
            .delete(deleteComment)


export default router