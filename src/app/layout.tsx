// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter, Nanum_Pen_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const nanumPenScript = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-nanum-pen',
});


export const metadata: Metadata = {
  title: "달빛 마법학교 입학처",
  description: "DIBELS 기반 영어 학력 진단",
};

// 👇 여기가 수정 포인트입니다!
// { children } 뒤에 타입을 명시해줍니다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${nanumPenScript.variable}`}>{children}</body>
    </html>
  );
}