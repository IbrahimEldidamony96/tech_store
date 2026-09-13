import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "الباسورد لازم يكون 8 حروف على الأقل")
    .regex(/[A-Z]/, "لازم يحتوي على حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "لازم يحتوي على رقم واحد على الأقل"),
});
export type RegisterInput = z.infer<typeof registerSchema>;
