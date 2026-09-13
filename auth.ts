import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // JWT مش database sessions — عشان middleware (Edge) يقدر يتحقق من
  // الجلسة من غير ما يعمل query للداتابيز في كل request
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        // مفيش يوزر، أو يوزر داخل بجوجل بس (مالوش password خالص)، أو
        // يوزر اتلغى (Phase 0 anonymization) — في كل الحالات دي نرفض
        if (!user || !user.password || user.deletedAt) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  // callbacks كلهم (authorized, jwt, session) جايين من ...authConfig فوق —
  // مفيش داعي نكررهم هنا، وده بالظبط اللي كان بيسبب الباج
});
