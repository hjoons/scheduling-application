import { db } from "~/server/db";
import { shifts, users, coreBlocks, user_shifts } from "~/server/db/schemas";
import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { ShiftUser, ShiftWithDetails } from "../responses";

const shiftWithCoreBlockQuery = db
  .select({
    // Shift Data
    shiftId: shifts.id,
    date: shifts.date,
    tipsEarned: shifts.tipsEarned,

    // Core Block Data
    coreId: shifts.coreId,
    timeStart: coreBlocks.timeStart,
    timeEnd: coreBlocks.timeEnd,
    dayOfWeek: coreBlocks.dayOfWeek,
    shiftOfDay: coreBlocks.shiftOfDay,
    numberOfEmployees: coreBlocks.numberOfEmployees,
  })
  .from(shifts)
  .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id));

const shiftWithDetailsQuery = db
  .select({
    // Shift data
    shiftId: shifts.id,
    date: shifts.date,
    tipsEarned: shifts.tipsEarned,

    // Core block data
    coreId: shifts.coreId,
    timeStart: coreBlocks.timeStart,
    timeEnd: coreBlocks.timeEnd,
    dayOfWeek: coreBlocks.dayOfWeek,
    shiftOfDay: coreBlocks.shiftOfDay,
    numberOfEmployees: coreBlocks.numberOfEmployees,

    // User data
    userId: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role,
  })
  .from(shifts)
  .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
  .leftJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
  .leftJoin(users, eq(user_shifts.userId, users.id));

export async function getShiftWithCoreBlocks(conditions: SQL[]) {
  return await shiftWithCoreBlockQuery
    .where(and(...conditions))
    .orderBy(shifts.date, coreBlocks.timeStart);
}

export async function getShiftWithDetails(conditions: SQL[]) {
  return await shiftWithDetailsQuery
    .where(and(...conditions))
    .orderBy(shifts.date, coreBlocks.timeStart);
}

export function formatShiftWithDetailsResponse(
  queryResult: Awaited<ReturnType<typeof getShiftWithDetails>>,
): ShiftWithDetails[] | null {
  if (queryResult.length === 0) {
    return null;
  }

  // Group results by shift to handle multiple users per shift
  const shiftsMap = new Map<number, ShiftWithDetails>();

  queryResult.forEach((row) => {
    // Initialize shift if not exists
    if (!shiftsMap.has(row.shiftId)) {
      shiftsMap.set(row.shiftId, {
        id: row.shiftId,
        coreId: row.coreId,
        date: row.date,
        tipsEarned: row.tipsEarned,
        timeStart: row.timeStart,
        timeEnd: row.timeEnd,
        dayOfWeek: row.dayOfWeek,
        shiftOfDay: row.shiftOfDay,
        numberOfEmployees: row.numberOfEmployees,
        users: [],
        totalAssignedUsers: 0,
      });
    }

    console.log(queryResult);
    if (row.userId !== null) {
      const shift = shiftsMap.get(row.shiftId)!;
      const userData: ShiftUser = {
        id: row.userId,
        firstName: row.firstName!,
        lastName: row.lastName!,
        role: row.role!,
        email: row.email!,
      };
      shift.users.push(userData);
      shift.totalAssignedUsers = shift.users.length;
    }
  });

  return Array.from(shiftsMap.values());
}

export function formatShiftWithCoreBlocksResponse(
  queryResult: Awaited<ReturnType<typeof getShiftWithCoreBlocks>>,
): ShiftWithDetails[] | null {
  if (queryResult.length === 0) {
    return null;
  }

  // Group results by shift to handle multiple users per shift
  const shiftsMap = new Map<number, ShiftWithDetails>();

  queryResult.forEach((row) => {
    // Initialize shift if not exists
    if (!shiftsMap.has(row.shiftId)) {
      shiftsMap.set(row.shiftId, {
        id: row.shiftId,
        coreId: row.coreId,
        date: row.date,
        tipsEarned: row.tipsEarned,
        timeStart: row.timeStart,
        timeEnd: row.timeEnd,
        dayOfWeek: row.dayOfWeek,
        shiftOfDay: row.shiftOfDay,
        numberOfEmployees: row.numberOfEmployees,
        users: [],
        totalAssignedUsers: 0,
      });
    }
  });
  return Array.from(shiftsMap.values());
}

// Helper functions to format single shift response
export function formatSingleShiftWithDetailsResponse(
  queryResult: Awaited<ReturnType<typeof getShiftWithDetails>>,
): ShiftWithDetails | null {
  const formattedShifts = formatShiftWithDetailsResponse(queryResult);
  if (!formattedShifts || formattedShifts.length === 0) return null;

  return formattedShifts[0] ?? null;
}

export function formatSingleShiftWithCoreBlocksResponse(
  queryResult: Awaited<ReturnType<typeof getShiftWithCoreBlocks>>,
): ShiftWithDetails | null {
  const formattedShifts = formatShiftWithCoreBlocksResponse(queryResult);
  if (!formattedShifts || formattedShifts.length === 0) return null;

  return formattedShifts[0] ?? null;
}
