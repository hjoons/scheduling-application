import type { NextRequest } from "next/server";
import { shifts } from "~/server/db/schemas";
import { ScheduleHistoryQuerySchema } from "~/lib/requests";
import { and, gte, lte } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import type { APIError } from "~/lib/errors";
import {
  getShiftWithDetails,
  formatShiftWithDetailsResponse,
} from "~/lib/database/shift";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validatedParams = ScheduleHistoryQuerySchema.parse({
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    });

    // Single database call with JOINs to get all shift history data
    const scheduleHistoryData = await getShiftWithDetails([
      and(
        gte(shifts.date, validatedParams.startDate),
        lte(shifts.date, validatedParams.endDate),
      )!,
    ]);
    const shiftData = formatShiftWithDetailsResponse(scheduleHistoryData) ?? [];

    return Response.json(
      {
        success: true,
        message: "Schedule history retrieved successfully",
        shifts: shiftData,
        filters: {
          startDate: validatedParams.startDate,
          endDate: validatedParams.endDate,
        },
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError: APIError = handleAPIError(error);
    return Response.json(
      {
        success: false,
        message: "Failed to retrieve schedule history",
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
