import { db } from "~/server/db";
import {
  users,
  coreBlocks,
  shifts,
  availabilities,
  exceptions,
} from "~/server/db/schemas";
import { eq, and } from "drizzle-orm";

export default function TestDBPage() {
  // Run the test
  testDatabaseOperations()
    .then(() => {
      console.log("\n✨ Test script finished");
    })
    .catch((error) => {
      console.error("Script error:", error);
    });

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Database Testing</h1>
      <p className="text-gray-600">Check server console to see test results.</p>
    </div>
  );
}

function ensureResult<T>(result: T[], operation: string): T {
  if (!result || result.length === 0) {
    throw new Error(`${operation} failed: No data returned`);
  }
  return result[0]!;
}

async function testDatabaseOperations() {
  console.log("🧪 Starting database tests...\n");

  try {
    // Test 1: INSERT - Create a user
    console.log("1️⃣ Testing INSERT operations...");
    const newUser = ensureResult(
      await db
        .insert(users)
        .values({
          firstName: "Test",
          lastName: "User",
          role: "staff",
          status: "active",
          email: "test.user@example.com",
        })
        .returning(),
      "T1: User creation",
    );
    console.log("✅ User created:", {
      id: newUser.id,
      firstName: `${newUser.firstName}`,
      lastName: `${newUser.lastName}`,
    });

    // Test 2: INSERT - Create core block
    const newCoreBlock = ensureResult(
      await db
        .insert(coreBlocks)
        .values({
          dayOfWeek: "mon",
          shiftOfDay: "m1",
          timeStart: 900,
          timeEnd: 1200,
          numberOfEmployees: 2,
        })
        .returning(),
      "T2: Core block creation",
    );
    console.log("✅ Core block created:", {
      id: newCoreBlock.id,
      dayOfWeek: newCoreBlock.dayOfWeek,
      shiftOfDay: newCoreBlock.shiftOfDay,
    });

    // Test 3: INSERT - Create availability for the user
    const newAvailability = ensureResult(
      await db
        .insert(availabilities)
        .values({
          userId: newUser.id,
          coreId: newCoreBlock.id,
        })
        .returning(),
      "T3: Availability creation",
    );
    console.log("✅ Availability created:", {
      id: newAvailability.id,
      userId: newAvailability.userId,
      coreId: newAvailability.coreId,
    });

    // Test 4: INSERT - Create shift
    const newShift = ensureResult(
      await db
        .insert(shifts)
        .values({
          userId: newUser.id,
          coreId: newCoreBlock.id,
          date: "2025-08-04", // Use today's date
          tipsEarned: 25.5,
        })
        .returning(),
      "T4: Shift creation",
    );
    console.log("✅ Shift created:", {
      id: newShift.id,
      tips: newShift.tipsEarned,
    });

    // Test 5: INSERT - Create exception
    const newException = ensureResult(
      await db
        .insert(exceptions)
        .values({
          userId: newUser.id,
          coreId: newCoreBlock.id,
          date: "2025-08-05", // Tomorrow's date
          describe: "Employee unavailable due to personal appointment",
        })
        .returning(),
      "T5: Exception creation",
    );
    console.log("✅ Exception created:", {
      id: newException.id,
      description: newException.describe,
    });

    console.log("\n2️⃣ Testing SELECT operations...");

    // Test 6: SELECT - Retrieve user
    const retrievedUser = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, newUser.id));
    console.log("✅ User retrieved:", retrievedUser);

    // Test 7: SELECT - Retrieve core block
    const retrievedCoreBlock = await db
      .select({
        id: coreBlocks.id,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
      })
      .from(coreBlocks)
      .where(eq(coreBlocks.id, newCoreBlock.id));
    console.log("✅ Core block retrieved:", retrievedCoreBlock);

    // Test 8: SELECT - Retrieve availability
    const retrievedAvailability = await db
      .select({
        id: availabilities.id,
        userId: availabilities.userId,
        coreId: availabilities.coreId,
      })
      .from(availabilities)
      .where(eq(availabilities.id, newAvailability.id));
    console.log("✅ Availability retrieved:", retrievedAvailability);

    // Test 9: SELECT - Retrieve shift
    const retrievedShift = await db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        coreId: shifts.coreId,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,
      })
      .from(shifts)
      .where(eq(shifts.id, newShift.id));
    console.log("✅ Shift retrieved:", retrievedShift);

    // Test 10: SELECT - Retrieve exception
    const retrievedException = await db
      .select({
        id: exceptions.id,
        description: exceptions.describe,
        date: exceptions.date,
      })
      .from(exceptions)
      .where(eq(exceptions.id, newException.id));
    console.log("✅ Exception retrieved:", retrievedException);

    // Test 11: SELECT - Retrieve with relationships
    const userWithRelations = await db
      .select()
      .from(users)
      .where(and(eq(users.id, newUser.id), eq(users.status, "active")));
    console.log("✅ User with relations:", userWithRelations);

    console.log("\n3️⃣ Testing UPDATE operations...");

    // Test 12: UPDATE - Update user
    await db
      .update(users)
      .set({ firstName: "Updated" })
      .where(eq(users.id, newUser.id));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, newUser.id),
    });
    console.log("✅ User updated:", updatedUser?.firstName);

    // Test 13: UPDATE - Update core block
    await db
      .update(coreBlocks)
      .set({
        numberOfEmployees: 3,
        timeEnd: 1300,
      })
      .where(eq(coreBlocks.id, newCoreBlock.id));

    const updatedCoreBlock = await db.query.coreBlocks.findFirst({
      where: eq(coreBlocks.id, newCoreBlock.id),
    });
    console.log("✅ Core block updated:", {
      numberOfEmployees: updatedCoreBlock?.numberOfEmployees,
      timeEnd: updatedCoreBlock?.timeEnd,
    });

    // Test 14: UPDATE - Update shift
    await db
      .update(shifts)
      .set({
        tipsEarned: 35.75,
        date: "2025-08-06",
      })
      .where(eq(shifts.id, newShift.id));

    const updatedShift = await db.query.shifts.findFirst({
      where: eq(shifts.id, newShift.id),
    });
    console.log("✅ Shift updated:", {
      tipsEarned: updatedShift?.tipsEarned,
      date: updatedShift?.date,
    });

    // Test 15: UPDATE - Update exception
    await db
      .update(exceptions)
      .set({
        describe: "Updated: Employee unavailable due to medical appointment",
        date: "2025-08-07",
      })
      .where(eq(exceptions.id, newException.id));

    const updatedException = await db.query.exceptions.findFirst({
      where: eq(exceptions.id, newException.id),
    });
    console.log("✅ Exception updated:", {
      description: updatedException?.describe,
      date: updatedException?.date,
    });

    console.log("\n4️⃣ Testing DELETE operations...");

    // Test 16: DELETE - Delete shift (should cascade)
    await db.delete(shifts).where(eq(shifts.id, newShift.id));
    console.log("✅ Shift deleted");

    // Test 17: DELETE - Delete exception
    await db.delete(exceptions).where(eq(exceptions.id, newException.id));
    console.log("✅ Exception deleted");

    // Test 18: DELETE - Delete availability
    await db
      .delete(availabilities)
      .where(eq(availabilities.id, newAvailability.id));
    console.log("✅ Availability deleted");

    // Test 19: DELETE - Delete core block
    await db.delete(coreBlocks).where(eq(coreBlocks.id, newCoreBlock.id));
    console.log("✅ Core block deleted");

    // Test 20: DELETE - Delete user
    await db.delete(users).where(eq(users.id, newUser.id));
    console.log("✅ User deleted");

    // Test 21: Verify deletion
    const deletedUser = await db.query.users.findFirst({
      where: eq(users.id, newUser.id),
    });
    console.log(
      "✅ Deletion verified:",
      deletedUser ? "❌ Still exists" : "✅ Successfully deleted",
    );

    console.log("\n🎉 All database tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Database test failed:");
    console.error(error);
    throw error; // Re-throw the error instead of process.exit
  } finally {
    console.log("🧹 Cleaning up test data...");
    try {
      // Clean up any remaining test data
      // Delete user will cascade to shifts, availabilities, and exceptions
      await db.delete(users).where(eq(users.email, "test.user@example.com"));
      await db.delete(coreBlocks).where(eq(coreBlocks.dayOfWeek, "mon"));

      console.log(
        "✅ Test data cleanup completed (cascade delete handled related records)",
      );
    } catch (cleanupError) {
      console.error("⚠️ Cleanup failed (non-critical):", cleanupError);
    }
  }
}
