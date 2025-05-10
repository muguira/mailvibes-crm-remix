
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Dashboard from "@/pages/dashboard/Index"
import Tasks from "@/pages/dashboard/Tasks"
import Lists from "@/pages/dashboard/Lists"
import StreamView from "@/pages/dashboard/StreamView"
import Leads from "@/pages/dashboard/Leads"
import NewGrid from "@/pages/NewGrid"
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { ActivityProvider } from "@/contexts/ActivityContext"

export default function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/tasks" element={<Tasks />} />
            <Route path="/dashboard/lists" element={<Lists />} />
            <Route path="/dashboard/leads" element={<Leads />} />
            <Route path="/new-grid" element={<NewGrid />} />
            <Route path="/stream-view/:recordId" element={<StreamView />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ActivityProvider>
    </AuthProvider>
  )
}
