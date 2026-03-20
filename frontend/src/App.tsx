import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/pages/admin/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { ApprovalsPage } from '@/pages/admin/ApprovalsPage'
import { EntryRecordsPage } from '@/pages/admin/EntryRecordsPage'
import { PcManagementPage } from '@/pages/admin/PcManagementPage'
import { BlockedDomainsPage } from '@/pages/admin/BlockedDomainsPage'
import { KioskPage } from '@/pages/kiosk/KioskPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/kiosk" element={<KioskPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="entries" element={<EntryRecordsPage />} />
            <Route path="pcs" element={<PcManagementPage />} />
            <Route path="blocked-domains" element={<BlockedDomainsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
