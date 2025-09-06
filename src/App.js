import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import gsap from 'gsap';

// Components
import Navbar from './components/Layout/Navbar';
import LoadingSpinner from './components/UI/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
// Pages
import AuthPage from './pages/Auth/AuthPage';
import Dashboard from './pages/Dashboard/Dashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Assessment from './pages/Assessment/Assessment';
import CodeEditor from './pages/CodeEditor/CodeEditor';
import Leaderboard from './pages/Leaderboard/Leaderboard';

const AppContent = () => {
  const { loading } = useAuth();

  useEffect(() => {
    // GSAP animations
    gsap.fromTo('.app-container', 
      { opacity: 0 }, 
      { opacity: 1, duration: 0.5 }
    );
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen app-container bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
           <Route path="/register" element={<AuthPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/assessment/:id" element={
            <ProtectedRoute>
              <Assessment />
            </ProtectedRoute>
          } />
          <Route path="/code/:assessmentId/:questionId" element={
            <ProtectedRoute>
              <CodeEditor />
            </ProtectedRoute>
          } />
          <Route path="/leaderboard/:courseCode" element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster position="top-right" />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
