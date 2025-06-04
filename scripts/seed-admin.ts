#!/usr/bin/env tsx

/**
 * Admin User Seeding Script
 * Seeds a single admin user for production use
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { remoteAdminsTable } from "../src/lib/database/remote-schema";
import { NeonManager } from "../src/lib/database/neon";

async function seedAdmin() {
  console.log("🔐 Starting admin user seeding...");

  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ NEON_DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    const neonManager = NeonManager.getInstance(databaseUrl);
    await neonManager.initialize();
    const db = neonManager.getDatabase();

    const adminData = {
      email: "admin@lifeville.edu.ng",
      username: "admin",
      passwordHash: await bcrypt.hash("admin123", 10),
      firstName: "System",
      lastName: "Administrator",
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
      phoneNumber: "07066559476",
      permissions: {
        manage_users: true,
        manage_questions: true,
        manage_subjects: true,
        view_analytics: true,
        system_admin: true,
        export_data: true,
        import_data: true,
        manage_backups: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("📝 Creating admin user...");
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Phone: ${adminData.phoneNumber}`);
    console.log(`   Role: ${adminData.role}`);

    const existingAdmin = await db
      .select()
      .from(remoteAdminsTable)
      .where(eq(remoteAdminsTable.username, adminData.username))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("⚠️  Admin user already exists, updating...");

      await db
        .update(remoteAdminsTable)
        .set({
          passwordHash: adminData.passwordHash,
          email: adminData.email,
          phoneNumber: adminData.phoneNumber,
          permissions: adminData.permissions,
          updatedAt: new Date(),
        })
        .where(eq(remoteAdminsTable.username, adminData.username));

      console.log("✅ Admin user updated successfully");
    } else {
      await db.insert(remoteAdminsTable).values(adminData);
      console.log("✅ Admin user created successfully");
    }

    await neonManager.close();

    console.log("🎉 Admin seeding completed!");
    console.log("");
    console.log("📋 Login Credentials:");
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Password: admin123`);
    console.log("");
    console.log("⚠️  Security Note:");
    console.log(
      "   Change the default password after first login in production!"
    );
  } catch (error) {
    console.error("❌ Admin seeding failed:", error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  seedAdmin().catch(console.error);
}

export { seedAdmin };
