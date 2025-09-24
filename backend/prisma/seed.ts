import { PrismaClient, RoleName, ThemeCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // CREACIÓN DE ROLES
  const rolesToCreate = Object.values(RoleName);
  for (const roleName of rolesToCreate) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    console.log(`Role '${roleName}' created or already exists.`);
  }

  // CREACIÓN DE ADMIN
  const adminEmail = 'admin@admin.com';
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Admin',
        role: { connect: { name: 'ADMIN' } },
        isVerified: true,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user '${adminEmail}' already exists.`);
  }

  // CREACIÓN DE THEMES
  const themesToCreate = Object.values(ThemeCategory);
  for (const category of themesToCreate) {
    await prisma.theme.upsert({
      where: { category },
      update: {},
      create: { category },
    });
    console.log(`Theme '${category}' created or already exists.`);
  }

  // CREACIÓN DEL TRIGGER ISMANUSCRIT
  // Se crea la función
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION set_is_manuscrit()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status IN (
        'PENDING_PRE_FILTERING',
        'ACCEPTED_FOR_PRELIMINARY_REVIEW',
        'ACCEPTED_FOR_FUTURE_JOURNAL',
        'REJECTED_BY_PRE_FILTERING',
        'PENDING_REVIEWER_ASSIGNMENT',
        'IN_REVIEW'
      ) THEN
        NEW."isManuscrit" := true;
      ELSE
        NEW."isManuscrit" := false;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Se borra trigger viejo si existe
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS article_ismanuscrit_trigger ON "Article";`);

  // Se crea el trigger
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER article_ismanuscrit_trigger
    BEFORE INSERT OR UPDATE ON "Article"
    FOR EACH ROW
    EXECUTE FUNCTION set_is_manuscrit();
  `);

  console.log('Trigger for isManuscrit created or replaced ✅');
  console.log('Seeding finished. ');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
