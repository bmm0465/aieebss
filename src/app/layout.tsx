// src/app/layout.tsx

import type { Metadata } from "next";
// [핵심 수정] Inter, Nanum_Pen_Script 외에 Lexend 폰트를 추가로 import 합니다.
import { Inter, Nanum_Pen_Script, Lexend } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const nanumPenScript = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-nanum-pen',
});
// [핵심 수정] Lexend 폰트를 설정하고 CSS 변수로 사용할 준비를 합니다.
const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend', // CSS 변수 이름 지정
});

export const metadata: Metadata = {
  title: "달빛 마법학교 입학처",
  description: "DIBELS 기반 영어 학력 진단",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* [핵심 수정] body의 className에 lexend.variable을 추가합니다. */}
      <body className={`${inter.className} ${nanumPenScript.variable} ${lexend.variable}`}>{children}</body>
    </html>
  );
}