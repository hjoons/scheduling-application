import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, user_shifts, coreBlocks } from "~/server/db/schemas";
import { DateRangeReportSchema } from "~/lib/requests";
import { eq, and, gte, lte } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { NotFoundError } from "~/lib/errors/";
import type { APIError } from "~/lib/errors";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId } = await context.params;

    // Validate parameters
    const validatedParams = DateRangeReportSchema.parse({
      userId: userId,
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    // First, verify user exists
    const userCheck = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, validatedParams.userId));

    if (userCheck.length === 0) {
      throw new NotFoundError(
        `User with ID ${validatedParams.userId} not found`,
      );
    }

    // Single database call with JOINs to get all hours data
    const hoursData = await db
      .select({
        shiftId: shifts.id,
        date: shifts.date,
        coreId: shifts.coreId,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        numberOfEmployees: coreBlocks.numberOfEmployees,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(shifts)
      .innerJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .innerJoin(users, eq(user_shifts.userId, users.id))
      .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .where(
        and(
          eq(users.id, validatedParams.userId),
          gte(shifts.date, validatedParams.startDate),
          lte(shifts.date, validatedParams.endDate),
        ),
      )
      .orderBy(shifts.date);

    // Calculate hours for each shift and totals
    const shiftsWithHours = hoursData.map((shift) => {
      // Convert times from HHMM format to decimal hours
      // e.g., 930 -> 9 hours + 30 minutes = 9.5 hours
      const startHours =
        Math.floor(shift.timeStart / 100) + (shift.timeStart % 100) / 60;
      const endHours =
        Math.floor(shift.timeEnd / 100) + (shift.timeEnd % 100) / 60;
      const hoursWorked = endHours - startHours;

      return {
        shiftId: shift.shiftId,
        date: shift.date,
        hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        coreBlock: {
          id: shift.coreId,
          dayOfWeek: shift.dayOfWeek,
          shiftOfDay: shift.shiftOfDay,
          timeStart: shift.timeStart,
          timeEnd: shift.timeEnd,
          numberOfEmployees: shift.numberOfEmployees,
        },
      };
    });

    const totalHours = shiftsWithHours.reduce(
      (sum: number, shift) => sum + shift.hoursWorked,
      0,
    );
    const totalShifts = shiftsWithHours.length;
    // Format response

    const hoursReport = {
      userId: validatedParams.userId,
      firstName: userCheck[0]!.firstName,
      lastName: userCheck[0]!.lastName,
      period: {
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
      },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalShifts,
      },
      data: shiftsWithHours,
    };

    return Response.json(
      {
        success: true,
        message:
          hoursData.length > 0
            ? "Hours report generated successfully"
            : "No shifts found for the specified user and date range",
        report: hoursReport,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "Failed to generate hours report",
        report: null,
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
