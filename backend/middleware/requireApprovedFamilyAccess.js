const { getUserFamilyAccess } = require('../lib/familyAccess');

/**
 * Blocks shared-archive modules for users with family_access = pending.
 * Loads access from DB each request so Approve unlocks without a new JWT.
 */
async function requireApprovedFamilyAccess(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.isAdmin) {
      req.user.familyAccess = 'approved';
      return next();
    }
    const access = await getUserFamilyAccess(req.user.id);
    req.user.familyAccess = access;
    if (access === 'pending') {
      return res.status(403).json({
        error: 'Waiting for admin approval',
        code: 'FAMILY_ACCESS_PENDING',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireApprovedFamilyAccess };
