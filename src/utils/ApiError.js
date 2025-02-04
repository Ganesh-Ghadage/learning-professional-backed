class ApiError extends Error {
      constructor(statusCode, message, errors = [], stack = ""){
            super(message)
            this.statusCode = statusCode
            this.success = false
            this.data = null
            this.errors = errors
            this.message = message

            if(stack){
                  this.stack = stack
            }else{
                  Error.captureStackTrace(this, this.constructor)
            }
      }
}

export {ApiError}