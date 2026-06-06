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
const placesRoutes = require('./routes/places');
const searchRoutes = require('./routes/search');
const accountRoutes = require('./routes/account');
const adminRoutes = require('./routes/admin');
const { ensurePlacesAuditSchema } = require('./database/ensurePlacesAuditSchema');

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
app.use('/api/places', placesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum allowed size is 5 MB per file.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

(async () => {
  try {
    await ensurePlacesAuditSchema();
    console.log(
      'Database: places, audit_logs, user_privacy_settings, users profile columns (incl. city/village), and users.is_admin are ready.'
    );
  } catch (err) {
    console.error('Database schema ensure failed (check PG* / DATABASE_URL):', err.message);
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
})();
