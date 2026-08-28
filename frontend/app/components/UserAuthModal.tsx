"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  UserPlus,
  LogOut,
  X,
  User,
  Shield,
  Check,
  ChevronDown,
  Mail,
  Briefcase,
} from "lucide-react";
import {
  getActiveUserSession,
  getRegisteredUsers,
  registerUserAccount,
  setActiveUserSession,
  logoutUserSession,
  type UserAccount,
} from "@/lib/userAuth";

export default function UserAuthModal({
  onUserChanged,
}: {
  onUserChanged?: (user: UserAccount) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [view, setView] = useState<"profile" | "switch" | "register">("profile");

  // Registration form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState<UserAccount["role"]>("Engineer");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const curr = getActiveUserSession();
    setActiveUser(curr);
    setUsers(getRegisteredUsers());
  }, [isOpen]);

  const handleSwitchUser = (user: UserAccount) => {
    setActiveUserSession(user);
    setActiveUser(user);
    onUserChanged?.(user);
    setView("profile");
    setIsOpen(false);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg("Name and email are required");
      return;
    }
    const newUser = registerUserAccount(regName, regEmail, regRole);
    setActiveUser(newUser);
    setUsers(getRegisteredUsers());
    onUserChanged?.(newUser);
    setRegName("");
    setRegEmail("");
    setErrorMsg(null);
    setView("profile");
    setIsOpen(false);
  };

  const handleLogout = () => {
    logoutUserSession();
    const remaining = getRegisteredUsers();
    const fallback = remaining[0];
    if (fallback) {
      setActiveUserSession(fallback);
      setActiveUser(fallback);
      onUserChanged?.(fallback);
    }
    setView("profile");
    setIsOpen(false);
  };

  if (!activeUser) return null;

  return (
    <div className="relative font-sans text-xs">
      {/* Active User Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200/80 px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
      >
        <span className={`h-4 w-4 rounded-full ${activeUser.avatarColor} text-white flex items-center justify-center text-[9px] font-bold`}>
          {activeUser.name.charAt(0)}
        </span>
        <span className="font-semibold text-slate-800 max-w-[90px] truncate hidden sm:inline">
          {activeUser.name.split(" ")[0]}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {/* Auth Modal Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-2xs"
          />

          {/* Modal Container */}
          <div className="absolute right-0 top-9 z-50 flex flex-col w-72 sm:w-80 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-slate-900">User Account Session</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* VIEW 1: ACTIVE PROFILE */}
            {view === "profile" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className={`h-10 w-10 rounded-xl ${activeUser.avatarColor} text-white flex items-center justify-center text-base font-bold shrink-0 shadow-2xs`}>
                    {activeUser.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 truncate text-xs">{activeUser.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{activeUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] uppercase border border-blue-200/80">
                      {activeUser.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setView("switch")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 font-semibold text-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-slate-500" /> Switch Account
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({users.length})</span>
                  </button>

                  <button
                    onClick={() => setView("register")}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 font-semibold text-slate-800 transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-blue-600" /> Register New Account
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out Session
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 2: SWITCH ACCOUNTS */}
            {view === "switch" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Local User
                  </span>
                  <button onClick={() => setView("profile")} className="text-[10px] text-blue-600 font-medium">
                    Back
                  </button>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        u.email === activeUser.email
                          ? "border-blue-500 bg-blue-50/50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-6 w-6 rounded-lg ${u.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                          {u.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                      {u.email === activeUser.email && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: REGISTER NEW USER */}
            {view === "register" && (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Register User
                  </span>
                  <button onClick={() => setView("profile")} className="text-[10px] text-blue-600 font-medium">
                    Back
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-2 bg-red-50 text-red-600 text-[11px] rounded-lg font-medium">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="sarah@fortexa.local"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Role / Department</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserAccount["role"])}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:border-slate-900 font-semibold"
                  >
                    <option value="Engineer">Engineer</option>
                    <option value="Operator">Operator</option>
                    <option value="Analyst">Analyst</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs mt-1"
                >
                  Create & Activate Account
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
