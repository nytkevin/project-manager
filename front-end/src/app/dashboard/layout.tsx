import Sidebar from "./components/sidebar";
import ProtectedRoute from "@/app/route/protected-route";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f6f7f9]">
        <Sidebar />
        <main className="min-w-0 lg:ml-58">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
