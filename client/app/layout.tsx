import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF RAG Workspace",
  description: "Upload, index, and chat with PDF documents using a grounded RAG pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-background antialiased">{children}</body>
    </html>
  );
}
