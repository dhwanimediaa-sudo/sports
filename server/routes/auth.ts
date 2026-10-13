import { Router, Response } from 'express';
import crypto from 'crypto';
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateToken,
  sanitizeString,
} from '../utils/security';
import { getDb, saveDatabase } from '../db/database';
import {
  requireAuth,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  AuthenticatedRequest,
} from '../middleware/auth';
import { addAuditLog } from '../utils/logger';
import { isUserAdmin } from '../middleware/accessControl';
import { SportType, UserRole } from '../../src/types';

const router = Router();

/**
 * POST /api/auth/login
 * Login Admin / User
 */
router.post('/login', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = sanitizeString(email || username || '').toLowerCase();
    const cleanPassword = password || '';

    if (!loginIdentifier || !cleanPassword) {
      res.status(400).json({ error: 'Username/Email and Password are required.' });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const rateLimitKey = `${clientIp}_${loginIdentifier}`;

    // Check rate limiting
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      res.status(429).json({
        error: `Too many failed login attempts. Please try again in ${rateCheck.remainingSeconds} seconds.`,
      });
      return;
    }

    const db = getDb();
    // Search user by email, username, or case-insensitive match
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === loginIdentifier ||
        (u.username && u.username.toLowerCase() === loginIdentifier)
    );

    if (!user) {
      recordFailedLogin(rateLimitKey);
      addAuditLog('SECURITY_ALERT', `Failed login attempt for unknown account: ${loginIdentifier}`, undefined, clientIp);
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account is deactivated. Please contact the administrator.' });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(cleanPassword, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = recordFailedLogin(rateLimitKey);
      addAuditLog('SECURITY_ALERT', `Invalid password attempt for account: ${user.email} (Attempt ${attempts})`, user, clientIp);
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    // Successful login
    resetLoginAttempts(rateLimitKey);
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    saveDatabase();

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set secure HTTP-only cookie
    const isSecureConnection = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecureConnection,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    const { passwordHash, ...safeUser } = user;

    addAuditLog('LOGIN', `User ${user.email} logged in successfully.`, safeUser, clientIp);

    res.json({
      message: 'Login successful.',
      user: safeUser,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong during authentication. Please try again.' });
  }
});

/**
 * POST /api/auth/register
 * User registration for tournament organizers and scorers
 */
router.post('/register', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const cleanName = sanitizeString(name || '').trim();
    const cleanEmail = sanitizeString(email || '').toLowerCase().trim();
    const cleanPassword = password || '';

    if (!cleanName || !cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Full name, email, and password are required.' });
      return;
    }

    if (cleanPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const db = getDb();
    const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(cleanPassword);
    const newUser = {
      id: crypto.randomUUID(),
      name: cleanName,
      email: cleanEmail,
      role: 'USER' as const,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash,
    };

    db.users.push(newUser);
    saveDatabase();

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    const isSecureConnection = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie('token', token, {
      httpOnly: true,
      secure: isSecureConnection,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    addAuditLog('REGISTER', `New user registered: ${newUser.email}`, safeUser, clientIp);

    res.status(201).json({
      message: 'Account registered successfully.',
      user: safeUser,
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

/**
 * GET /api/auth/users
 * Search or list users for match/tournament collaborator assignment (Scorer, Operator, Manager)
 */
router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: You do not have permission to access user management.' });
    return;
  }
  const db = getDb();
  const search = (((req.query.q || req.query.search) as string) || '').toLowerCase().trim();

  let users = db.users.filter((u) => u.status === 'ACTIVE').map(({ passwordHash, ...safeUser }) => safeUser);
  if (search) {
    users = users.filter(
      (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }

  res.json({ users: users.slice(0, 50) });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  if (req.user) {
    addAuditLog('LOGOUT', `User ${req.user.email} logged out.`, req.user, clientIp);
  }

  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 * Get current logged in user details
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile
 * Edit Admin/User Name and Email/Username
 */
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;
    const cleanName = sanitizeString(name || '');
    const cleanEmail = sanitizeString(email || '').toLowerCase();

    if (!cleanName || !cleanEmail) {
      res.status(400).json({ error: 'Name and Email/Username cannot be empty.' });
      return;
    }

    // Basic email format check
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      res.status(400).json({ error: 'Please enter a valid email address / username.' });
      return;
    }

    const db = getDb();
    const currentUser = db.users.find((u) => u.id === req.user!.id);

    if (!currentUser) {
      res.status(404).json({ error: 'User account record not found.' });
      return;
    }

    // Check if email is already taken by another user
    const existingEmailUser = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.id !== currentUser.id
    );

    if (existingEmailUser) {
      res.status(400).json({ error: 'This username / email is already in use by another account.' });
      return;
    }

    const oldEmail = currentUser.email;
    const oldName = currentUser.name;

    currentUser.name = cleanName;
    currentUser.email = cleanEmail;
    currentUser.updatedAt = new Date().toISOString();

    saveDatabase();

    // Re-issue JWT token with updated email
    const newTok = generateToken({
      userId: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    });

    const isSecureConnection = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie('token', newTok, {
      httpOnly: true,
      secure: isSecureConnection,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    addAuditLog(
      'PROFILE_UPDATE',
      `Updated profile from Name: "${oldName}", Email: "${oldEmail}" to Name: "${cleanName}", Email: "${cleanEmail}"`,
      { id: currentUser.id, name: cleanName, email: cleanEmail },
      clientIp
    );

    const { passwordHash, ...safeUser } = currentUser;

    res.json({
      message: 'Profile updated successfully.',
      user: safeUser,
      token: newTok,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile. Please try again.' });
  }
});

/**
 * PUT /api/auth/password
 * Change Password
 */
router.put('/password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Current Password, New Password, and Confirm Password are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New Password and Confirm Password do not match.' });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ error: 'New password must be different from the current password.' });
      return;
    }

    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      res.status(400).json({ error: strengthCheck.message || 'New password does not meet security requirements.' });
      return;
    }

    const db = getDb();
    const currentUser = db.users.find((u) => u.id === req.user!.id);

    if (!currentUser) {
      res.status(404).json({ error: 'User account record not found.' });
      return;
    }

    // Verify current password is correct
    const isCurrentValid = await comparePassword(currentPassword, currentUser.passwordHash);
    if (!isCurrentValid) {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
      addAuditLog('SECURITY_ALERT', 'Failed password change attempt - invalid current password', req.user, clientIp);
      res.status(400).json({ error: 'Current Password is incorrect.' });
      return;
    }

    // Hash new password and save
    currentUser.passwordHash = await hashPassword(newPassword);
    currentUser.mustChangePassword = false;
    currentUser.updatedAt = new Date().toISOString();

    saveDatabase();

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    addAuditLog('PASSWORD_CHANGE', 'Password changed successfully.', req.user, clientIp);

    res.json({ message: 'Password changed successfully.' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// ============================================================================
// SUPER ADMIN USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/auth/admin/users
 * Super Admin list of all users with status, allowed sports, and tournament metrics
 */
router.get('/admin/users', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
    return;
  }

  const db = getDb();
  const search = (req.query.search as string || '').toLowerCase().trim();

  let userList = db.users || [];

  if (search) {
    userList = userList.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.role.toLowerCase().includes(search)
    );
  }

  const usersWithMetrics = userList.map((u) => {
    const ownedTournaments = (db.tournaments || []).filter(
      (t) => t.ownerUserId === u.id || t.createdByUserId === u.id
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      allowedSports: u.allowedSports || [],
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLoginAt: u.lastLoginAt,
      mustChangePassword: u.mustChangePassword,
      tournamentCount: ownedTournaments.length,
    };
  });

  res.json({ users: usersWithMetrics });
});

/**
 * POST /api/auth/admin/users
 * Super Admin creates a new user with credentials, role, status, and sport access
 */
router.post('/admin/users', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!isUserAdmin(req.user)) {
      res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
      return;
    }

    const { name, email, username, displayName, mobile, password, confirmPassword, role, status, allowedSports } = req.body;

    const resolvedName = (displayName || name || '').trim();
    if (!resolvedName) {
      res.status(400).json({ error: 'Full Name / Display Name is required.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Email / Username is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || '').trim().toLowerCase();

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Password and Confirm Password do not match.' });
      return;
    }

    const db = getDb();
    const existing = db.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (cleanUsername && u.username && u.username.toLowerCase() === cleanUsername)
    );
    if (existing) {
      res.status(409).json({ error: `A user with email/username "${cleanEmail}" already exists.` });
      return;
    }

    const passwordHash = await hashPassword(password);
    const validRole: UserRole = role && ['SUPER_ADMIN', 'ADMIN', 'USER', 'SCORER', 'BROADCASTER'].includes(role)
      ? role
      : 'USER';
    const validStatus = status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
    const validSports: SportType[] = Array.isArray(allowedSports)
      ? allowedSports.map((s: string) => s.toUpperCase() as SportType)
      : [];

    const newUser: any = {
      id: crypto.randomUUID(),
      name: resolvedName,
      displayName: (displayName || resolvedName).trim(),
      username: cleanUsername || undefined,
      mobile: mobile ? String(mobile).trim() : undefined,
      email: cleanEmail,
      role: validRole,
      status: validStatus as any,
      allowedSports: validSports,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mustChangePassword: false,
      passwordHash,
    };

    db.users.unshift(newUser);
    saveDatabase();

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    addAuditLog(
      'USER_CREATE',
      `Admin created user account "${newUser.email}" (Role: ${newUser.role}, Status: ${newUser.status}, Sports: ${validSports.join(', ') || 'None'})`,
      req.user,
      clientIp
    );

    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      message: 'User created successfully.',
      user: { ...safeUser, tournamentCount: 0 },
    });
  } catch (error: any) {
    console.error('Error creating user by admin:', error);
    res.status(500).json({ error: 'Failed to create user. Please try again.' });
  }
});

/**
 * PUT /api/auth/admin/users/:id
 * Super Admin edits a user's details, role, status, and sport access
 */
router.put('/admin/users/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
    return;
  }

  const { id } = req.params;
  const { name, email, username, displayName, mobile, role, status, allowedSports } = req.body;

  const db = getDb();
  const targetUser: any = db.users.find((u) => u.id === id);

  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Prevent admin from disabling their own account
  if (targetUser.id === req.user?.id && status === 'DISABLED') {
    res.status(400).json({ error: 'You cannot disable your own administrator account.' });
    return;
  }

  // Prevent demoting last super admin
  if (
    targetUser.id === req.user?.id &&
    role &&
    role !== 'SUPER_ADMIN' &&
    targetUser.role === 'SUPER_ADMIN'
  ) {
    res.status(400).json({ error: 'You cannot remove Super Admin privileges from your own account.' });
    return;
  }

  if (email && email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
    const cleanEmail = email.trim().toLowerCase();
    const conflict = db.users.find((u) => u.id !== id && u.email.toLowerCase() === cleanEmail);
    if (conflict) {
      res.status(409).json({ error: `Email "${cleanEmail}" is already in use by another account.` });
      return;
    }
    targetUser.email = cleanEmail;
  }

  if (displayName && typeof displayName === 'string' && displayName.trim()) {
    targetUser.displayName = displayName.trim();
    targetUser.name = displayName.trim();
  } else if (name && typeof name === 'string' && name.trim()) {
    targetUser.name = name.trim();
    targetUser.displayName = name.trim();
  }

  if (username !== undefined) {
    targetUser.username = (username || '').trim().toLowerCase() || undefined;
  }

  if (mobile !== undefined) {
    targetUser.mobile = (mobile || '').trim() || undefined;
  }

  if (role && ['SUPER_ADMIN', 'ADMIN', 'USER', 'SCORER', 'BROADCASTER'].includes(role)) {
    targetUser.role = role as UserRole;
  }

  if (status && (status === 'ACTIVE' || status === 'DISABLED' || status === 'INACTIVE' || status === 'SUSPENDED')) {
    targetUser.status = status;
  }

  if (Array.isArray(allowedSports)) {
    targetUser.allowedSports = allowedSports.map((s: string) => s.toUpperCase() as SportType);
  }

  targetUser.updatedAt = new Date().toISOString();
  saveDatabase();

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  addAuditLog(
    'USER_UPDATE',
    `Updated user "${targetUser.email}" (Role: ${targetUser.role}, Status: ${targetUser.status}, Sports: ${targetUser.allowedSports?.join(', ') || 'None'})`,
    req.user,
    clientIp
  );

  const { passwordHash: _, ...safeUser } = targetUser;
  res.json({ message: 'User updated successfully.', user: safeUser });
});

/**
 * PUT /api/auth/admin/users/:id/password
 * Super Admin resets a user's password
 */
router.put('/admin/users/:id/password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!isUserAdmin(req.user)) {
      res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
      return;
    }

    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New Password and Confirm Password do not match.' });
      return;
    }

    const db = getDb();
    const targetUser = db.users.find((u) => u.id === id);

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    targetUser.passwordHash = await hashPassword(newPassword);
    targetUser.mustChangePassword = false;
    targetUser.updatedAt = new Date().toISOString();
    saveDatabase();

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    addAuditLog(
      'USER_PASSWORD_RESET',
      `Admin reset password for user "${targetUser.email}"`,
      req.user,
      clientIp
    );

    res.json({ message: `Password for ${targetUser.name} has been reset successfully.` });
  } catch (error: any) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

/**
 * PUT /api/auth/admin/users/:id/status
 * Super Admin enables or disables a user account
 */
router.put('/admin/users/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
    return;
  }

  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'ACTIVE' && status !== 'DISABLED') {
    res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.' });
    return;
  }

  if (id === req.user?.id && status === 'DISABLED') {
    res.status(400).json({ error: 'You cannot disable your own administrator account.' });
    return;
  }

  const db = getDb();
  const targetUser = db.users.find((u) => u.id === id);

  if (!targetUser) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();
  saveDatabase();

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  addAuditLog(
    'USER_STATUS_CHANGE',
    `Admin changed status of "${targetUser.email}" to ${status}`,
    req.user,
    clientIp
  );

  const { passwordHash: _, ...safeUser } = targetUser;
  res.json({
    message: `User account has been ${status === 'ACTIVE' ? 'enabled' : 'disabled'}.`,
    user: safeUser,
  });
});

/**
 * GET /api/auth/admin/users/:id/tournaments
 * Super Admin inspects user's owned and collaborated tournaments
 */
router.get('/admin/users/:id/tournaments', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({ error: 'Forbidden: Super Admin or Admin access required.' });
    return;
  }

  const { id } = req.params;
  const db = getDb();

  const userTournaments = (db.tournaments || []).filter(
    (t) =>
      t.ownerUserId === id ||
      t.createdByUserId === id ||
      (t.collaborators && t.collaborators.some((c: any) => c.userId === id))
  );

  res.json({ tournaments: userTournaments });
});

export default router;
