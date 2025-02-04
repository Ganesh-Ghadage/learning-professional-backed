import { ApiResponce } from '../utils/ApiResponce.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const heckcheckContoller = asyncHandler(async (req, res) => {
      res.status(200).json(new ApiResponce(200, "OK", "Health check Successful"))
})

export { heckcheckContoller }