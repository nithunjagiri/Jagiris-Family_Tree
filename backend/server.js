require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const familyMembersRoutes = require('./routes/familyMembers');
const photosRoutes = require('./routes/photos');
const eventsRoutes = require('./routes/events');
const familyTreeRoutes = require('./routes/familyTree');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const galleryDir = path.join(uploadsDir, 'gallery');
[uploadsDir, profilesDir, galleryDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/family-members', familyMembersRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/family-tree', familyTreeRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
