// src/app/layout.jsx
import { Poppins } from 'next/font/google';
import './globals.css';
import './styles.css';
import { ModalProvider } from '@/contexts/ModalContext';
import LoginModal from '@/components/LoginModal';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'GoldNest - Invest in Gold',
  description: 'Invest in digital gold securely starting from Rs. 100 in Sri Lanka.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
         {/* Corrected attribute name below */}
         <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
            integrity="sha512-1ycn6IcaQQ40/MKBW2W4Rhis/DbILU74C1vSrLJxCq57o941Ym01SwNsOMqvEBFlcgUa6xLiPY/NS5R+E6ztJQ=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer" // <-- Changed to camelCase 'referrerPolicy'
          />
      </head>
      <body className={poppins.className}>
        <ModalProvider>
          {children}
          <LoginModal />
        </ModalProvider>
      </body>
    </html>
  );
}