import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'Confess — Post. Vote. Deceive.',
  description: 'Post anonymous confessions. Vote Real or Fake. Earn points for fooling others.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-bg text-textPrimary">
            <Navbar />
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
