const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Chat History Schema: Stores conversation messages, cards, and session titles
const ChatHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, default: null, index: true },
    sessionId: { type: String, required: true, index: true },
    title: { type: String, default: "Consultation Session" },
    messages: [
      {
        type: { type: String, enum: ["user", "bot"], required: true },
        content: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        nutritionData: { type: Schema.Types.Mixed, default: null },
        cards: { type: Schema.Types.Mixed, default: [] },
        toolsExecuted: { type: Schema.Types.Mixed, default: [] },
        attachedFile: { type: Schema.Types.Mixed, default: null },
        source: { type: String, default: "gemini" },
      },
    ],
  },
  { timestamps: true }
);

// Nutrition Database Cache Schema: Caches USDA API responses
const NutritionCacheSchema = new Schema(
  {
    foodName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    usdaFdcId: { type: String },
    nutrients: {
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
    },
    servingSize: {
      amount: { type: Number, default: 100 },
      unit: { type: String, default: "g" },
    },
  },
  { timestamps: true }
);

ChatHistorySchema.index({ sessionId: 1, createdAt: -1 });

module.exports = {
  ChatHistory:
    mongoose.models.ChatHistory ||
    mongoose.model("ChatHistory", ChatHistorySchema),
  NutritionCache:
    mongoose.models.NutritionCache ||
    mongoose.model("NutritionCache", NutritionCacheSchema),
};
