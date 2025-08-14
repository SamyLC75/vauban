require('dotenv').config();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

(async () => {
  const users = await prisma.user.findMany({
    include: { org: true }
  });

  console.log('JWT générés (Authorization: Bearer <token>):\n');
  for (const u of users) {
    const payload = {
      sub: u.id,
      username: u.username,
      role: u.role,
      orgId: u.orgId,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    console.log(`${u.username} (${u.role}) -> ${token}\n`);
  }

  await prisma.$disconnect();
})();
