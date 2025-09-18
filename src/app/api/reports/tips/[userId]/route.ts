import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { shifts, users, user_shifts, coreBlocks } from "~/server/db/schemas";
import { DateRangeReportSchema } from "~/lib/requests";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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

    const user = userCheck[0]!;

    // First, get all shift IDs where the user worked in the date range
    const userShiftIds = await db
      .select({ shiftId: user_shifts.shiftId })
      .from(user_shifts)
      .innerJoin(shifts, eq(user_shifts.shiftId, shifts.id))
      .where(
        and(
          eq(user_shifts.userId, validatedParams.userId),
          gte(shifts.date, validatedParams.startDate),
          lte(shifts.date, validatedParams.endDate),
        ),
      );

    // If user has no shifts in the date range, return empty report
    if (userShiftIds.length === 0) {
      const tipsReport = {
        userId: validatedParams.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        period: {
          startDate: validatedParams.startDate,
          endDate: validatedParams.endDate,
        },
        summary: {
          totalTips: 0,
          totalShifts: 0,
        },
        data: [],
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
    }

    const shiftIdsList = userShiftIds
      .map((row) => row.shiftId)
      .filter((id): id is number => id !== null);

    // Single optimized query: Get all shifts + all workers for those shifts
    const shiftsWithAllWorkers = await db
      .select({
        // Shift data
        shiftId: shifts.id,
        date: shifts.date,
        tipsEarned: shifts.tipsEarned,
        coreId: shifts.coreId,
        dayOfWeek: coreBlocks.dayOfWeek,
        shiftOfDay: coreBlocks.shiftOfDay,
        timeStart: coreBlocks.timeStart,
        timeEnd: coreBlocks.timeEnd,
        numberOfEmployees: coreBlocks.numberOfEmployees,
        // Worker data for all workers on each shift
        workerId: users.id,
        workerRole: users.role,
      })
      .from(shifts)
      .innerJoin(user_shifts, eq(shifts.id, user_shifts.shiftId))
      .innerJoin(coreBlocks, eq(shifts.coreId, coreBlocks.id))
      .innerJoin(users, eq(user_shifts.userId, users.id))
      .where(inArray(shifts.id, shiftIdsList))
      .orderBy(shifts.date);

    // Process the results to calculate tip distribution
    const shiftsMap = new Map<
      number,
      {
        shiftId: number;
        date: string;
        tipsEarned: number;
        coreBlock: {
          id: number;
          dayOfWeek: string;
          shiftOfDay: string;
          timeStart: number;
          timeEnd: number;
          numberOfEmployees: number;
        };
        workers: Array<{ id: number; role: string }>;
      }
    >();
    let totalUserTips = 0;

    shiftsWithAllWorkers.forEach((row) => {
      // Initialize shift if not exists
      if (!shiftsMap.has(row.shiftId)) {
        shiftsMap.set(row.shiftId, {
          shiftId: row.shiftId,
          date: row.date,
          tipsEarned: row.tipsEarned || 0,
          coreBlock: {
            id: row.coreId,
            dayOfWeek: row.dayOfWeek,
            shiftOfDay: row.shiftOfDay,
            timeStart: row.timeStart,
            timeEnd: row.timeEnd,
            numberOfEmployees: row.numberOfEmployees,
          },
          workers: [],
        });
      }

      const shift = shiftsMap.get(row.shiftId)!;

      // Add worker to shift
      shift.workers.push({
        id: row.workerId,
        role: row.workerRole,
      });
    });

    // Calculate tip distribution for each shift
    const shiftsWithTips = Array.from(shiftsMap.values()).map((shift) => {
      // Filter out trainees (they don't receive tips per business rules)
      const eligibleWorkers = shift.workers.filter(
        (worker: { id: number; role: string }) => worker.role !== "trainee",
      );
      const eligibleWorkersCount = eligibleWorkers.length;

      // Calculate user's share of tips
      const userTipShare =
        eligibleWorkersCount > 0 ? shift.tipsEarned / eligibleWorkersCount : 0;

      totalUserTips += userTipShare;

      return {
        shiftId: shift.shiftId,
        date: shift.date,
        userTipShare: Math.round(userTipShare * 100) / 100, // Round to 2 decimal places
        totalShiftTips: shift.tipsEarned,
        eligibleWorkers: eligibleWorkersCount,
        coreBlock: shift.coreBlock,
      };
    });

    // Format response
    const tipsReport = {
      userId: validatedParams.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      period: {
        startDate: validatedParams.startDate,
        endDate: validatedParams.endDate,
      },
      summary: {
        totalTips: Math.round(totalUserTips * 100) / 100,
        totalShifts: shiftsWithTips.length,
      },
      data: shiftsWithTips,
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
    const apiError: APIError = handleAPIError(error);

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
