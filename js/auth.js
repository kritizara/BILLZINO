/**
 * TEMPORARY test-only auth. Users and sessions live in localStorage,
 * passwords are stored in PLAIN TEXT. This exists purely so the dashboard
 * can be built and tested end-to-end before Supabase auth is wired in —
 * every function here has a 1:1 name that will call Supabase instead,
 * so nothing else in the app needs to change when that happens.
 */
(function (global) {
  const USERS_KEY = 'billzino-users';
  const SESSION_KEY = 'billzino-session';

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }
  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  function setSession(user) {
    const session = { userId: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function signup({ name, email, password }) {
    const cleanEmail = normalizeEmail(email);
    if (!name || !cleanEmail || !password) {
      return { ok: false, error: 'Fill in your name, email, and password.' };
    }
    const users = readUsers();
    if (users.some((u) => normalizeEmail(u.email) === cleanEmail)) {
      return { ok: false, error: 'An account with that email already exists.' };
    }
    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: cleanEmail,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeUsers(users);
    return { ok: true, session: setSession(user) };
  }

  function login({ email, password }) {
    const cleanEmail = normalizeEmail(email);
    const users = readUsers();
    const user = users.find((u) => normalizeEmail(u.email) === cleanEmail);
    if (!user || user.password !== password) {
      return { ok: false, error: 'Incorrect email or password.' };
    }
    return { ok: true, session: setSession(user) };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Redirects to login.html if there's no session, and returns null.
  // Returns the session object otherwise. Call this at the top of any
  // page that requires being logged in.
  function requireSession() {
    const session = getSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  global.billzinoAuth = { signup, login, logout, getSession, requireSession };
})(window);
