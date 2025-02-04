import mongooes, {Schema} from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
      {
            userName: {
                  type: String,
                  required: true,
                  trim: true,
                  unique: true,
                  index: true,
                  lowercase: true
            },
            fullName: {
                  type: String,
                  required: true,
                  trim: true,
                  index: true,
            },
            email: {
                  type: String,
                  required: true,
                  trim: true,
                  unique: true,
                  lowercase: true
            },
            password: {
                  type: String,
                  required: [true, "Password is required"]
            },
            avatar: {
                  type: String,  //couldnairy url
                  required: true
            },
            coverImage: {
                  type: String //couldnairy url
            },
            watchHistory: [{
                  type: Schema.Types.ObjectId,
                  ref: "Video"
            }],
            refreshToken: {
                  type: String
            }
      },
      {
            timestamps: true
      }
)

userSchema.pre("save", async function(next) {

      if(!this.isModified("password")) return next()

      this.password = await bcrypt.hash(this.password, 10)

      next()
})

userSchema.methods.isPasswordCorrect =  async function(password) {
      return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function() {
      return jwt.sign(
            {
                  _id: this._id,
                  userName: this.userName,
                  email: this.email,
                  fullName: this.fullName
            },
            process.env.ACCESS_TOKEN_SECRET,
            { 
                  expiresIn: process.env.ACCESS_TOKEN_EXPIRY
            }

      )
};

userSchema.methods.generateRefreshToken = function() {
      return jwt.sign(
            {
                  _id: this._id
            },
            process.env.REFRESH_TOKEN_SECRET,
            { 
                  expiresIn: process.env.REFRESH_TOKEN_EXPIRY
            }

      )
};

export const User = mongooes.model("User", userSchema)