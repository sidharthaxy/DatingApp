import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Resets (or creates) an admin login when the password has been forgotten.
 *
 *   npm run admin:reset                      -> admin@minglex.com / admin123
 *   npm run admin:reset -- you@x.com secret  -> custom email / password
 *
 * The account is flagged to change its password at the next login.
 */
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@minglex.com';
  const password = process.argv[3] || 'admin123';
  const password_hash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { password_hash, force_password_change: true, is_active: true },
    create: { email, password_hash, role: 'SUPER_ADMIN', force_password_change: true },
  });

  console.log(`Admin "${admin.email}" (${admin.role}) can now sign in with the password "${password}".`);
  console.log('They will be asked to choose a new password on first login.');
}

main()
  .catch((error) => {
    console.error('Could not reset the admin account:', error?.message || error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
