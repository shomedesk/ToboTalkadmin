import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { AppSettings } from "./types";
import { Save, RefreshCw, Plus, Trash2, ExternalLink } from "lucide-react";
import { cn } from "./lib/utils";
import { logActivity } from "./lib/activity";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    maintenance_mode: false,
    app_version: "1.0.0",
    welcome_message: "Welcome to ToboTalk!",
    r2_access_key_id: "",
    r2_secret_access_key: "",
    r2_endpoint: "",
    r2_bucket: "",
    r2_directory: "",
    r2_public_url: "",
    quick_links: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "app_settings", "config"), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Ensure quick_links is at most 20
      const finalSettings = {
        ...settings,
        quick_links: (settings.quick_links || []).slice(0, 20)
      };
      await setDoc(doc(db, "app_settings", "config"), finalSettings);
      logActivity("Updated application settings", "settings");
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save settings: " + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addQuickLink = () => {
    if ((settings.quick_links?.length || 0) >= 20) {
      alert("Maximum 20 links allowed!");
      return;
    }
    setSettings(s => ({
      ...s,
      quick_links: [...(s.quick_links || []), { emoji: "🔗", title: "", url: "" }]
    }));
  };

  const removeQuickLink = (index: number) => {
    setSettings(s => ({
      ...s,
      quick_links: (s.quick_links || []).filter((_, i) => i !== index)
    }));
  };

  const updateQuickLink = (index: number, field: "emoji" | "title" | "url", value: string) => {
    setSettings(s => ({
      ...s,
      quick_links: (s.quick_links || []).map((link, i) => i === index ? { ...link, [field]: value } : link)
    }));
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-black">App Settings</h1>
        <p className="text-sm text-gray-500">Global configuration for the ToboTalk mobile app and Cloudflare R2.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* App Config */}
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-black">General Config</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="font-bold text-black text-sm">Maintenance Mode</p>
                <p className="text-[10px] text-gray-500">Disable app access for all users.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.maintenance_mode ? "bg-black" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  settings.maintenance_mode ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">App Version</label>
              <input 
                value={settings.app_version}
                onChange={e => setSettings(s => ({ ...s, app_version: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Welcome Message</label>
              <textarea 
                value={settings.welcome_message}
                onChange={e => setSettings(s => ({ ...s, welcome_message: e.target.value }))}
                rows={4}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cloudflare R2 Config */}
        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-black">Cloudflare R2</h2>
            <button 
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs font-bold text-gray-400 hover:text-black"
            >
              {showKeys ? "Hide Keys" : "Show Keys"}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Endpoint URL</label>
              <input 
                value={settings.r2_endpoint}
                onChange={e => setSettings(s => ({ ...s, r2_endpoint: e.target.value }))}
                placeholder="https://<id>.r2.cloudflarestorage.com"
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Bucket Name</label>
              <input 
                value={settings.r2_bucket}
                onChange={e => setSettings(s => ({ ...s, r2_bucket: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Directory (Optional)</label>
              <input 
                value={settings.r2_directory}
                onChange={e => setSettings(s => ({ ...s, r2_directory: e.target.value }))}
                placeholder="toboshorts/"
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Public URL (Optional)</label>
              <input 
                value={settings.r2_public_url}
                onChange={e => setSettings(s => ({ ...s, r2_public_url: e.target.value }))}
                placeholder="https://pub-xyz.r2.dev"
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Access Key ID</label>
              <input 
                type={showKeys ? "text" : "password"}
                value={settings.r2_access_key_id}
                onChange={e => setSettings(s => ({ ...s, r2_access_key_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Secret Access Key</label>
              <input 
                type={showKeys ? "text" : "password"}
                value={settings.r2_secret_access_key}
                onChange={e => setSettings(s => ({ ...s, r2_secret_access_key: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Links Config */}
        <div className="lg:col-span-2 space-y-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-black">Dashboard Quick Links</h2>
              <p className="text-xs text-gray-500">Add up to 20 important links with emojis.</p>
            </div>
            <button
              type="button"
              onClick={addQuickLink}
              className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Link
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(settings.quick_links || []).map((link, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="w-16">
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Emoji</label>
                  <input
                    value={link.emoji}
                    onChange={e => updateQuickLink(index, "emoji", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-center text-lg focus:border-black focus:outline-none"
                    placeholder="🔗"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Title</label>
                    <input
                      value={link.title}
                      onChange={e => updateQuickLink(index, "title", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-black focus:outline-none"
                      placeholder="e.g. Facebook"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">URL</label>
                    <div className="relative">
                      <input
                        value={link.url}
                        onChange={e => updateQuickLink(index, "url", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 pl-3 pr-8 py-1.5 text-sm focus:border-black focus:outline-none"
                        placeholder="https://..."
                      />
                      <ExternalLink className="absolute right-2.5 top-2 h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuickLink(index)}
                  className="mt-6 text-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {(settings.quick_links || []).length === 0 && (
              <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-sm text-gray-400">No quick links added yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-black px-12 py-4 font-bold text-white transition-all hover:bg-gray-800 disabled:opacity-50 shadow-lg shadow-black/10"
          >
            {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
}
