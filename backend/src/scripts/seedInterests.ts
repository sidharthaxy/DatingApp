import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const interests = [
  { name: 'Travel', category: 'Lifestyle' },
  { name: 'Music', category: 'Arts' },
  { name: 'Gaming', category: 'Tech' },
  { name: 'Cooking', category: 'Food' },
  { name: 'Fitness', category: 'Health' },
  { name: 'Photography', category: 'Arts' },
  { name: 'Art', category: 'Arts' },
  { name: 'Movies', category: 'Entertainment' },
  { name: 'Reading', category: 'Lifestyle' },
  { name: 'Coding', category: 'Tech' },
  { name: 'Yoga', category: 'Health' },
  { name: 'Hiking', category: 'Outdoors' },
  { name: 'Dancing', category: 'Arts' },
  { name: 'Coffee', category: 'Food' },
  { name: 'Tech', category: 'Tech' },
  { name: 'Fashion', category: 'Lifestyle' },
  { name: 'Nature', category: 'Outdoors' },
  { name: 'Writing', category: 'Arts' },
  { name: 'Psychology', category: 'Science' },
  { name: 'Philosophy', category: 'Science' },
];

async function main() {
  console.log('Seeding interests...');
  for (const interest of interests) {
    try {
      const exists = await prisma.interest.findFirst({
        where: { name: interest.name }
      });
      
      if (!exists) {
        await prisma.interest.create({
          data: interest
        });
        console.log(`Created: ${interest.name}`);
      } else {
        console.log(`Exists: ${interest.name}`);
      }
    } catch (err) {
      console.error(`Error for ${interest.name}:`, err);
    }
  }
  console.log('Finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
