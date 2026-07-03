import mongoose, { Schema, Document, Types } from "mongoose";

export interface IStop {
  name: string;
  lat: number;
  lng: number;
  scheduledTime: string;
}

export interface IBus extends Document {
  busNumber: string;
  routeName: string;
  driver: Types.ObjectId;
  stops: IStop[];
  currentLocation: {
    lat: number;
    lng: number;
  };
  trackingStarted: boolean;
  arrivedStops: number[];
  speed: number;
  nextStopName: string;
  nextStopDistance: number;
  nextStopEta: string;
  nextStopEtaMinutes: number;
  delayText: string;
  delayStatus: string;
  delayColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const stopSchema = new Schema<IStop>(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    scheduledTime: { type: String, required: true }
  },
  { _id: false }
);

const busSchema = new Schema<IBus>(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    routeName: {
      type: String,
      required: true,
      trim: true
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    },
    stops: [stopSchema],
    currentLocation: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    trackingStarted: {
      type: Boolean,
      default: false
    },
    arrivedStops: {
      type: [Number],
      default: []
    },
    speed: {
      type: Number,
      default: 0
    },
    nextStopName: {
      type: String,
      default: ""
    },
    nextStopDistance: {
      type: Number,
      default: 0
    },
    nextStopEta: {
      type: String,
      default: ""
    },
    nextStopEtaMinutes: {
      type: Number,
      default: 0
    },
    delayText: {
      type: String,
      default: ""
    },
    delayStatus: {
      type: String,
      default: ""
    },
    delayColor: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export default mongoose.model<IBus>("Bus", busSchema);
