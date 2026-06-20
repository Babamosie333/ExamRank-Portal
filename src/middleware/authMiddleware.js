const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function verifyAdminToken(req, res, next) {
  // Fix 5: accept cookie OR Bearer header — no localStorage fallback needed on backend
  const token = req.cookies?.adminToken || getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = { id: decoded.id, username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function verifyStudentToken(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }
    // Fix 2: use email and name — phone never existed on Student model
    req.student = { id: decoded.id, email: decoded.email, name: decoded.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyAdminToken;
module.exports.verifyAdminToken = verifyAdminToken;
module.exports.verifyStudentToken = verifyStudentToken;
