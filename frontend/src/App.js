import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowCreate from './pages/WorkflowCreate';
import TemplateList from './pages/TemplateList';
import TemplateDetail from './pages/TemplateDetail';
import TemplateCreate from './pages/TemplateCreate';
import TemplateEdit from './pages/TemplateEdit';
import StorageBrowser from './pages/StorageBrowser';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

import { useAuth } from './contexts/AuthContext';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/workflows/create" element={<WorkflowCreate />} />
          <Route path="/templates" element={<TemplateList />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
          <Route path="/templates/create" element={<TemplateCreate />} />
          <Route path="/templates/:id/edit" element={<TemplateEdit />} />
          <Route path="/storage" element={<StorageBrowser />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;