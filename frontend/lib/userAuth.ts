/**
 * Local Air-Gapped User Authentication & User Session Manager.
 */

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: "Engineer" | "Operator" | "Analyst" | "Admin";
  avatarColor: string;
  createdAt: string;
}

const USERS_KEY = "fortexa_local_users";
const SESSION_KEY = "fortexa_active_user_session";

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr_1",
    name: "User 1",
    username: "user1",
    password: "12345678",
    email: "user1@fortexa.local",
    role: "Engineer",
    avatarColor: "bg-blue-600",
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure backwards compatibility with old localStorage objects missing username
      return parsed.map((u, i) => ({
        ...u,
        username: u.username || `user${i + 1}`,
        password: u.password || "12345678",
      }));
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

/** Get currently active logged-in user session (or null if none) */
export function getActiveUserSession(): UserAccount | null {
  if (typeof window === "undefined") return DEFAULT_USERS[0];
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.email || parsed.username)) {
        return {
          ...parsed,
          username: parsed.username || "user1",
          password: parsed.password || "12345678",
        };
      }
    }
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

/** Authenticate user by username/email and password */
export function authenticateUser(usernameOrEmail: string, passwordInput: string): UserAccount | null {
  const users = getRegisteredUsers();
  const query = (usernameOrEmail || "").toLowerCase().trim();
  const matched = users.find(
    (u) =>
      u &&
      (((u.username || "").toLowerCase() === query) ||
       ((u.email || "").toLowerCase() === query)) &&
      u.password === passwordInput
  );
  if (matched) {
    setActiveUserSession(matched);
    return matched;
  }
  return null;
}

/** Log out current user session */
export function logoutUserSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
