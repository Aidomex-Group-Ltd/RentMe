import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  {
    type: "apartment",
    label: "Apartments",
    description: "Modern city living",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80&auto=format",
    count: 180,
  },
  {
    type: "house",
    label: "Houses",
    description: "Family-friendly homes",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80&auto=format",
    count: 95,
  },
  {
    type: "bedsitter",
    label: "Bedsitters",
    description: "Affordable & compact",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&q=80&auto=format",
    count: 120,
  },
  {
    type: "villa",
    label: "Villas",
    description: "Premium residences",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80&auto=format",
    count: 35,
  },
  {
    type: "1_bedroom",
    label: "1 Bedroom",
    description: "Cozy and private",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80&auto=format",
    count: 200,
  },
  {
    type: "flat",
    label: "Flats",
    description: "Convenient living",
    image: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=400&q=80&auto=format",
    count: 75,
  },
];

export default function PropertyCategories() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="page-container">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600">
            Browse by type
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Property categories
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Find exactly what you are looking for.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.type}
              href={`/search?type=${cat.type}`}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-slate-300"
            >
              {/* Image */}
              <div className="relative aspect-[3/2] overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>

              {/* Info */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-lg font-bold text-white">{cat.label}</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/70">{cat.description}</p>
                  <span className="flex items-center gap-1 text-sm font-medium text-white/80 transition-transform group-hover:translate-x-1">
                    {cat.count}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
