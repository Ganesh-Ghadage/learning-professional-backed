import express from 'express';
import logger from './utils/logger.js';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import { errorHandler } from './middlewares/errors.middleware.js';

const morganFormat = ":method :url :status :response-time ms";

const app = express()

// logger middleware
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const status = message.split(" ")[2]
        if(status >= 400){
          const logObject = {
            method: message.split(" ")[0],
            url: message.split(" ")[1],
            status: message.split(" ")[2],
            responseTime: message.split(" ")[3],
          };
          logger.error(JSON.stringify(logObject));
        } else {
          const logObject = {
            method: message.split(" ")[0],
            url: message.split(" ")[1],
            status: message.split(" ")[2],
            responseTime: message.split(" ")[3],
          };
          logger.info(JSON.stringify(logObject));
        }
      },
    },
  })
);

// cors middleware
app.use(
  cors({
    origin: process.env.CROS_ORIGIN,
    credentials: true
  })
)

// common middleware
app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({extended: true, limit: '16kb'}))
app.use(express.static("public"))
app.use(cookieParser())

app.use(errorHandler)

// Router imports
import healthcheckRouter from './routes/healthcheck.routes.js';
import userRouter from './routes/users.routes.js'
import commentRouter from './routes/comments.routes.js'
import videoRouter from './routes/video.routes.js'
import tweetRouter from './routes/tweets.routes.js'
import likeRouter from './routes/likes.routes.js'
import subscriberRouter from './routes/subscriptions.route.js'
import playlistRouter from './routes/playlists.routes.js'

// Routes
app.use('/api/v1/healthcheck', healthcheckRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/comments', commentRouter)
app.use('/api/v1/videos', videoRouter)
app.use('/api/v1/tweets', tweetRouter)
app.use('/api/v1/likes', likeRouter)
app.use('/api/v1/subscriptions', subscriberRouter)
app.use('/api/v1/playlist', playlistRouter)

export { app }