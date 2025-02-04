import Router from 'express'
import {heckcheckContoller} from '../controllers/healthcheck.controllers.js'

const router = Router()

router.route('/').get(heckcheckContoller)

export default router