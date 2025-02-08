import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const heckcheckContoller = asyncHandler(async (req, res) => {
      res.status(200).json(new ApiResponse(200, "OK", "Health check Successful"))
})

export { heckcheckContoller }