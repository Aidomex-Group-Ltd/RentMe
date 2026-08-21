import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}

export default function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: AdminPageHeaderProps) {
  const crumbs: Crumb[] = breadcrumbs ?? [
    { label: "Admin", href: "/admin" },
    { label: title },
  ];

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            {crumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-700" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 font-display">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
