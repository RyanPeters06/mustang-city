import type { Metadata, Viewport } from "next";
import { Anton, Bowlby_One, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });
// Chunky game-cover lettering for the "start" prompt (an original free font, not the GTA typeface).
const bowlby = Bowlby_One({ weight: "400", subsets: ["latin"], variable: "--font-bowlby" });

export const metadata: Metadata = {
  title: "Mustang City",
  description: "Graduate knowing your city. Clear the fog over Forest State, one street at a time.",
  applicationName: "Mustang City",
  appleWebApp: {
    capable: true,
    title: "Mustang City",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#140A2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${bricolage.variable} ${bowlby.variable}`}>
      <body>
        <div className="shell">
          <div className="app-root">{children}</div>
        </div>
      </body>
    </html>
  );
}
