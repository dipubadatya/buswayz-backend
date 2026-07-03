import mongoose from "mongoose";

/**
 * Establishes connection to the MongoDB Atlas database.
 * Terminates process if connection fails.
 */
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_ATLAS;
    if (!mongoUri) {
      throw new Error("MONGODB_ATLAS environment variable is not defined");
    }
    
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected...");
  } catch (err: any) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
