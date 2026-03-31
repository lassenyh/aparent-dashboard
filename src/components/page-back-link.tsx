import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageBackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 gap-1 px-2 text-muted-foreground"
      asChild
    >
      <Link href={href}>
        <ArrowLeft className="h-3.5 w-3.5" />
        {children}
      </Link>
    </Button>
  );
}
