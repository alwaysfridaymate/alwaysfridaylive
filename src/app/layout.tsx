import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALWAYSFRIDAY — Curated Audio & Video Creation",
  description:
    "Podcasts, audiobooks and voiceovers with guidance, dramaturgy and quality. A curated studio for audio and video content with long-term value.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
