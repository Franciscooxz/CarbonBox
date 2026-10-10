import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed";
const PRIMARY = `${BASE} bg-ink text-paper hover:bg-accent disabled:bg-ink-faint`;

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${PRIMARY} ${className}`} {...props} />;
}

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={PRIMARY}>
      {children}
    </Link>
  );
}
