import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "./lib/firebase";
import { useAuth } from "./lib/AuthContext";
import { UserProfile } from "./types";
import { Shield, User, UserPlus, Trash2 } from "lucide-react";
import { cn } from "./lib/utils";
import { logActivity } from "./lib/activity";

export default function Managers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const allUsers = snap.docs.map(d => {
        const data = d.data();
        return { 
          uid: d.id, 
          ...data,
          role: data.role || (data.is_admin ? "admin" : "user")
        } as UserProfile;
      });
      // Only show Admins and Managers
      setUsers(allUsers.filter(u => u.role === "admin" || u.role === "manager"));
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (uid: string, currentRole: UserProfile["role"]) => {
    if (uid === profile?.uid) {
      alert("You cannot change your own role!");
      return;
    }

    let newRole: UserProfile["role"] = "user";
    if (currentRole === "user") newRole = "manager";
    else if (currentRole === "manager") newRole = "admin";
    else {
      if (!window.confirm("Are you sure you want to demote this admin to manager?")) return;
      newRole = "manager";
    }

    const isAdmin = newRole === "admin";
    
    try {
      await updateDoc(doc(db, "users", uid), { 
        role: newRole,
        is_admin: isAdmin
      });
      const targetUser = users.find(u => u.uid === uid);
      logActivity(`Changed role of ${targetUser?.display_name || uid} to ${newRole}`, "user_management");
    } catch (error) {
      console.error("Role update failed:", error);
      alert("Failed to update role. Check your permissions.");
    }
  };

  const deleteUser = async (uid: string) => {
    if (uid === profile?.uid) return;
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const targetUser = users.find(u => u.uid === uid);
        await deleteDoc(doc(db, "users", uid));
        logActivity(`Deleted user: ${targetUser?.display_name || uid}`, "user_management");
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Team Management</h1>
          <p className="text-sm text-gray-500">Manage roles and permissions for your team.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 border border-amber-100">
          <Shield className="h-4 w-4" />
          Only Admins can access this page
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="min-w-[600px]">
          <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Current Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.uid} className={cn(
                "hover:bg-gray-50/50 transition-colors",
                user.uid === profile?.uid && "bg-blue-50/30"
              )}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={user.photo_url} className="h-8 w-8 rounded-full border border-gray-100" alt="" referrerPolicy="no-referrer" />
                    <div>
                      <span className="font-bold text-black">{user.display_name}</span>
                      {user.uid === profile?.uid && <span className="ml-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest">(You)</span>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    user.role === "admin" ? "bg-purple-100 text-purple-700" : 
                    user.role === "manager" ? "bg-blue-100 text-blue-700" : 
                    "bg-gray-100 text-gray-600"
                  )}>
                    {user.role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                    {user.role === "manager" && <UserPlus className="mr-1 h-3 w-3" />}
                    {user.role === "user" && <User className="mr-1 h-3 w-3" />}
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => toggleRole(user.uid, user.role)}
                      disabled={user.uid === profile?.uid}
                      className="text-xs font-bold text-black hover:underline disabled:opacity-30 disabled:no-underline"
                    >
                      Change Role
                    </button>
                    {user.uid !== profile?.uid && (
                      <button 
                        onClick={() => deleteUser(user.uid)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}
