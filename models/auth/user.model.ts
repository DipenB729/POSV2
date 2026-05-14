export type Role = "admin" | "manager" | "cashier" | "auditor";

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  locationId?: string;
};
