// app/layout.js

import { Inter, Nanum_Pen_Script } from 'next/font/google' // Nanum_Pen_Script 추가
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
// Nanum Pen Script 폰트 설정 추가
const nanumPenScript = Nanum_Pen_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-nanum-pen', // CSS 변수로 사용하기 위함
})

export const metadata = {
  title: '달빛 마법학교 입학처', // 타이틀도 컨셉에 맞게 변경
  description: 'DIBELS 기반 영어 학력 진단',
}

export default function RootLayout({ children }) {
  return (
    // className에 폰트 변수 추가
    <html lang="en">
      <body className={`${inter.className} ${nanumPenScript.variable}`}>{children}</body>
    </html>
  )
}