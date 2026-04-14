import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { VideoPost } from "./types";
import { CheckCircle, XCircle, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { cn } from "./lib/utils";
import { logActivity } from "./lib/activity";

export default function ReviewPanel() {
  const [pendingShorts, setPendingShorts] = useState<VideoPost[]>([]);
  const [pendingYoutube, setPendingYoutube] = useState<VideoPost[]>([]);

  useEffect(() => {
    const qShorts = query(collection(db, "shorts_videos"), where("status", "==", "Review Pending"));
    const qYoutube = query(collection(db, "kids_youtube_videos"), where("status", "==", "Review Pending"));

    const unsubShorts = onSnapshot(qShorts, (snap) => {
      setPendingShorts(snap.docs.map(d => ({ id: d.id, ...d.data(), _type: "shorts" } as any)));
    }, (error) => {
      console.error("ReviewPanel: Shorts error:", error);
    });

    const unsubYoutube = onSnapshot(qYoutube, (snap) => {
      setPendingYoutube(snap.docs.map(d => ({ id: d.id, ...d.data(), _type: "youtube" } as any)));
    }, (error) => {
      console.error("ReviewPanel: Youtube error:", error);
    });

    return () => {
      unsubShorts();
      unsubYoutube();
    };
  }, []);

  const handleApprove = async (id: string, type: string) => {
    const col = type === "shorts" ? "shorts_videos" : "kids_youtube_videos";
    const post = allPending.find(p => p.id === id);
    try {
      await updateDoc(doc(db, col, id), { status: "Submitted" });
      if (post) {
        logActivity(`Approved ${type} video: ${post.title}`, "approve");
      }
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const allPending = [...pendingShorts, ...pendingYoutube];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">Review Panel</h1>
        <p className="text-sm text-gray-500">Approve or reject content submitted by managers.</p>
      </div>

      {allPending.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <div className="rounded-full bg-gray-50 p-4">
            <CheckCircle className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="mt-4 font-bold text-black">All Caught Up!</h3>
          <p className="text-sm text-gray-500">There are no posts waiting for review.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="min-w-[700px]">
            <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4">Content</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {allPending.map((post: any) => (
                  <motion.tr 
                    key={post.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={post.thumbnail_url} 
                          className="h-10 w-16 rounded-lg object-cover" 
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-black">{post.title}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{post.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        post._type === "shorts" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                      )}>
                        {post._type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{post.author_name}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {post.created_at?.toDate ? format(post.created_at.toDate(), "MMM d, HH:mm") : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(post.id, post._type)}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </button>
                        <a 
                          href={post._type === "shorts" ? post.video_url : post.youtube_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="rounded-lg bg-gray-50 p-2 text-gray-400 hover:bg-gray-100 hover:text-black"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);
}
