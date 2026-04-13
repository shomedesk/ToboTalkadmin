import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Video, 
  Youtube, 
  Settings, 
  Users, 
  LogOut,
  CheckCircle2,
  PlusCircle
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Video, label: "Shorts Videos", path: "/shorts" },
  { icon: Youtube, label: "YouTube Videos", path: "/youtube" },
  { icon: CheckCircle2, label: "Review Panel", path: "/review", adminOnly: true },
  { icon: Users, label: "Team Management", path: "/managers", adminOnly: true },
  { icon: Settings, label: "App Settings", path: "/settings", adminOnly: true },
];

export function Sidebar() {
  const { profile, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-gray-200 bg-white sm:flex">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="font-sans text-xl font-bold tracking-tight text-black">
          ToboTalk <span className="text-gray-400">Admin</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          if (item.adminOnly && !profile?.is_admin) return null;
          
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-black text-white" 
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 shrink-0",
                isActive ? "text-white" : "text-gray-400 group-hover:text-black"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="mb-4 flex items-center px-2">
          <img 
            src={profile?.photo_url || "https://picsum.photos/seed/user/100/100"} 
            alt="Profile" 
            className="h-8 w-8 rounded-full border border-gray-200"
            referrerPolicy="no-referrer"
          />
          <div className="ml-3 overflow-hidden">
            <p className="truncate text-sm font-medium text-black">{profile?.display_name}</p>
            <p className="truncate text-xs text-gray-500">{profile?.role?.toUpperCase()}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut className="mr-3 h-5 w-5 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
