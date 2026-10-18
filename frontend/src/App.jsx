import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Loader from './components/common/Loader';
import NotFound from './pages/NotFound';

// Route-level code splitting
const Chat = lazy(() => import('./pages/Chat'));
const Documents = lazy(() => import('./pages/Documents'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));

const page = (element) => (
  <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader /></div>}>{element}</Suspense>
);

const App = () => (
  <Router>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {/* "/" = new chat, "/c/:threadId" = conversation (one route so the page is not remounted) */}
          <Route path="/c?/:threadId?" element={page(<Chat />)} />
          <Route path="/documents" element={page(<Documents />)} />
          <Route path="/projects" element={page(<Projects />)} />
          <Route path="/projects/:projectId" element={page(<ProjectDetail />)} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#2f2f2f', color: '#ececec', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', fontSize: '14px' },
        }}
      />
    </AuthProvider>
  </Router>
);

export default App;
