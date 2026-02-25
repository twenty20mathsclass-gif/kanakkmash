import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FloatingActionButtons } from '@/components/shared/floating-action-buttons';

export const metadata: Metadata = {
  title: 'kanakkmash',
  description: 'An online platform that offers quality mathematics classes for students from Class 1 to degree level and for competitive exam preparation.',
  keywords: [
    'online math classes',
    'maths tuition',
    'maths online tuition',
    'one to one maths tuition',
    'competitive exam preparation',
    'Kerala State syllabus',
    'CBSE kerala',
    'CBSE UAE',
    'CBSE KSA',
    'ICSE',
    'LSS',
    'NuMATs',
    'USS',
    'NMMS',
    'NTSE',
    'PSC',
    'MAT',
    'KTET',
    'CTET',
    'NET',
    'CSAT',
    'kanakkmash'
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="5RfOM7ZZi1WMvbRBiPca4fo7dCpcpI6vAoDkuqiaupQ" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manjari:wght@400;700&family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
        <Toaster />
        <FloatingActionButtons />
      </body>
    </html>
  );
}
