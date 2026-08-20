import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUGX(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPhoneNumber(phone: string): string {
  if (phone.startsWith("+256")) return phone;
  if (phone.startsWith("256")) return `+${phone}`;
  if (phone.startsWith("0")) return `+256${phone.slice(1)}`;
  return `+256${phone}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const UGANDA_DISTRICTS = [
  "Kampala",
  "Wakiso",
  "Mukono",
  "Entebbe",
  "Jinja",
  "Mbarara",
  "Mbale",
  "Gulu",
  "Fort Portal",
  "Masaka",
  "Lira",
  "Arua",
  "Soroti",
  "Kasese",
  "Hoima",
  "Mpigi",
  "Kayunga",
  "Buikwe",
  "Luwero",
  "Nakaseke",
  "Nakasongola",
  "Mityana",
  "Mubende",
  "Kabale",
  "Kisoro",
  "Rukungiri",
  "Kanungu",
  "Bushenyi",
  "Ibanda",
  "Isingiro",
  "Ntungamo",
  "Kabarole",
  "Kyejojo",
  "Kamwenge",
  "Kibale",
  "Nwoya",
  "Amuru",
  "Kitgum",
  "Pader",
  "Agago",
  "Otuke",
  "Alebtong",
  "Dokolo",
  "Amolatar",
  "Kaberamaido",
  "Sironko",
  "Manafwa",
  "Bududa",
  "Bufujja",
  "Tororo",
  "Busia",
  "Bugiri",
  "Namutumba",
  "Kaliro",
  "Iganga",
  "Mayuge",
  "Namayingo",
  "Lukaya",
  "Kalungu",
  "Bukomansimbi",
  "Kalambira",
  "Rakai",
  "Lyantonde",
  "Sembabule",
  "Mpigi",
  "Butambala",
  "Gomba",
  "Makindye",
];

export const PROPERTY_TYPES = [
  { value: "single_room", label: "Single Room" },
  { value: "room_self_contained", label: "Room & Self-Contained" },
  { value: "studio", label: "Studio" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "1_bedroom", label: "1 Bedroom" },
  { value: "2_bedroom", label: "2 Bedroom" },
  { value: "3_bedroom", label: "3 Bedroom" },
  { value: "4_plus_bedroom", label: "4+ Bedroom" },
  { value: "apartment", label: "Apartment" },
  { value: "flat", label: "Flat" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "duplex", label: "Duplex" },
  { value: "hostel", label: "Hostel/Student Accommodation" },
];
