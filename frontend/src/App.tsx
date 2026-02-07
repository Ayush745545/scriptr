import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AnimatePresence } from 'framer-motion'

// Layouts
import Layout from './components/layout/Layout'
import AuthLayout from './components/layout/AuthLayout'

// Pages
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ScriptGeneratorPage from './pages/scripts/ScriptGeneratorPage'
import ScriptsListPage from './pages/scripts/ScriptsListPage'
import CaptionsPage from './pages/captions/CaptionsPage'
import CaptionEditorPage from './pages/captions/CaptionEditorPage'
import TemplatesPage from './pages/templates/TemplatesPage'
import TemplateEditorPage from './pages/templates/TemplateEditorPage'
import ThumbnailsPage from './pages/thumbnails/ThumbnailsPage'
import ThumbnailGeneratorPage from './pages/thumbnails/ThumbnailGeneratorPage'
import HooksPage from './pages/HooksPage'
import ProjectsPage from './pages/ProjectsPage'
import ProfilePage from './pages/profile/ProfilePage'

// Enhanced Components
import EnhancedScriptGenerator from './components/scripts/EnhancedScriptGenerator'

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />

        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Scripts */}
          <Route path="/scripts" element={<ScriptsListPage />} />
          <Route path="/scripts/new" element={<ScriptGeneratorPage />} />
          <Route path="/scripts/enhanced" element={<EnhancedScriptGenerator />} />
          <Route path="/scripts/:id" element={<ScriptGeneratorPage />} />

          {/* Captions */}
          <Route path="/captions" element={<CaptionsPage />} />
          <Route path="/captions/:id" element={<CaptionEditorPage />} />

          {/* Templates */}
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/:id" element={<TemplateEditorPage />} />

          {/* Thumbnails */}
          <Route path="/thumbnails" element={<ThumbnailsPage />} />
          <Route path="/thumbnails/new" element={<ThumbnailGeneratorPage />} />

          {/* Hooks */}
          <Route path="/hooks" element={<HooksPage />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectsPage />} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default App
