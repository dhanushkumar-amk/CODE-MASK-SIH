"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogIn, LogOut, X } from "lucide-react";
import {
  getActiveUserSession,
  logoutUserSession,
  authenticateUser,
  type UserAccount,
} from "@/lib/userAuth";

export default function UserAuthModal({
  onUserChanged,
}: {
  onUserChanged?: (user: UserAccount | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);
  const [mounted, setMounted] = useState(false);

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const curr = getActiveUserSession();
    setActiveUser(curr);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setErrorMsg("Please enter username and password");
      return;
    }

    const authenticated = authenticateUser(usernameInput, passwordInput);
    if (authenticated) {
      setActiveUser(authenticated);
      onUserChanged?.(authenticated);
      setUsernameInput("");
      setPasswordInput("");
      setErrorMsg(null);
      setIsOpen(false);
    } else {
      setErrorMsg("Invalid username or password");
    }
  };

  const handleLogout = () => {
    logoutUserSession();
    setActiveUser(null);
    onUserChanged?.(null);
    setUsernameInput("");
    setPasswordInput("");
    setErrorMsg(null);
    setIsOpen(false);
  };

  const modalContent = !activeUser && isOpen && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans text-xs">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
      />

      {/* Centered Modal Card */}
      <div className="relative w-full max-w-xs bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Login</h3>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-3 p-2 bg-red-50 text-red-600 text-[11px] rounded-lg font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Username
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Username"
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="font-sans text-xs">
      {/* NAVBAR HEADER CONTROLS */}
      {activeUser ? (
        <div className="flex items-center gap-2">
          {/* User Initial Circle */}
          <div
            className={`h-7 w-7 rounded-full ${activeUser.avatarColor} text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-default`}
            title={activeUser.name}
          >
            {activeUser.name.charAt(0).toUpperCase()}
          </div>
          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Login</span>
        </button>
      )}

      {/* PORTAL TO BODY TO FIX STACKING CONTEXT & CENTERING */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </div>
  );
}
