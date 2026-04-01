import type { Metadata } from "next";
import localFont from "next/font/local";

export const metadata: Metadata = {
  title: "Logg inn",
};

const basisGrotesqueMonoMd = localFont({
  src: "../../../public/font/BasisGrotesqueMonoPro-Md.otf",
  variable: "--font-production-dashboard",
  display: "swap",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={basisGrotesqueMonoMd.variable}>{children}</div>
  );
}
