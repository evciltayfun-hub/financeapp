const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const movies = [
  { category: "sinema", title: "Avengers: Doomsday", subtitle: "Joe & Anthony Russo", genre: "Aksiyon / Bilim Kurgu", eventDate: "2026-05-01" },
  { category: "sinema", title: "The Batman Part II", subtitle: "Matt Reeves", genre: "Aksiyon / Gerilim", eventDate: "2026-10-02" },
  { category: "sinema", title: "Toy Story 5", subtitle: "Andrew Stanton", genre: "Animasyon / Aile", eventDate: "2026-06-19" },
  { category: "sinema", title: "Spider-Man: Brand New Day", subtitle: "Destin Daniel Cretton", genre: "Aksiyon / Süper Kahraman", eventDate: "2026-07-31" },
  { category: "sinema", title: "Zootopia 2", subtitle: "Jared Bush", genre: "Animasyon / Komedi", eventDate: "2026-11-20" },
  { category: "sinema", title: "How to Train Your Dragon", subtitle: "Dean DeBlois", genre: "Macera / Fantezi", eventDate: "2026-06-05", notes: "Canlı aksiyon uyarlaması" },
  { category: "sinema", title: "Mission: Impossible – The Final Reckoning", subtitle: "Christopher McQuarrie", genre: "Aksiyon / Gerilim", eventDate: "2026-05-23" },
  { category: "sinema", title: "F1", subtitle: "Joseph Kosinski", genre: "Dram / Spor", eventDate: "2026-06-27", notes: "Brad Pitt başrolde, Apple orijinal yapımı" },
];

async function main() {
  const existing = await prisma.cultureEvent.count();
  if (existing > 0) {
    console.log(`Zaten ${existing} etkinlik var, atlanıyor.`);
    return;
  }
  for (const m of movies) {
    await prisma.cultureEvent.create({ data: m });
  }
  console.log(`${movies.length} film eklendi.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
