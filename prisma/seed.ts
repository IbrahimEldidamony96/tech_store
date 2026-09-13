import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding...");

  // ترتيب الحذف مهم بسبب الـ FK constraints — الأبناء الأول، الآباء بعدين
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.variantOptionValue.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productOptionValue.deleteMany();
  await prisma.productOption.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // ---------- Users ----------
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@techstore.com",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      name: "Ahmed Hassan",
      email: "ahmed@example.com",
      password: passwordHash,
      role: "CUSTOMER",
      addresses: {
        create: [
          {
            firstName: "Ahmed",
            lastName: "Hassan",
            phone: "+201001234567",
            country: "Egypt",
            governorate: "Cairo",
            city: "Nasr City",
            street: "10 Makram Ebeid St",
            buildingNo: "5",
            apartment: "12",
            isDefault: true,
          },
        ],
      },
    },
  });

  // ---------- Categories ----------
  const electronics = await prisma.category.create({
    data: { nameEn: "Electronics", nameAr: "إلكترونيات", slug: "electronics" },
  });
  const phones = await prisma.category.create({
    data: { nameEn: "Phones", nameAr: "هواتف", slug: "phones", parentId: electronics.id },
  });
  const laptops = await prisma.category.create({
    data: { nameEn: "Laptops", nameAr: "لابتوبات", slug: "laptops", parentId: electronics.id },
  });
  const accessories = await prisma.category.create({
    data: { nameEn: "Accessories", nameAr: "إكسسوارات", slug: "accessories", parentId: electronics.id },
  });

  // ---------- Brands ----------
  const apple = await prisma.brand.create({ data: { name: "Apple", slug: "apple" } });
  const samsung = await prisma.brand.create({ data: { name: "Samsung", slug: "samsung" } });
  const dell = await prisma.brand.create({ data: { name: "Dell", slug: "dell" } });

  // ---------- Product 1: iPhone 15 — Color × Storage = 4 variants ----------
  const iphone = await prisma.product.create({
    data: {
      nameEn: "iPhone 15",
      nameAr: "آيفون 15",
      slug: "iphone-15",
      descriptionEn: "The latest iPhone with A16 chip and improved camera system.",
      descriptionAr: "أحدث آيفون بمعالج A16 ونظام كاميرا محسّن.",
      categoryId: phones.id,
      brandId: apple.id,
      images: { create: [{ url: "https://placehold.co/600x600.png?text=iPhone+15", isPrimary: true }] },
      options: {
        create: [
          {
            nameEn: "Color",
            nameAr: "اللون",
            values: { create: [{ valueEn: "Black", valueAr: "أسود" }, { valueEn: "Blue", valueAr: "أزرق" }] },
          },
          {
            nameEn: "Storage",
            nameAr: "المساحة",
            values: { create: [{ valueEn: "128GB", valueAr: "128 جيجابايت" }, { valueEn: "256GB", valueAr: "256 جيجابايت" }] },
          },
        ],
      },
    },
    include: { options: { include: { values: true } } },
  });

  const iColor = iphone.options.find((o) => o.nameEn === "Color")!;
  const iStorage = iphone.options.find((o) => o.nameEn === "Storage")!;
  const [black, blue] = iColor.values;
  const [gb128, gb256] = iStorage.values;

  const iphoneVariants = [
    { color: black, storage: gb128, sku: "IPH15-BLK-128", price: 999, stock: 40 },
    { color: black, storage: gb256, sku: "IPH15-BLK-256", price: 1099, stock: 25 },
    { color: blue, storage: gb128, sku: "IPH15-BLU-128", price: 999, stock: 30 },
    { color: blue, storage: gb256, sku: "IPH15-BLU-256", price: 1099, stock: 15 },
  ];

  for (const v of iphoneVariants) {
    await prisma.productVariant.create({
      data: {
        productId: iphone.id,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        optionValues: { create: [{ optionValueId: v.color.id }, { optionValueId: v.storage.id }] },
      },
    });
  }

  // ---------- Product 2: Samsung Galaxy S24 — Color only = 2 variants ----------
  const galaxy = await prisma.product.create({
    data: {
      nameEn: "Samsung Galaxy S24",
      nameAr: "سامسونج جالاكسي S24",
      slug: "samsung-galaxy-s24",
      descriptionEn: "Flagship Samsung phone with AI features.",
      descriptionAr: "هاتف سامسونج الرائد بمزايا الذكاء الاصطناعي.",
      categoryId: phones.id,
      brandId: samsung.id,
      images: { create: [{ url: "https://placehold.co/600x600.png?text=Galaxy+S24", isPrimary: true }] },
      options: {
        create: [
          {
            nameEn: "Color",
            nameAr: "اللون",
            values: { create: [{ valueEn: "Black", valueAr: "أسود" }, { valueEn: "White", valueAr: "أبيض" }] },
          },
        ],
      },
    },
    include: { options: { include: { values: true } } },
  });

  const [gBlack, gWhite] = galaxy.options[0].values;
  await prisma.productVariant.create({
    data: { productId: galaxy.id, sku: "GAL24-BLK", price: 899, stock: 35, optionValues: { create: [{ optionValueId: gBlack.id }] } },
  });
  await prisma.productVariant.create({
    data: { productId: galaxy.id, sku: "GAL24-WHT", price: 899, stock: 20, optionValues: { create: [{ optionValueId: gWhite.id }] } },
  });

  // ---------- Product 3: MacBook Air M2 — Storage only = 2 variants ----------
  const macbook = await prisma.product.create({
    data: {
      nameEn: "MacBook Air M2",
      nameAr: "ماك بوك اير M2",
      slug: "macbook-air-m2",
      descriptionEn: "Thin and light laptop powered by the Apple M2 chip.",
      descriptionAr: "لابتوب خفيف ورفيع بمعالج Apple M2.",
      categoryId: laptops.id,
      brandId: apple.id,
      images: { create: [{ url: "https://placehold.co/600x600.png?text=MacBook+Air", isPrimary: true }] },
      options: {
        create: [
          {
            nameEn: "Storage",
            nameAr: "المساحة",
            values: { create: [{ valueEn: "256GB", valueAr: "256 جيجابايت" }, { valueEn: "512GB", valueAr: "512 جيجابايت" }] },
          },
        ],
      },
    },
    include: { options: { include: { values: true } } },
  });

  const [m256, m512] = macbook.options[0].values;
  await prisma.productVariant.create({
    data: { productId: macbook.id, sku: "MBA-M2-256", price: 1099, stock: 20, optionValues: { create: [{ optionValueId: m256.id }] } },
  });
  await prisma.productVariant.create({
    data: { productId: macbook.id, sku: "MBA-M2-512", price: 1299, stock: 12, optionValues: { create: [{ optionValueId: m512.id }] } },
  });

  // ---------- Product 4: Dell XPS 13 — RAM only = 2 variants ----------
  const xps = await prisma.product.create({
    data: {
      nameEn: "Dell XPS 13",
      nameAr: "ديل XPS 13",
      slug: "dell-xps-13",
      descriptionEn: "Compact Windows ultrabook with an InfinityEdge display.",
      descriptionAr: "لابتوب ويندوز مدمج بشاشة InfinityEdge.",
      categoryId: laptops.id,
      brandId: dell.id,
      images: { create: [{ url: "https://placehold.co/600x600.png?text=Dell+XPS+13", isPrimary: true }] },
      options: {
        create: [
          {
            nameEn: "RAM",
            nameAr: "الرام",
            values: { create: [{ valueEn: "8GB", valueAr: "8 جيجابايت" }, { valueEn: "16GB", valueAr: "16 جيجابايت" }] },
          },
        ],
      },
    },
    include: { options: { include: { values: true } } },
  });

  const [r8, r16] = xps.options[0].values;
  await prisma.productVariant.create({
    data: { productId: xps.id, sku: "XPS13-8GB", price: 949, stock: 18, optionValues: { create: [{ optionValueId: r8.id }] } },
  });
  await prisma.productVariant.create({
    data: { productId: xps.id, sku: "XPS13-16GB", price: 1149, stock: 10, optionValues: { create: [{ optionValueId: r16.id }] } },
  });

  // ---------- Product 5: Wireless Mouse — no options, single variant ----------
  await prisma.product.create({
    data: {
      nameEn: "Wireless Mouse",
      nameAr: "ماوس لاسلكي",
      slug: "wireless-mouse",
      descriptionEn: "Ergonomic wireless mouse with long battery life.",
      descriptionAr: "ماوس لاسلكي مريح بعمر بطارية طويل.",
      categoryId: accessories.id,
      images: { create: [{ url: "https://placehold.co/600x600.png?text=Wireless+Mouse", isPrimary: true }] },
      variants: { create: [{ sku: "MOUSE-WL-01", price: 29.99, stock: 100 }] },
    },
  });

  // ---------- Coupon ----------
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minOrderAmount: 500,
      maxDiscount: 200,
      usageLimitPerUser: 1,
      expiresAt,
    },
  });

  console.log("✅ Done:");
  console.log("   Users: admin@techstore.com / ahmed@example.com  (password: password123)");
  console.log("   Categories: 4  |  Brands: 3  |  Products: 5 (11 variants)  |  Coupon: WELCOME10");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
