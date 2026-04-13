import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  getDoc,
  limit,
  startAfter,
  where,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload as S3Upload } from "@aws-sdk/lib-storage";
import { Upload, Plus, Trash2, Edit2, ExternalLink, CheckCircle, Clock, AlertCircle, Filter, ChevronDown, Calendar } from "lucide-react";
import { db } from "../lib/firebase";
import { getS3Client } from "../lib/s3";
import { useAuth } from "../lib/AuthContext";
import { VideoPost, PostStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { logActivity } from "../lib/activity";

interface VideoManagerProps {
  type: "shorts" | "youtube";
  title: string;
}

const CATEGORIES = [
  "ABCD", "Cartoon", "Moral", "Learning", "Nature", "Rhymes", 
  "Knowledge", "History", "Science", "Socialogy", "Physics", "Funny", "Others"
];

const PAGE_SIZE = 40;

export function VideoManager({ type, title }: VideoManagerProps) {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoPost | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Pagination & Filtering
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterDate, setFilterDate] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const collectionName = type === "shorts" ? "shorts_videos" : "kids_youtube_videos";

  const fetchVideos = async (isLoadMore = false) => {
    if (isLoadMore) setIsLoadingMore(true);
    
    let q = query(
      collection(db, collectionName),
      orderBy("created_at", "desc"),
      limit(PAGE_SIZE)
    );

    if (filterCategory !== "All") {
      q = query(q, where("category", "==", filterCategory));
    }

    if (isLoadMore && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const newVideos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as VideoPost[];

    if (isLoadMore) {
      setVideos(prev => [...prev, ...newVideos]);
    } else {
      setVideos(newVideos);
    }

    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    if (isLoadMore) setIsLoadingMore(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [collectionName, filterCategory]);

  const handleUpload = async (file: File) => {
    if (!file) return null;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { client, bucket, directory, publicUrl } = await getS3Client();
      
      let cleanDir = directory || "";
      if (cleanDir && !cleanDir.endsWith("/")) cleanDir += "/";
      if (cleanDir.startsWith("/")) cleanDir = cleanDir.substring(1);

      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
      const key = `${cleanDir}${fileName}`;

      const parallelUploads3 = new S3Upload({
        client: client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: file,
          ContentType: file.type,
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5, // 5MB
        leavePartsOnError: false,
      });

      parallelUploads3.on("httpUploadProgress", (progress) => {
        if (progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percentage);
        }
      });

      await parallelUploads3.done();

      const finalPublicUrl = publicUrl || "";
      const resultUrl = finalPublicUrl.includes("cloudflarestorage.com")
        ? `${finalPublicUrl}/${bucket}/${key}`
        : `${finalPublicUrl.endsWith("/") ? finalPublicUrl : finalPublicUrl + "/"}${key}`;

      setUploadProgress(100);
      return resultUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed: " + (error as Error).message + "\n\nNote: Ensure CORS is enabled on your R2 bucket.");
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const videoFile = formData.get("video_file") as File;
    let videoUrl = formData.get("video_url") as string;
    
    if (type === "shorts" && videoFile && videoFile.size > 0) {
      // 200MB Limit Check
      const MAX_SIZE = 200 * 1024 * 1024; // 200MB in bytes
      if (videoFile.size > MAX_SIZE) {
        alert("Video file size exceeds 200MB limit!");
        return;
      }
      const uploadedUrl = await handleUpload(videoFile);
      if (uploadedUrl) videoUrl = uploadedUrl;
    }

    const status: PostStatus = profile?.is_admin ? "Submitted" : "Review Pending";

    const data: Partial<VideoPost> = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      thumbnail_url: formData.get("thumbnail_url") as string,
      status,
      author_id: profile?.uid || "",
      author_email: profile?.email || "",
      author_name: profile?.display_name || "",
    };

    if (type === "shorts") {
      data.video_url = videoUrl;
    } else {
      data.youtube_url = formData.get("youtube_url") as string;
    }

    try {
      if (editingVideo?.id) {
        await updateDoc(doc(db, collectionName, editingVideo.id), data);
        logActivity(`Updated ${type} video: ${data.title}`, "upload");
      } else {
        data.created_at = serverTimestamp() as any;
        await addDoc(collection(db, collectionName), data);
        logActivity(`Uploaded new ${type} video: ${data.title}`, "upload");
      }
      setIsModalOpen(false);
      setEditingVideo(null);
      fetchVideos(); // Refresh
    } catch (error) {
      console.error("Error saving video:", error);
      alert("Failed to save video.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this video?")) {
      try {
        const videoToDelete = videos.find(v => v.id === id);
        await deleteDoc(doc(db, collectionName, id));
        setVideos(prev => prev.filter(v => v.id !== id));
        if (videoToDelete) {
          logActivity(`Deleted ${type} video: ${videoToDelete.title}`, "upload");
        }
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), { status: "Submitted" });
      setVideos(prev => prev.map(v => v.id === id ? { ...v, status: "Submitted" } : v));
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  // Filtered videos by date if selected
  const filteredVideos = filterDate 
    ? videos.filter(v => {
        if (!v.created_at) return false;
        const date = v.created_at instanceof Timestamp ? v.created_at.toDate() : new Date();
        return format(date, "yyyy-MM-dd") === filterDate;
      })
    : videos;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">{title}</h1>
          <p className="text-sm text-gray-500">Manage your {type} content library.</p>
        </div>
        <button
          onClick={() => {
            setEditingVideo(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 shadow-lg shadow-black/10"
        >
          <Plus className="h-5 w-5" />
          Add New Video
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Filter className="h-4 w-4" />
          Filters:
        </div>
        
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-black focus:outline-none"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-1.5 text-xs font-bold text-black focus:outline-none"
          />
        </div>

        {filterDate && (
          <button 
            onClick={() => setFilterDate("")}
            className="text-[10px] font-bold text-red-500 hover:underline"
          >
            Clear Date
          </button>
        )}
      </div>

      {/* Grid Layout: 6 on Desktop, 2 on Mobile (Standard for vertical shorts) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <AnimatePresence>
          {filteredVideos.map((video) => (
            <motion.div
              key={video.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
                <img 
                  src={video.thumbnail_url || "https://picsum.photos/seed/video/400/225"} 
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Status Badge */}
                <div className="absolute left-2 top-2">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[8px] font-bold uppercase shadow-sm",
                    video.status === "Submitted" ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {video.status === "Submitted" ? "Live" : "Pending"}
                  </span>
                </div>

                {/* Overlay Controls (Visible on hover) */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button 
                    onClick={() => {
                      setEditingVideo(video);
                      setIsModalOpen(true);
                    }}
                    className="rounded-full bg-white p-2 text-black shadow-lg hover:bg-gray-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(video.id!)}
                    className="rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <a 
                    href={type === "shorts" ? video.video_url : video.youtube_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="rounded-full bg-blue-500 p-2 text-white shadow-lg hover:bg-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              {/* Info Outside Image */}
              <div className="flex flex-1 flex-col p-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{video.category}</span>
                <h3 className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-black group-hover:text-blue-600">
                  {video.title}
                </h3>
                <div className="mt-auto pt-2 text-[9px] text-gray-400">
                  {video.created_at instanceof Timestamp ? format(video.created_at.toDate(), "MMM d, yyyy") : "Just now"}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => fetchVideos(true)}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-bold text-black transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-black"></div>
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Load More Videos
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md">
              <h2 className="text-xl font-bold text-black">{editingVideo ? "Edit Video" : "Add New Video"}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 sm:p-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Title</label>
                    <input 
                      name="title" 
                      defaultValue={editingVideo?.title}
                      required 
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
                    <select 
                      name="category" 
                      defaultValue={editingVideo?.category || "Others"}
                      required 
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</label>
                  <textarea 
                    name="description" 
                    defaultValue={editingVideo?.description}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Thumbnail URL (Optional)</label>
                    <input 
                      name="thumbnail_url" 
                      defaultValue={editingVideo?.thumbnail_url}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>

                  {type === "shorts" ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Video File</label>
                      <input 
                        type="file" 
                        name="video_file" 
                        accept="video/*"
                        className="mt-1 w-full text-[10px] text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-[10px] file:font-bold file:text-white hover:file:bg-gray-800"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">YouTube URL</label>
                      <input 
                        name="youtube_url" 
                        defaultValue={editingVideo?.youtube_url}
                        required 
                        className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {type === "shorts" && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Or Direct Video URL</label>
                    <input 
                      name="video_url" 
                      defaultValue={editingVideo?.video_url}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="mt-10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center gap-2 rounded-xl bg-black px-10 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50 shadow-lg shadow-black/10"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    editingVideo ? "Update Video" : "Save Video"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
