import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: string;
    phone?: string | null;
    status?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      phone: string | null;
      status: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    phone: string | null;
    status: string;
  }
}
