import './globals.css';

export const metadata = {
  title: 'The Pulse of LA',
  description: 'Visualizing SoCal Traffic and Freight',
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