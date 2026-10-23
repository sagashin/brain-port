import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_JP, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'My Daily Brain Portal | マイ・デイリー・ブレイン・ポータル',
  description: '脳トレ・漢字・教養雑学・時事ニュース記憶を1つに統合したオールインワン知的トレーニングポータル',
  openGraph: {
    title: 'My Daily Brain Portal | マイ・デイリー・ブレイン・ポータル',
    description: '脳トレ・漢字・教養雑学・時事ニュース記憶を1つに統合したオールインワン知的トレーニングポータル',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Daily Brain Portal | マイ・デイリー・ブレイン・ポータル',
    description: '脳トレ・漢字・教養雑学・時事ニュース記憶を1つに統合したオールインワン知的トレーニングポータル',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ja" className={`${plusJakarta.variable} ${notoSansJP.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="bg-[#0B0F17] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200 font-sans">
        {children}
      </body>
    </html>
  );
}
