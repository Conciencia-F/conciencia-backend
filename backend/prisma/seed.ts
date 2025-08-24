import { PrismaClient, RoleName } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  const rolesToCreate = Object.values(RoleName);

  for (const roleName of rolesToCreate) {
    await prisma.role.create({
      data: {
        name: roleName,
      },
    });
    console.log(`Created role: ${roleName}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
