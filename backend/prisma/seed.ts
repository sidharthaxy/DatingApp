/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const interests = [
    { name: 'Photography', category: 'Creative' },
    { name: 'Traveling', category: 'Lifestyle' },
    { name: 'Coffee', category: 'Food & Drink' },
    { name: 'Gym', category: 'Fitness' },
    { name: 'Gaming', category: 'Entertainment' },
    { name: 'Reading', category: 'Hobbies' },
    { name: 'Movies', category: 'Entertainment' },
    { name: 'Music', category: 'Creative' },
    { name: 'Cooking', category: 'Food & Drink' },
    { name: 'Hiking', category: 'Fitness' },
    { name: 'Art', category: 'Creative' },
    { name: 'Dancing', category: 'Entertainment' },
  ];

  console.log('Seeding interests...');
  for (const interest of interests) {
    await prisma.interest.create({
      data: interest
    });
  }
  console.log('Interests seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
