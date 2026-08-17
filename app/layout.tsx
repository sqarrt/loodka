import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { DailyBonusModal } from "@/components/DailyBonusModal";
import { claimDailyBonus } from "@/app/actions/claim-daily-bonus";
import { DAILY_BONUS_AMOUNT } from "@/lib/daily-bonus";
import "./globals.css";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-unbounded",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Loodka",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const bonusResult = await claimDailyBonus();

  return (
    <html
      lang="ru"
      className={`${unbounded.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <Header />
        {bonusResult?.bonusGranted && <DailyBonusModal amount={DAILY_BONUS_AMOUNT} />}
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
