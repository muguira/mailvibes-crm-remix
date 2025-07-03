import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Production CSS verification
if (import.meta.env.PROD) {
  const checkStyles = () => {
    const brandTealVar = getComputedStyle(document.documentElement).getPropertyValue('--brand-teal');
    const taskDialogZVar = getComputedStyle(document.documentElement).getPropertyValue('--task-dialog-z-index');
    
    if (!brandTealVar || !taskDialogZVar) {
      console.warn('CSS variables not loaded properly in production. Brand styles may not work correctly.');
    }
  };
  
  // Check after DOM is ready
  setTimeout(checkStyles, 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
