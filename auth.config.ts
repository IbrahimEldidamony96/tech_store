import type { NextAuthConfig } from "next-auth";

// ⚠️ الملف ده لازم يفضل edge-safe (بيتحمّل في middleware.ts اللي شغال على
// Edge runtime، مش Node). عشان كده: من غير providers فيها DB queries
// (زي Credentials)، ومن غير PrismaAdapter (بيعتمد على "pg" اللي مش
// متوافق مع Edge). الـ providers الحقيقية والـ adapter موجودين في auth.ts.

export default {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;

      const isAdminArea =
        path.startsWith("/admin") || path.startsWith("/api/admin");
      if (isAdminArea) {
        return isLoggedIn && auth?.user?.role === "ADMIN";
      }

      return true; // باقي الصفحات مفتوحة — أي تحقق أدق بيحصل جوه كل route لوحده
    },
    // ⚠️ نقلنا jwt/session هنا (مش سايبينهم في auth.ts بس) عشان النسخة
    // الخفيفة اللي بيستخدمها proxy.ts تشوف الـ role برضه، مش بس النسخة
    // الكاملة. من غيرها، الـ Header يقدر يشوف role الأدمن لكن proxy.ts
    // (اللي بيمنع دخول /admin) يشوفه CUSTOMER عادي — بالظبط الباج اللي حصل.
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role =
          (user as { role?: "CUSTOMER" | "ADMIN" }).role ?? "CUSTOMER";
      }
      // بيتفعّل لما الفرونت إند ينادي useSession().update({...}) بعد
      // تحديث البروفايل — من غيره الاسم/الصورة في الـ session هيفضلوا
      // القيم القديمة لحد ما اليوزر يعمل logout/login تاني، لأن JWT
      // strategy مالهاش داعي يرجع للداتابيز في كل request
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CUSTOMER" | "ADMIN";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
