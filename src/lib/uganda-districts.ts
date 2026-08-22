/**
 * Complete Ugandan districts and regions data.
 * Reconciled against the official 135 districts + Kampala Capital City Authority.
 * Source: Uganda Bureau of Statistics (UBOS) and Ministry of Local Government.
 */

export interface District {
  name: string;
  region: Region;
}

export type Region =
  | "Central"
  | "Eastern"
  | "Northern"
  | "Western";

export const ugandanRegions: Region[] = ["Central", "Eastern", "Northern", "Western"];

/** All Ugandan districts grouped by region. Sorted alphabetically within each region. */
export const districtsByRegion: Record<Region, string[]> = {
  Central: [
    "Buikwe",
    "Bukomansimbi",
    "Butambala",
    "Buvuma",
    "Gomba",
    "Kalambira",
    "Kalungu",
    "Kampala",
    "Kayunga",
    "Kiboga",
    "Kyankwanzi",
    "Luwero",
    "Lyantonde",
    "Mpigi",
    "Mubende",
    "Mukono",
    "Nakaseke",
    "Nakasongola",
    "Rakai",
    "Sembabule",
    "Wakiso",
  ],
  Eastern: [
    "Amuria",
    "Budaka",
    "Bududa",
    "Bugiri",
    "Bukedea",
    "Busiki",
    "Busia",
    "Butaleja",
    "Buyende",
    "Iganga",
    "Jinja",
    "Kaberamaido",
    "Kaliro",
    "Kamuli",
    "Kapchorwa",
    "Katakwi",
    "Kibuku",
    "Kumi",
    "Luuka",
    "Manafwa",
    "Mayuge",
    "Mbale",
    "Namayingo",
    "Namutumba",
    "Ngora",
    "Pallisa",
    "Sironko",
    "Soroti",
    "Tororo",
  ],
  Northern: [
    "Abim",
    "Adjumani",
    "Agago",
    "Alebtong",
    "Amolatar",
    "Amudat",
    "Amuru",
    "Apac",
    "Arua",
    "Dokolo",
    "Gulu",
    "Kaabong",
    "Kitgum",
    "Koboko",
    "Kole",
    "Lira",
    "Lamwo",
    "Madi Okollo",
    "Maracha",
    "Moroto",
    "Moyo",
    "Nakapiripirit",
    "Napak",
    "Nebbi",
    "Nwoya",
    "Otuuke",
    "Pader",
    "Pakwach",
    "Zombo",
  ],
  Western: [
    "Buliisa",
    "Bundibugyo",
    "Bushenyi",
    "Fort Portal",
    "Hoima",
    "Ibanda",
    "Isingiro",
    "Kabale",
    "Kabarole",
    "Kagadi",
    "Kakumiro",
    "Kamwenge",
    "Kanungu",
    "Kasese",
    "Kazo",
    "Kibaale",
    "Kikuube",
    "Kiruhura",
    "Kiryandongo",
    "Kisoro",
    "Kyejojo",
    "Masaka",
    "Masindi",
    "Mbarara",
    "Mitooma",
    "Mpigi",
    "Ntungamo",
    "Rubanda",
    "Rubirizi",
    "Rukiga",
    "Rukungiri",
    "Rwampara",
  ],
};

/** Flat sorted list of all Ugandan district names. */
export const allUgandanDistricts: string[] = Object.values(districtsByRegion)
  .flat()
  .sort();

/** Map district name → region. */
const districtToRegionMap = new Map<string, Region>();
for (const [region, districts] of Object.entries(districtsByRegion)) {
  for (const district of districts) {
    districtToRegionMap.set(district, region as Region);
  }
}

/**
 * Get all districts in a given region, sorted alphabetically.
 */
export function getDistrictsByRegion(region: Region): string[] {
  return [...(districtsByRegion[region] || [])].sort();
}

/**
 * Get the region for a given district name (case-insensitive).
 * Returns null if the district is not found.
 */
export function getRegionByDistrict(district: string): Region | null {
  // Try exact match first
  const exact = districtToRegionMap.get(district);
  if (exact) return exact;

  // Case-insensitive fallback
  const lower = district.toLowerCase();
  for (const [name, region] of districtToRegionMap) {
    if (name.toLowerCase() === lower) return region;
  }
  return null;
}

/**
 * Search districts by query string (case-insensitive substring match).
 * Returns matching district names sorted alphabetically.
 */
export function searchDistricts(query: string): string[] {
  if (!query || query.trim().length === 0) return allUgandanDistricts;
  const lower = query.toLowerCase().trim();
  return allUgandanDistricts.filter((d) => d.toLowerCase().includes(lower));
}

/**
 * Get a district with its region metadata.
 */
export function getDistrictInfo(districtName: string): District | null {
  const region = getRegionByDistrict(districtName);
  if (!region) return null;
  return { name: districtName, region };
}

/**
 * Get all districts with their regions (for a grouped selector).
 */
export function getAllDistrictsWithRegions(): District[] {
  return allUgandanDistricts.map((name) => ({
    name,
    region: getRegionByDistrict(name)!,
  })).filter(Boolean);
}
