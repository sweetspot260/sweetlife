const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

// 🔒 Ensure only one entry per IP per day
visitSchema.index({ ip: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Visit", visitSchema);
