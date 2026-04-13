import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { VideoManager } from "./components/VideoManager";
import ReviewPanel from "./ReviewPanel";
import Managers from "./Managers";
import Settings from "./Settings";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout children={<Dashboard />} />}>
              <Route path="/" element={<Dashboard />} />
            </Route>
            
            <Route path="/shorts" element={<Layout><VideoManager type="shorts" title="Shorts Videos" /></Layout>} />
            <Route path="/youtube" element={<Layout><VideoManager type="youtube" title="YouTube Videos" /></Layout>} />
            
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/review" element={<Layout><ReviewPanel /></Layout>} />
              <Route path="/managers" element={<Layout><Managers /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
