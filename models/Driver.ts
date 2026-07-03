import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IDriver extends Document {
  username: string;
  password?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const driverSchema = new Schema<IDriver>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    }
  },
  { timestamps: true }
);

// Hash password before saving
driverSchema.pre<IDriver>("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  if (this.password) {
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to verify driver passwords
driverSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IDriver>("Driver", driverSchema);
