const express = require("express");
const router = express.Router();
const Comment = require("../models/comment");
const Visit = require("../models/visit");
const Stats = require("../models/stats");
const schedule = require("node-schedule");

// 🎥 Video Info
const videoData = {
  title: "Mungapeze bwanji sugar momma kapena blesser!!!!",
  description: "Muonere video ili mwambayi mpaka kumapeto ndipo ngati ndi khumbo lanu kuti mupeze sugar momma oti azikupasani chikondi komanso ndalama zikhala zatheka!",
  url: "/frontend/VID-20251107-WA0000.mp4",
  poster: "/frontend/sweetlife.png",
};

// 🧠 Middleware: Track unique daily visit per IP
router.use(async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      "unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only count once per IP per day
    const existing = await Visit.findOne({ ip, date: today });
    if (!existing) {
      await Visit.create({ ip, date: today });

      let stats = await Stats.findOne();
      if (!stats) {
        stats = await Stats.create({
          videoViews: 0,
          videoDownloads: 0,
          appDownloads: 0,
          visitsToday: 1,
          visitsWeek: 1,
          visitsMonth: 1,
        });
      } else {
        stats.visitsToday += 1;
        stats.visitsWeek += 1;
        stats.visitsMonth += 1;
        await stats.save();
      }
    }
  } catch (err) {
    console.error("Visit tracking error:", err);
  }
  next();
});

// 📊 Video info (includes persistent DB stats)
router.get("/video", async (req, res) => {
  try {
    const stats = await Stats.findOne() || {};
    const approvedComments = await Comment.find({ approved: true }).sort({ createdAt: -1 });

    res.json({
      ...videoData,
      views: stats.videoViews || 0,
      downloads: stats.videoDownloads || 0,
      appDownloads: stats.appDownloads || 0,
      comments: approvedComments,
      commentCount: approvedComments.length,
    });
  } catch (err) {
    console.error("Error loading video data:", err);
    res.status(500).json({ error: "Failed to load video data" });
  }
});

// ▶️ Watch video (persistent counter)
router.post("/video/watch", async (req, res) => {
  try {
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({
        videoViews: 1,
        videoDownloads: 0,
        appDownloads: 0,
        visitsToday: 0,
        visitsWeek: 0,
        visitsMonth: 0,
      });
    } else {
      stats.videoViews += 1;
      await stats.save();
    }

    res.json({ message: "View added", views: stats.videoViews });
  } catch (err) {
    console.error("Error updating views:", err);
    res.status(500).json({ error: "Failed to update view count" });
  }
});

// ⬇️ Video Download (persistent counter)
router.post("/video/download", async (req, res) => {
  try {
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({
        videoViews: 0,
        videoDownloads: 1,
        appDownloads: 0,
        visitsToday: 0,
        visitsWeek: 0,
        visitsMonth: 0,
      });
    } else {
      stats.videoDownloads += 1;
      await stats.save();
    }

    res.json({
      message: "Download counted",
      downloads: stats.videoDownloads,
      url: videoData.url,
    });
  } catch (err) {
    console.error("Error updating downloads:", err);
    res.status(500).json({ error: "Failed to update download count" });
  }
});

// 📱 App Download Tracking (persistent)
router.post("/app/download", async (req, res) => {
  try {
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({
        videoViews: 0,
        videoDownloads: 0,
        appDownloads: 1,
        visitsToday: 0,
        visitsWeek: 0,
        visitsMonth: 0,
      });
    } else {
      stats.appDownloads += 1;
      await stats.save();
    }

    const appUrl = "https://sweetlifemw.netlify.app"; 

    res.json({
      message: "App download counted",
      appDownloads: stats.appDownloads,
      url: appUrl,
    });
  } catch (err) {
    console.error("Error updating app downloads:", err);
    res.status(500).json({ error: "Failed to update app download count" });
  }
});

// 💬 Add Comment (awaiting approval)
router.post("/video/comment", async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ error: "Missing name or comment" });

    await Comment.create({ name, text });
    res.json({ message: "Comment submitted for approval" });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// 🧮 Manual visit update (optional)
router.post("/visit", async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress ||
      "unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Visit.findOne({ ip, date: today });
    if (!existing) {
      await Visit.create({ ip, date: today });

      let stats = await Stats.findOne();
      if (!stats) {
        stats = await Stats.create({
          videoViews: 0,
          videoDownloads: 0,
          appDownloads: 0,
          visitsToday: 1,
          visitsWeek: 1,
          visitsMonth: 1,
        });
      } else {
        stats.visitsToday += 1;
        stats.visitsWeek += 1;
        stats.visitsMonth += 1;
        await stats.save();
      }
    }

    const todayCount = await Visit.countDocuments({ date: today });
    res.json({ success: true, today: todayCount });
  } catch (err) {
    console.error("Visit update error:", err);
    res.status(500).json({ error: "Failed to update visit count" });
  }
});

// 🕛 Scheduled auto-reset of visits
schedule.scheduleJob("0 0 * * *", async () => {
  console.log("🔄 Resetting daily visits...");
  const stats = await Stats.findOne();
  if (stats) {
    stats.visitsToday = 0;
    await stats.save();
  }
});

schedule.scheduleJob("0 0 * * 1", async () => {
  console.log("🔄 Resetting weekly visits...");
  const stats = await Stats.findOne();
  if (stats) {
    stats.visitsWeek = 0;
    await stats.save();
  }
});

schedule.scheduleJob("0 0 1 * *", async () => {
  console.log("🔄 Resetting monthly visits...");
  const stats = await Stats.findOne();
  if (stats) {
    stats.visitsMonth = 0;
    await stats.save();
  }
});

module.exports = router;
