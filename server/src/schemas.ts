import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^(\+92|0)3\d{9}$/, "Enter a mobile number like 03001234567."),
  role: z.enum(["buyer", "seller"]),
  password: z.string().min(8, "Use at least 8 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const EVIDENCE_KEYS = [
  "registration",
  "inspection",
  "service",
  "owner_cnic",
] as const;

export const createListingSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(1990, "Enter a valid model year.")
    .max(new Date().getFullYear() + 1, "Enter a valid model year."),

  makeModel: z.string().trim().min(3, "Enter the make and model.").max(80),

  price: z.coerce
    .number()
    .int()
    .positive("Enter the asking price.")
    .max(1_000_000_000),

  mileage: z.coerce
    .number()
    .int()
    .positive("Enter the mileage in km.")
    .max(2_000_000),

  city: z.string().trim().min(2, "Enter the city.").max(60),

  about: z.string().trim().max(1000).default(""),

  bodyType: z.string().trim().min(1, "Please select a body type."),

  fuelType: z.string().trim().min(1, "Please select a fuel type."),

  evidence: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(EVIDENCE_KEYS))),
});
