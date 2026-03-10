import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AccountTypes from "./pages/AccountTypes";
import NotFound from "./pages/NotFound";
import Superviseur from "./pages/Superviseur";
import FrequentPartnersPage from "./pages/FrequentPartnersPage";
import SupervisorsPage from "./pages/SupervisorsPage";
import RecentTransactionsPage from "./pages/Recenttransactionspage";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* ── Routes protégées ADMIN ── */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/partners" element={<FrequentPartnersPage />} />
            <Route path="sup" element={<SupervisorsPage />} />
            <Route path="/dash-supervi" element={<Superviseur />} />
            <Route path="/transactions" element={<RecentTransactionsPage />} />
            <Route path="/account-types" element={<AccountTypes />} />
          </Route>


          <Route element={<ProtectedRoute allowedRoles={["SUPERVISEUR"]} />}>
         <Route path="/dashboard/superviseur" element={<Superviseur />} />
        </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;