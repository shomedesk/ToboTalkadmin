import React from "react";
import { Sidebar } from "./Sidebar";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/utils";
import { LayoutDashboard, Video, Youtube, Settings, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header />
      <Sidebar />
      <main className="pt-16 pb-20 sm:pb-8 sm:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

function Header() {
  const { profile } = useAuth();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-900 px-4 text-white sm:pl-64 sm:pr-8">
      <div className="flex items-center gap-3 sm:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Video className="h-5 w-5 text-blue-400" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">ToboTalk</h1>
      </div>
      
      <div className="hidden sm:block">
        <p className="text-xs font-medium text-slate-400">Welcome back,</p>
        <p className="text-sm font-bold text-white">{profile?.display_name}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right sm:hidden">
          <p className="text-[10px] font-medium text-slate-400 leading-none">Logged in as</p>
          <p className="text-xs font-bold text-white">{profile?.display_name?.split(' ')[0]}</p>
        </div>
        <img 
          src={profile?.photo_url || "https://picsum.photos/seed/user/100/100"} 
          alt="Profile" 
          className="h-8 w-8 rounded-full border-2 border-white/10 shadow-sm"
          referrerPolicy="no-referrer"
        />
      </div>
    </header>
  );
}

function MobileNav() {
  const { profile } = useAuth();
  const location = useLocation();

  const mobileItems = [
    { icon: LayoutDashboard, label: "Home", path: "/" },
    { icon: Video, label: "Shorts", path: "/shorts" },
    { icon: Youtube, label: "YouTube", path: "/youtube" },
    { icon: CheckCircle2, label: "Review", path: "/review", adminOnly: true },
    { icon: Settings, label: "Settings", path: "/settings", adminOnly: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-gray-100 bg-white/80 px-2 backdrop-blur-lg sm:hidden">
      {mobileItems.map((item) => {
        if (item.adminOnly && !profile?.is_admin) return null;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "relative flex flex-col items-center gap-1 px-3 py-1 transition-all duration-300",
              isActive ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
            <span className={cn("text-[9px] font-bold tracking-wide", isActive ? "opacity-100" : "opacity-80")}>
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="activeTab"
                className="absolute -top-1 h-1 w-8 rounded-full bg-blue-600"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
