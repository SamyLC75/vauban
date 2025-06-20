import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AlertsPage } from './pages/AlertsPage';
import { TeamPage } from './pages/TeamPage';
import { PrivateRoute } from './components/auth/PrivateRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/team" element={<TeamPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;