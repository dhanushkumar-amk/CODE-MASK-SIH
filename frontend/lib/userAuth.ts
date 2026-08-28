/**
 * Local Air-Gapped User Authentication & User Session Manager.
 * Handles local user registration, login, logout, and active user session.
 */

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "Engineer" | "Operator" | "Analyst" | "Admin";
  avatarColor: string;
  createdAt: string;
}

const USERS_KEY = "fortexa_local_users";
const SESSION_KEY = "fortexa_active_user_session";

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr_1",
    name: "Alex Vance",
    email: "alex.vance@fortexa.local",
    role: "Engineer",
    avatarColor: "bg-blue-600",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr_2",
    name: "Elena Rostova",
    email: "elena.rostova@fortexa.local",
    role: "Operator",
    avatarColor: "bg-emerald-600",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr_3",
    name: "David Chen",
    email: "david.chen@fortexa.local",
    role: "Analyst",
    avatarColor: "bg-indigo-600",
    createdAt: new Date().toISOString(),
  },
];

/** Get list of all registered local users */
export function getRegisteredUsers(): UserAccount[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

/** Get currently active logged-in user session */
export function getActiveUserSession(): UserAccount {
  if (typeof window === "undefined") return DEFAULT_USERS[0];
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
    // Default active user
    const users = getRegisteredUsers();
    const defaultUser = users[0];
    localStorage.setItem(SESSION_KEY, JSON.stringify(defaultUser));
    return defaultUser;
  } catch {
    return DEFAULT_USERS[0];
  }
}

/** Set active logged in user session */
export function setActiveUserSession(user: UserAccount) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/** Register a new local user account */
export function registerUserAccount(name: string, email: string, role: UserAccount["role"] = "Engineer"): UserAccount {
  const users = getRegisteredUsers();
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    setActiveUserSession(existing);
    return existing;
  }

  const colors = ["bg-blue-600", "bg-emerald-600", "bg-indigo-600", "bg-purple-600", "bg-amber-600", "bg-teal-600"];
  const newUser: UserAccount = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    createdAt: new Date().toISOString(),
  };

  const updated = [newUser, ...users];
  localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  setActiveUserSession(newUser);
  return newUser;
}

/** Log out current user session */
export function logoutUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
