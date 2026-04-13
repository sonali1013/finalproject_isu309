import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TransactionReport from './pages/TransactionReport';
import QRCodePage from './pages/QRCode';
import LanguageSettings from './pages/LanguageSettings';
import HelpSupport from './pages/HelpSupport';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Logout from './pages/Logout';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/sso/logout" element={<Logout />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout>
                <TransactionReport />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qr-code"
          element={
            <ProtectedRoute>
              <Layout>
                <QRCodePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/language"
          element={
            <ProtectedRoute>
              <Layout>
                <LanguageSettings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help-support/raise-ticket"
          element={
            <ProtectedRoute>
              <Layout>
                <HelpSupport mode="raise" />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help-support/view-tickets"
          element={
            <ProtectedRoute>
              <Layout>
                <HelpSupport mode="view" />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
