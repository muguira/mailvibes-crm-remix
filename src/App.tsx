import { ChakraProvider as ChakraThemeProvider } from '@chakra-ui/react';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"

import { Auth } from '@/pages/Auth';
import { Index } from '@/pages/Index';
import { Lists } from '@/pages/Lists';
import { Reports } from '@/pages/Reports';
import { Profile } from '@/pages/Profile';
import { NotFound } from '@/pages/NotFound';
import { AuthProvider } from './contexts/AuthContext';
import ContactProfile from './pages/ContactProfile';

export default function App() {
  return (
    <ChakraThemeProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/lists" element={<Lists />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/contact/:id" element={<ContactProfile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </ChakraThemeProvider>
  );
}
