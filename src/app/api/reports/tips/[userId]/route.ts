import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, user_shifts, coreBlocks } from "~/server/db/schemas";
import { DateRangeReportSchema } from "~/lib/requests";
import { eq, and, gte, lte } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { ValidationError } from "~/lib/errors/";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { searchParams } = new URL(request.url);
    const { userId } = await params;

    // Validate parameters
    const validatedParams = DateRangeReportSchema.parse({
      userId: userId,
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    // Single database call with JOINs to get all tips data
    const tipsData = await db
      .select({
        shiftId: shifts.id,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,
        coreId: shifts.coreId,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
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

    // Check if user exists / if no data found
    if (tipsData.length === 0) {
      const userExists = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, validatedParams.userId))
        .limit(1);

      if (userExists.length === 0) {
        throw new ValidationError(
          `User with ID ${validatedParams.userId} not found`,
        );
      }
    }

    // Calculate totals
    const totalTips = tipsData.reduce(
      (sum: number, shift) => sum + (shift.tipsEarned || 0),
      0,
    );
    const totalShifts = tipsData.length;

    // Format response
    const tipsReport = {
      userId: validatedParams.userId,
      firstName: tipsData.length > 0 ? tipsData[0]?.firstName : null,
      lastName: tipsData.length > 0 ? tipsData[0]?.lastName : null,
      period: {
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
      },
      summary: {
        totalTips,
        totalShifts,
      },
      data: tipsData.map((shift) => ({
        shiftId: shift.shiftId,
        date: shift.date,
        tipsEarned: shift.tipsEarned,
        coreBlock: {
          id: shift.coreId,
          dayOfWeek: shift.dayOfWeek,
          shiftOfDay: shift.shiftOfDay,
          timeStart: shift.timeStart,
          timeEnd: shift.timeEnd,
        },
      })),
    };

    return Response.json(
      {
        success: true,
        message: "Tips report generated successfully",
        report: tipsReport,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Failed to generate tips report",
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
