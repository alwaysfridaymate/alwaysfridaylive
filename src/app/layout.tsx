// Root layout — pass-through to [locale]/layout.tsx which provides <html> and <body>
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
