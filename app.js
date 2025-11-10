require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');

    const Visit = require('./models/visit');

    try {
      // Drop old index if it exists (ignore if not found)
      await Visit.collection.dropIndex('date_1').catch(() => {
        console.log('ℹ️ No old date_1 index found or already dropped.');
      });

      // Ensure compound index on { ip, date } is unique
      await Visit.collection.createIndex({ ip: 1, date: 1 }, { unique: true });
      console.log('✅ Compound index { ip, date } created successfully.');
    } catch (err) {
      console.error('⚠️ Index setup error:', err.message);
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));


// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

app.get('/ping', (req, res) => {
    res.send('ping pong');
})
// Start server
app.listen(process.env.PORT, () => console.log(`🚀 Server running on port ${process.env.PORT}`));
