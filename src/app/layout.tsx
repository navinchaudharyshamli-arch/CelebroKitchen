import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Celebro Kitchen',
  description: 'Skip-only mess management web application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
