import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppStateProvider } from "./contexts/AppStateProvider";
import { AuthProvider } from "@/contexts/AuthProvider";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { PayrollRoute } from "@/components/PayrollRoute";
import { DesignationRoute } from "@/components/DesignationRoute";
import { AssetRoute } from "@/components/AssetRoute";
import { LeaveReportRoute } from "@/components/LeaveReportRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import ApplyLeave from "./pages/ApplyLeave";
import MyLeaveHistory from "./pages/MyLeaveHistory";
import Approvals from "./pages/Approvals";
import LeaveCalendar from "./pages/LeaveCalendar";
import Payroll from "./pages/Payroll";
import Payslips from "./pages/Payslips";
import Settings from "./pages/Settings";
import Designations from "./pages/Designations";
import Equipment from "./pages/Equipment";
import Logs from "./pages/Logs";
import LeaveMonthlyReport from "./pages/LeaveMonthlyReport";
import NotFound from "./pages/NotFound";
import CompanySettings from "./pages/settings/CompanySettings";
import LeavePolicies from "./pages/settings/LeavePolicies";
import LeaveTiming from "./pages/settings/LeaveTiming";
import ApprovalFlow from "./pages/settings/ApprovalFlow";
import BirthdaySettings from "./pages/settings/BirthdaySettings";
import SettingsPermissions from "./pages/settings/Permissions";
import HolidaySettings from "./pages/settings/Holidays";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppStateProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AuthGuard><Layout><Dashboard /></Layout></AuthGuard>} />
              <Route path="/dashboard" element={<AuthGuard><Layout><Dashboard /></Layout></AuthGuard>} />
              <Route path="/employees" element={<AuthGuard><Layout><Employees /></Layout></AuthGuard>} />
              <Route path="/apply-leave" element={<AuthGuard><Layout><ApplyLeave /></Layout></AuthGuard>} />
              <Route path="/my-leave-history" element={<AuthGuard><Layout><MyLeaveHistory /></Layout></AuthGuard>} />
              <Route path="/approvals" element={<AuthGuard><Layout><Approvals /></Layout></AuthGuard>} />
              <Route path="/calendar" element={<AuthGuard><Layout><LeaveCalendar /></Layout></AuthGuard>} />
              <Route path="/payroll" element={<AuthGuard><PayrollRoute><Layout><Payroll /></Layout></PayrollRoute></AuthGuard>} />
              <Route path="/payslips" element={<AuthGuard><Layout><Payslips /></Layout></AuthGuard>} />
              <Route path="/settings" element={<AuthGuard><AdminRoute><Layout><Settings /></Layout></AdminRoute></AuthGuard>}>
                <Route index element={<Navigate to="/settings/company" replace />} />
                <Route path="company" element={<CompanySettings />} />
                <Route path="leave-policies" element={<LeavePolicies />} />
                <Route path="leave-timing" element={<LeaveTiming />} />
                <Route path="approval-flow" element={<ApprovalFlow />} />
                <Route path="birthday" element={<BirthdaySettings />} />
                <Route path="permissions" element={<SettingsPermissions />} />
                <Route path="holidays" element={<HolidaySettings />} />
              </Route>
              <Route path="/designations" element={<AuthGuard><DesignationRoute><Layout><Designations /></Layout></DesignationRoute></AuthGuard>} />
              <Route path="/equipment" element={<AuthGuard><AssetRoute><Layout><Equipment /></Layout></AssetRoute></AuthGuard>} />
              <Route path="/logs" element={<AuthGuard><AdminRoute><Layout><Logs /></Layout></AdminRoute></AuthGuard>} />
              <Route path="/leave-monthly-report" element={<AuthGuard><LeaveReportRoute><Layout><LeaveMonthlyReport /></Layout></LeaveReportRoute></AuthGuard>} />
              <Route path="*" element={<AuthGuard><NotFound /></AuthGuard>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppStateProvider>
  </QueryClientProvider>
);

export default App;
