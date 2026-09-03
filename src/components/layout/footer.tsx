import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Phone } from "lucide-react";
import { BRAND } from "@/lib/brand";

const footerLinks = {
  "Find a Home": [
    { label: "Search Listings", href: "/search" },
    { label: "Kampala", href: "/search?district=Kampala" },
    { label: "Wakiso", href: "/search?district=Wakiso" },
    { label: "Mukono", href: "/search?district=Mukono" },
    { label: "Entebbe", href: "/search?district=Entebbe" },
    { label: "Jinja", href: "/search?district=Jinja" },
  ],
  "Categories": [
    { label: "Residential", href: "/search?category=residential" },
    { label: "Land & Plots", href: "/search?category=land" },
    { label: "Commercial", href: "/search?category=commercial" },
    { label: "Vehicles", href: "/search?category=vehicle" },
    { label: "Farm & Agricultural", href: "/search?category=agricultural" },
    { label: "Products & Services", href: "/search?category=product" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Safety Tips", href: "/safety" },
  ],
  "For Owners": [
    { label: "List an Item", href: "/register" },
    { label: "Pricing", href: "/pricing" },
    { label: "Owner Guide", href: "/guides/landlord" },
    { label: "Success Stories", href: "/stories" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="page-container py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/icons/rentmesh-192.png"
                alt="Erikot Properties"
                className="h-9 w-9 rounded-xl object-contain"
                width={36}
                height={36}
              />
              <span className="text-xl font-bold text-slate-900 font-display">
                Erikot <span className="text-brand-500">Properties</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {BRAND.tagline}. Discover property, land, vehicles, products and
              services across Uganda — for clients, owners and agents.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Erikot Properties Uganda. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="tel:+256700000000" className="flex items-center gap-1 transition-colors hover:text-brand-600">
              <Phone className="h-3 w-3" />
              +256 700 000 000
            </a>
            <a href="mailto:hello@rentme.ug" className="flex items-center gap-1 transition-colors hover:text-brand-600">
              <Mail className="h-3 w-3" />
              hello@rentme.ug
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
