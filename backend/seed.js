require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log('🌱 Felhasználók ellenőrzése és létrehozása...');

  // Jelszavak titkosítása
  const adminPass = await bcrypt.hash('adminpass123', 10);
  const soforPass = await bcrypt.hash('klienspass123', 10);

  // Admin létrehozása vagy felülírása
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password_hash: adminPass, role: 'ADMIN' },
    create: { username: 'admin', password_hash: adminPass, role: 'ADMIN' }
  });

  // Sofőr létrehozása vagy felülírása
  await prisma.user.upsert({
    where: { username: 'sofor_hunor' },
    update: { password_hash: soforPass, role: 'USER' },
    create: { username: 'sofor_hunor', password_hash: soforPass, role: 'USER' }
  });

  console.log('✅ KÉSZ! Az admin és a sofor_hunor fiók most már garantáltan létezik a helyes jelszóval!');
  process.exit(0);
}

seed();
