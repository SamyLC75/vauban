const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    include: { org: true }
  });

  console.log('Users in database:');
  console.log(JSON.stringify(users, null, 2));

  await prisma.$disconnect();
})();
