import React, { useEffect, useState } from "react";
import { collection, query, getDocs, limit, orderBy, onSnapshot, Timestamp, doc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Video, Youtube, Users, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "./lib/utils";
import { format } from "date-fns";
import { AppSettings } from "./types";

import { useAuth } from "./lib/AuthContext";

export default function Dashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    shorts: 0,
    youtube: 0,
    pending: 0,
    users: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (authLoading || !profile) return;

    const fetchStats = async () => {
      try {
        const shortsSnap = await getDocs(collection(db, "shorts_videos"));
        const youtubeSnap = await getDocs(collection(db, "kids_youtube_videos"));
        const usersSnap = await getDocs(collection(db, "users"));

        const shortsPending = shortsSnap.docs.filter(d => d.data().status === "Review Pending").length;
        const youtubePending = youtubeSnap.docs.filter(d => d.data().status === "Review Pending").length;

        setStats({
          shorts: shortsSnap.size,
          youtube: youtubeSnap.size,
          pending: shortsPending + youtubePending,
          users: usersSnap.size
        });
      } catch (error) {
        console.error("Dashboard: Failed to fetch stats:", error);
      }
    };

    fetchStats();

    // Fetch settings for quick links
    const unsubSettings = onSnapshot(doc(db, "app_settings", "config"), (snap) => {
      if (snap.exists()) setSettings(snap.data() as AppSettings);
    });

    // Fetch activities - Only if admin
    if (profile.role === "admin" || profile.is_admin === true) {
      const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(5));
      const unsub = onSnapshot(q, (snap) => {
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingActivities(false);
        setActivityError(null);
      }, (error) => {
        console.error("Activity logs error:", error);
        setActivityError(error.message);
        setLoadingActivities(false);
      });
      return () => {
        unsub();
        unsubSettings();
      };
    } else {
      setLoadingActivities(false);
      return () => unsubSettings();
    }
  }, [authLoading, profile]);

  const statCards = [
    { label: "Shorts Videos", value: stats.shorts, icon: Video, color: "bg-blue-50 text-blue-600" },
    { label: "YouTube Videos", value: stats.youtube, icon: Youtube, color: "bg-red-50 text-red-600" },
    { label: "Pending Review", value: stats.pending, icon: CheckCircle2, color: "bg-amber-50 text-amber-600" },
    { label: "Total Users", value: stats.users, icon: Users, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-black">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm">Welcome back to ToboTalk Admin Panel.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-xl p-3", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-black">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Links Row */}
      {settings?.quick_links && settings.quick_links.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 px-1">Quick Access</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {settings.quick_links.map((link, i) => (
              <motion.a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex min-w-[140px] flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-black hover:shadow-md group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{link.emoji || "🔗"}</span>
                <span className="text-xs font-bold text-black text-center line-clamp-1">{link.title}</span>
                <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-black" />
              </motion.a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-black mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {loadingActivities ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-black"></div>
              </div>
            ) : activityError ? (
              <div className="rounded-xl bg-red-50 p-4 text-xs text-red-600 border border-red-100">
                <p className="font-bold mb-1">Permission Error</p>
                <p>{activityError}</p>
                <p className="mt-2 text-[10px] opacity-70">Your Role: {profile?.role} | Admin: {String(profile?.is_admin)}</p>
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No recent activity found.</p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className={cn(
                    "mt-1 rounded-full p-1.5",
                    activity.type === "upload" ? "bg-blue-50 text-blue-600" :
                    activity.type === "approve" ? "bg-green-50 text-green-600" :
                    activity.type === "settings" ? "bg-purple-50 text-purple-600" :
                    "bg-amber-50 text-amber-600"
                  )}>
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{activity.action}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400">By {activity.user_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {activity.timestamp instanceof Timestamp ? format(activity.timestamp.toDate(), "MMM d, HH:mm") : "Just now"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-black mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Main Database</span>
              <span className="flex items-center text-green-600"><span className="mr-2 h-2 w-2 rounded-full bg-green-600"></span> Online</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Storage Server</span>
              <span className="flex items-center text-green-600"><span className="mr-2 h-2 w-2 rounded-full bg-green-600"></span> Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
