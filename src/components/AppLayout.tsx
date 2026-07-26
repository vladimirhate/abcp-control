import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div
        style={{ marginLeft: "240px" }}
        className="flex min-h-screen flex-col"
      >
        <Topbar />
        <main
          className="flex-1"
          style={{ padding: "32px 40px" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}