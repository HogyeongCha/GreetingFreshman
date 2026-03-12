import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import hyuTechLogo from "@/assets/hyu_tech.png";
import { EVENT_PREVIEW_TITLE, EVENT_TITLE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: `${EVENT_PREVIEW_TITLE} | 임시 안내`,
  description: "사이트 점검 안내 페이지",
  openGraph: {
    title: `${EVENT_PREVIEW_TITLE} | 임시 안내`,
    description: "사이트 점검 안내 페이지",
  },
  twitter: {
    title: `${EVENT_PREVIEW_TITLE} | 임시 안내`,
    description: "사이트 점검 안내 페이지",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="afterInteractive" />
        <header className="site-header">
          <div className="shell site-header__inner">
            <div className="brand-lockup">
              <Image src={hyuTechLogo} alt="HYU TECH 공식 로고" className="brand-logo" priority />
              <div className="brand-copy">
                <p>HANYANG UNIVERSITY ENGINEERING</p>
                <strong>{EVENT_TITLE}</strong>
              </div>
            </div>
          </div>
        </header>
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
