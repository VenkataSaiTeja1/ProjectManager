import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'ProjectMonitor27 - College Project Monitoring Portal',
  description: 'Production-ready College Project Monitoring Portal for coordinators, guides, and student teams',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'text-sm font-medium',
              style: {
                borderRadius: '12px',
                background: '#ffffff',
                color: '#1f2937',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
