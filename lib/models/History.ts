import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IHistory extends Document {
  userId?:      Types.ObjectId | string;   // null for guest users
  type:         "translate" | "transliterate" | "scan";
  inputText:    string;
  languages:    string[];
  detectedLang: string;
  results:      { language: string; script: string; roman: string }[];
  isFavorite:   boolean;
  createdAt:    Date;
}

const HistorySchema = new Schema<IHistory>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", default: null },
    type:         { type: String, enum: ["translate", "transliterate", "scan"], required: true },
    inputText:    { type: String, required: true, maxlength: 5000 },
    languages:    { type: [String], required: true },
    detectedLang: { type: String, default: "Unknown" },
    results: [
      {
        language: { type: String, required: true },
        script:   { type: String, default: "" },
        roman:    { type: String, default: "" },
      },
    ],
    isFavorite: { type: Boolean, default: false },
    createdAt:  { type: Date,    default: Date.now },
  },
  { timestamps: false }
);

// Index for fast per-user queries
HistorySchema.index({ userId: 1, createdAt: -1 });
HistorySchema.index({ userId: 1, isFavorite: 1 });

const History: Model<IHistory> =
  mongoose.models.History ?? mongoose.model<IHistory>("History", HistorySchema);

export default History;
