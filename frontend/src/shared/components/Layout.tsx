"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Resumen" },
  { href: "/uploads", label: "Registros" },
  { href: "/uploads/new", label: "Subir archivo" },
];

const isActive = (pathname: string, href: string): boolean => {
  if (href === "/") return pathname === "/";
  // "Registros" no debe quedar activo en "/uploads/new", pero sí en el detalle de un upload.
  if (href === "/uploads") return pathname === "/uploads" || (pathname.startsWith("/uploads/") && pathname !== "/uploads/new");
  return pathname === href;
};

export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-double border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-8 gap-y-3 px-4 pt-6 pb-3 sm:px-6">
          <Link href="/" className="group">
            <span className="block font-serif text-3xl font-semibold tracking-tight">CarbonBox</span>
            <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Registro de datos de actividad
            </span>
          </Link>
          <nav className="flex gap-6 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 pb-1 transition-colors ${
                    active ? "border-ink font-medium text-ink" : "border-transparent text-ink-muted hover:border-rule hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <p className="border-t border-rule pt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Procesamiento asíncrono · API + worker + cola SQS
        </p>
      </footer>
    </div>
  );
}
