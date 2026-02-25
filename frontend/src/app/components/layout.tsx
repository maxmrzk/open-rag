import { Outlet, useNavigate } from "react-router";
import { AppSidebar } from "./app-sidebar";
import { Zap, X } from "lucide-react";
import { useState, useEffect } from "react";

function DemoBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("rag_demo_mode") === "true") {
      setVisible(true);
    }
  }, []);

  const handleExit = () => {
    localStorage.removeItem("rag_demo_mode");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-indigo-600/20 border-b border-indigo-500/30 shrink-0">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="text-[11px] text-indigo-300">
          You're viewing the{" "}
          <span className="text-indigo-200 font-medium">demo instance</span> —
          all data is mock, nothing is persisted.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors underline"
        >
          ← Back to landing
        </button>
        <button
          onClick={handleExit}
          className="p-0.5 rounded hover:bg-indigo-500/20 transition-colors"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5 text-indigo-400/60 hover:text-indigo-300" />
        </button>
      </div>
    </div>
  );
}

export function RootLayout() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#010409] text-[#c9d1d9] overflow-hidden">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-hidden h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
