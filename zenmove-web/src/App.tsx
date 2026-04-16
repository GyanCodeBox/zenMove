// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import AuthPage from './pages/AuthPage'
import MovesPage from './pages/MovesPage'
import CreateMovePage from './pages/CreateMovePage'
import MoveDetailPage from './pages/MoveDetailPage'
import ItemsPage from './pages/ItemsPage'
import ManifestPage from './pages/ManifestPage'

// Phase 2
import PaymentCheckoutPage from './pages/phase2/PaymentCheckoutPage'
import EscrowTrackerPage   from './pages/phase2/EscrowTrackerPage'
import OTPDeliveryPage     from './pages/phase2/OTPDeliveryPage'
import DisputePage         from './pages/phase2/DisputePage'
import EWayBillPage        from './pages/phase2/EWayBillPage'

// Packer UI
import PackerDashboard from './pages/packer/PackerDashboard'
import PackerMoveDetail from './pages/packer/PackerMoveDetail'
import AddItemPage from './pages/packer/AddItemPage'
import PackerItemDetail from './pages/packer/PackerItemDetail'
import ScanPage from './pages/packer/ScanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected — all inside AppShell */}
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/moves" replace />} />
          <Route path="/moves" element={<MovesPage />} />
          <Route path="/moves/new" element={<CreateMovePage />} />
          <Route path="/moves/:id" element={<MoveDetailPage />} />
          <Route path="/moves/:id/items" element={<ItemsPage />} />
          <Route path="/moves/:id/manifest" element={<ManifestPage />} />

          {/* Phase 2: Customer */}
          <Route path="/moves/:id/payment"      element={<PaymentCheckoutPage />} />
          <Route path="/moves/:id/escrow"       element={<EscrowTrackerPage />}   />
          <Route path="/moves/:id/otp"          element={<OTPDeliveryPage />}     />
          <Route path="/moves/:id/dispute/new"  element={<DisputePage />}         />
          <Route path="/moves/:id/disputes"     element={<DisputePage />}         />

          {/* Packer */}
          <Route path="/packer" element={<PackerDashboard />} />
          <Route path="/packer/moves/:id" element={<PackerMoveDetail />} />
          <Route path="/packer/moves/:id/items/new" element={<AddItemPage />} />
          <Route path="/packer/items/:itemId" element={<PackerItemDetail />} />
          <Route path="/packer/moves/:id/scan" element={<ScanPage />} />
          <Route path="/packer/moves/:id/eway-bill" element={<EWayBillPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/moves" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
