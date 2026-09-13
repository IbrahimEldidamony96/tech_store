import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { Prisma } from "@/app/generated/prisma/client";

// NextAuth بيدير تسجيل الدخول (authorize) بس، مش إنشاء يوزر جديد —
// ده endpoint منفصل بالكامل بنعمله إحنا.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    // P2002 = الإيميل ده مسجل قبل كده
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    throw err;
  }
}
