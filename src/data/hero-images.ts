/**
 * Attribution data for externally sourced images.
 *
 * All images are from Unsplash (https://unsplash.com/license) —
 * free for commercial and non-commercial use.
 *
 * This file serves as a structured record of sources and does NOT
 * affect runtime behavior.
 */

export const IMAGE_SOURCES = [
  {
    id: "hero-kololo-villa",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9",
    photographer: " Alviro Escamilla",
    photographerUrl: "https://unsplash.com/@alviroescamilla",
    license: "Unsplash License",
    description: "Modern villa exterior with pool",
  },
  {
    id: "hero-entebbe-villa",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    photographer: "John_rc",
    photographerUrl: "https://unsplash.com/@jondoing",
    license: "Unsplash License",
    description: "Lakeside villa with garden views",
  },
  {
    id: "hero-ntinda-flat",
    url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
    photographer: "Paul Gaudriault",
    photographerUrl: "https://unsplash.com/@paulgaudriault",
    license: "Unsplash License",
    description: "Furnished apartment interior",
  },
  {
    id: "hero-jinja-house",
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c",
    photographer: "John_rc",
    photographerUrl: "https://unsplash.com/@jondoing",
    license: "Unsplash License",
    description: "Riverside family home",
  },
  {
    id: "hero-bukoto-studio",
    url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea",
    photographer: "John_rc",
    photographerUrl: "https://unsplash.com/@jondoing",
    license: "Unsplash License",
    description: "Modern studio apartment",
  },
  {
    id: "hero-mbarara-house",
    url: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc",
    photographer: "John_rc",
    photographerUrl: "https://unsplash.com/@jondoing",
    license: "Unsplash License",
    description: "Modern family home",
  },
] as const;

/**
 * Get a placeholder/fallback image URL for a given index.
 * Used when remote images fail to load.
 */
export function getFallbackImage(index: number): string {
  const fallbacks = [
    "/images/uganda-skyline.svg",
    "/images/jinja-condo.svg",
    "/images/fort-portal.svg",
  ];
  return fallbacks[index % fallbacks.length];
}
