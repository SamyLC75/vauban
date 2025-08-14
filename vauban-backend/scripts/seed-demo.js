const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1) Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Vauban Demo Org',
      code: 'DEMO',
      sector: 'demo',
      sizeClass: 'PME',
    },
  });

  // 2) Create demo users
  const users = [
    {
      id: '1',
      username: 'Samy',
      password: '$2b$10$2XYoZytNMQMY22AOGOXEe.5n1FM7UW2bWgWwLA5c.3KQ2oalYdXhS',
      role: 'ADMIN',
    },
    {
      id: '2',
      username: 'Takaya',
      password: '$2b$10$Ql8hTOWqakDVwHXVSXMny.b0Gug5teHGh2zhzkCRREKolfeea833y',
      role: 'USER',
    },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        password: u.password,
        role: u.role,
        orgId: org.id,
      },
    });
  }

  console.log('✅ Seed terminé : org DEMO + utilisateurs Samy & Takaya');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
