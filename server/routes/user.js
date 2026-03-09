import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// PATCH /api/user/preferences — update user preferences
router.patch('/preferences', (req, res) => {
  try {
    const { theme, uiLanguage } = req.body;
    const updates = [];
    const values = [];

    if (theme !== undefined) {
      if (!['dark', 'light'].includes(theme)) {
        return res.status(400).json({ error: 'Theme must be "dark" or "light"' });
      }
      updates.push('theme = ?');
      values.push(theme);
    }

    if (uiLanguage !== undefined) {
      if (!['en', 'pt'].includes(uiLanguage)) {
        return res.status(400).json({ error: 'Language must be "en" or "pt"' });
      }
      updates.push('ui_language = ?');
      values.push(uiLanguage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid preferences provided' });
    }

    values.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT id, email, display_name, theme, ui_language FROM users WHERE id = ?').get(req.userId);

    res.json(user);
  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
