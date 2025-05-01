
import { TopNavbar } from "@/components/layout/top-navbar";

export default function StreamView() {
  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />
        <div
          style={{
            padding: "32px",
            fontSize: "18px",
            color: "#1C4657",
          }}
        >
          StreamView skeleton – desktop only (Sprint 1)
        </div>
      </div>
    </div>
  );
}
