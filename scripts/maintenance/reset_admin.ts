import { db } from "../../server/db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function resetAdmin() {
  console.log("Resetting admin user...");
  try {
    const deletedCount = await db.delete(users)
      .where(eq(users.username, 'admin'))
      .returning();
    
    console.log(`Deleted ${deletedCount.length} admin users.`);
    console.log("Admin user will be recreated on next server start with username: admin and password: Cuongtm2012$");
    console.log("NOTE: You'll need to run the complete database reset script to recreate the admin user.");
  } catch (error) {
    console.error("Error resetting admin user:", error);
  }
}

resetAdmin()
  .then(() => {
    console.log("Admin reset completed!");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });
