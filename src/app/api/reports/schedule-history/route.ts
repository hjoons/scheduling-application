import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, user_shifts, coreBlocks } from "~/server/db/schemas";
import { ScheduleHistoryQuerySchema } from "~/lib/requests";
import { eq, and, gte, lte } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { success } from "zod/v4";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validatedParams = ScheduleHistoryQuerySchema.parse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    // Single database call with JOINs to get all shift history data
    const scheduleHistoryData = await db
      .select({
        id: shifts.id,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,
        coreId: shifts.coreId,
        // Core block details
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        numberOfEmployees: coreBlocks.numberOfEmployees,
        // User details
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
      })
      .from(shifts)
      .leftJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .leftJoin(users, eq(user_shifts.userId, users.id))
      .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .where(
        and(
          gte(shifts.date, validatedParams.startDate),
          lte(shifts.date, validatedParams.endDate),
        ),
      )
      .orderBy(shifts.date, shifts.id);

    // Group shifts by shift ID to match shifts API format
    const shiftsMap = new Map();

    scheduleHistoryData.forEach((row) => {
      if (!shiftsMap.has(row.id)) {
        shiftsMap.set(row.id, {
          id: row.id,
          date: row.date,
          tipsEarned: row.tipsEarned,
          coreId: row.coreId,
          // Core block information
          dayOfWeek: row.dayOfWeek,
          shiftOfDay: row.shiftOfDay,
          timeStart: row.timeStart,
          timeEnd: row.timeEnd,
          numberOfEmployees: row.numberOfEmployees,
          // Users array
          users: [],
        });
      }

      // Add user to shift if exists
      if (row.userId) {
        const shift = shiftsMap.get(row.id);
        shift.users.push({
          id: row.userId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          role: row.role,
        });
      }
    });

    // Convert map to array and maintain the same structure as shifts API
    const data = Array.from(shiftsMap.values());

    return Response.json(
      {
        success: true,
        message: "Schedule history retrieved successfully",
        shifts: data,
        filters: {
          startDate: validatedParams.startDate,
          endDate: validatedParams.endDate,
        },
        count: data.length,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: apiError.message,
        shifts: null,
        error: {
          type: apiError.type,
          message: apiError.message,
          details: apiError.details,
        },
      },
      { status: apiError.statusCode },
    );
  }
}
