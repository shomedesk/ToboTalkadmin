import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

export type ActivityType = "upload" | "approve" | "settings" | "user_management";

export async function logActivity(action: string, type: ActivityType) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, "activity_logs"), {
      action,
      type,
      user_id: user.uid,
      user_name: user.displayName || user.email || "Unknown User",
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
