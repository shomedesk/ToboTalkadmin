import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import { auth } from "./lib/firebase";

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If it's an admin-only route, strictly check for admin status
  if (adminOnly && !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  // For the rest of the portal, we allow admins and managers
  // If you want to allow normal users to see the Dashboard, we can remove this check
  const isStaff = profile?.is_admin || profile?.role === "manager" || profile?.role === "admin";
  
  if (!isStaff && window.location.pathname !== "/profile") {
    // You can redirect them to a public page or show a simpler message
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#f5f5f5] p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Admin Portal Only</h1>
        <p className="mt-2 text-gray-600">This area is reserved for administrators and managers.</p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-6 rounded-xl bg-black px-8 py-3 font-bold text-white"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <Outlet />;
}
