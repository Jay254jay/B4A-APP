import { db } from "../server/db";
import { users } from "../shared/schema";
import { count } from "drizzle-orm";

async function seed() {
  const [userCount] = await db.select({ count: count() }).from(users);
  
  if (userCount.count === 0) {
    console.log("Seeding users...");
    await db.insert(users).values([
      { username: "ngash", name: "Ng'ash", password: "123", role: "staff", pin: "Ng'ash" },
      { username: "jay", name: "Jay", password: "123", role: "staff", pin: "Jay" },
      { username: "samir", name: "Samir", password: "123", role: "staff", pin: "Samir" },
      { username: "esther", name: "Esther", password: "123", role: "staff", pin: "Esther" },
      { username: "cate", name: "Cate", password: "123", role: "staff", pin: "Cate" },
      { username: "admin", name: "Admin", password: "admin", role: "admin", pin: "0000" },
    ]);
    console.log("Seeding complete!");
  } else {
    console.log("Users already exist, skipping seed.");
  }
}

seed().catch(console.error);
