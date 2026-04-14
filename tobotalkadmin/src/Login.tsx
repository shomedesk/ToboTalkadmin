import React from "react";
import { Navigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "./lib/AuthContext";
import { motion } from "motion/react";

export default function Login() {
  const { user, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50"
      >
        <div className="mb-8 text-center">
          <h1 className="font-sans text-3xl font-bold tracking-tight text-black">
            ToboTalk <span className="text-gray-400">Admin</span>
          </h1>
          <p className="mt-2 text-gray-500">Sign in to manage your video content</p>
        </div>

        <button
          onClick={login}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-6 py-4 font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <LogIn className="h-5 w-5" />
          Sign in with Google
        </button>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          <p>&copy; 2026 ToboTalk. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}
