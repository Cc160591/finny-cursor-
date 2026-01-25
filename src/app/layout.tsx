import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finny - Personal Finance AI",
  description: "Your sarcastic AI financial coach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        {/* #region agent log */}
        <script dangerouslySetInnerHTML={{__html:`
          const logPayload = {
            location:'layout.tsx:21',
            message:'Layout Rendered',
            data:{ 
              styles: window.getComputedStyle(document.body).backgroundColor,
              tailwindCheck: !!window.getComputedStyle(document.body).getPropertyValue('--finny-beige') || 'missing'
            },
            timestamp:Date.now(),
            sessionId:'debug-session',
            hypothesisId:'1'
          };
          console.log('DEBUG:', logPayload);
          fetch('http://127.0.0.1:7244/ingest/96758caa-5fa3-4088-b7e9-c48caeafa71c',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(logPayload)
          }).catch(()=>{});
        `}} />
        {/* #endregion */}
        {children}
      </body>
    </html>
  );
}
