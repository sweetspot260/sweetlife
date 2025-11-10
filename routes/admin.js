const express = require("express");
const router = express.Router();
const Admin = require("../models/admin");
const Comment = require("../models/comment");
const Stats = require("../models/stats");
require("dotenv").config();

// 🧱 Admin login page
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// 🧱 Admin register page
router.get("/register", (req, res) => {
  res.render("register", { error: null, success: null });
});

// 🧱 Register new admin (requires secret code)
router.post("/register", async (req, res) => {
  const { username, password, secret } = req.body;

  if (secret !== process.env.ADMIN_SECRET) {
    return res.render("register", { error: "Invalid secret code!", success: null });
  }

  const exists = await Admin.findOne({ username });
  if (exists) {
    return res.render("register", { error: "Username already exists!", success: null });
  }

  await Admin.create({ username, password });
  res.render("register", { error: null, success: "Admin created successfully!" });
});

// 🧱 Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (!admin) return res.render("login", { error: "Invalid username or password" });

  req.session.admin = { username };
  res.redirect("/admin");
});

// 🧭 Admin Dashboard
router.get("/", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");

  try {
    // Comments
    const comments = await Comment.find().sort({ createdAt: -1 });
    const totalComments = comments.length;
    const approvedComments = comments.filter(c => c.approved).length;
    const pendingComments = totalComments - approvedComments;

    // Stats (auto-init if missing)
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({
        videoViews: 0,
        videoDownloads: 0,
        appDownloads: 0,
        visitsToday: 0,
        visitsWeek: 0,
        visitsMonth: 0,
      });
    }

    res.render("dashboard", {
      admin: req.session.admin,
      comments,
      totalComments,
      approvedComments,
      pendingComments,
      videoViews: stats.videoViews || 0,
      videoDownloads: stats.videoDownloads || 0,
      appDownloads: stats.appDownloads || 0,
      todayVisits: stats.visitsToday || 0,
      weekVisits: stats.visitsWeek || 0,
      monthVisits: stats.visitsMonth || 0,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.render("dashboard", {
      admin: req.session.admin,
      comments: [],
      totalComments: 0,
      approvedComments: 0,
      pendingComments: 0,
      videoViews: 0,
      videoDownloads: 0,
      appDownloads: 0,
      todayVisits: 0,
      weekVisits: 0,
      monthVisits: 0,
    });
  }
});

// 🧱 Approve Comment
router.post("/comment/approve/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  await Comment.findByIdAndUpdate(req.params.id, { approved: true });
  res.redirect("/admin");
});

// 🧱 Delete Comment
router.post("/comment/delete/:id", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  await Comment.findByIdAndDelete(req.params.id);
  res.redirect("/admin");
});

// 🧱 Reset stats (manual reset to zero)
router.post("/reset-stats", async (req, res) => {
  if (!req.session.admin) return res.redirect("/admin/login");
  await Stats.updateOne({}, {
    videoViews: 0,
    videoDownloads: 0,
    appDownloads: 0,
    visitsToday: 0,
    visitsWeek: 0,
    visitsMonth: 0,
  });
  res.redirect("/admin");
});

// 🧱 Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

module.exports = router;
