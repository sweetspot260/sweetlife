const mongoose = require("mongoose");

const statsSchema = new mongoose.Schema({
  videoViews: { type: Number, default: 0 },
  videoDownloads: { type: Number, default: 0 },
  appDownloads: { type: Number, default: 0 },
  visitsToday: { type: Number, default: 0 },
  visitsWeek: { type: Number, default: 0 },
  visitsMonth: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Stats", statsSchema);
