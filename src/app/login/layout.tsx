import type { Metadata } from "next";

import { PRODUCT_TAB_TITLE } from "@/lib/product";

export const metadata: Metadata = {
  title: `Logg inn · ${PRODUCT_TAB_TITLE}`,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
