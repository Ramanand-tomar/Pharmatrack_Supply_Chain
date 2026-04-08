import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/contexts/Web3Context";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import OwnerDashboard from "@/pages/OwnerDashboard";
import RMSDashboard from "@/pages/RMSDashboard";
import ManufacturerDashboard from "@/pages/ManufacturerDashboard";
import DistributorDashboard from "@/pages/DistributorDashboard";
import RetailerDashboard from "@/pages/RetailerDashboard";
import CustomerDashboard from "@/pages/CustomerDashboard";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import NotFound from "@/pages/NotFound";
import { RoleRedirect } from "@/components/RoleRedirect";

import { SocketProvider } from "@/contexts/SocketContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Web3Provider>
        <SocketProvider>
          <BrowserRouter>
            <RoleRedirect />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/owner" element={<OwnerDashboard />} />
                <Route path="/owner/*" element={<OwnerDashboard />} />
                <Route path="/rms" element={<RMSDashboard />} />
                <Route path="/manufacturer" element={<ManufacturerDashboard />} />
                <Route path="/distributor" element={<DistributorDashboard />} />
                <Route path="/retailer" element={<RetailerDashboard />} />
                <Route path="/customer" element={<CustomerDashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </Web3Provider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
