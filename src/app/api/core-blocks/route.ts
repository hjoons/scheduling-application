import { NextRequest } from "next/server";
import { db } from "~/server/db";
import { coreBlocks } from "~/server/db/schemas";
import {
  GetCoreBlocksQuerySchema,
  CreateCoreBlockRequestSchema,
} from "~/lib/requests";
import { eq, and } from "drizzle-orm";
import { handleAPIError } from "~/lib/errors/error-handler";
import { NotFoundError, ValidationError } from "~/lib/errors/";

// GET /api/core-blocks - List core blocks via query parameters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      dayOfWeek: searchParams.get("dayOfWeek"),
      shiftOfDay: searchParams.get("shiftOfDay"),
    };

    const queryParams = GetCoreBlocksQuerySchema.parse(rawParams);

    const conditions = [];
    if (queryParams.dayOfWeek) {
      conditions.push(eq(coreBlocks.dayOfWeek, queryParams.dayOfWeek));
    }

    if (queryParams.shiftOfDay) {
      conditions.push(eq(coreBlocks.shiftOfDay, queryParams.shiftOfDay));
    }

    const coreBlocksList = await db
      .select()
      .from(coreBlocks)
      .where(and(...conditions));

    return Response.json(
      {
        success: true,
        message:
          coreBlocksList.length > 0
            ? "Core blocks retrieved successfully"
            : "No core blocks found",
        coreBlocks: coreBlocksList,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Core blocks retrieval failed",
        coreBlocks: null,
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

// POST /api/core-blocks/[id] - Create ONE core block with a specific "{day}-{block}" id
// Endpoint is different from generic POST because it requires a specific day and block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    const parsedBody = CreateCoreBlockRequestSchema.parse(body);

    // Insert the new core block into the database
    const newCoreBlock = await db
      .insert(coreBlocks)
      .values(parsedBody)
      .returning();

    return Response.json(
      {
        success: true,
        message: "Core block created successfully",
        coreBlocks: newCoreBlock[0],
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Core block creation failed",
        coreBlocks: null,
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

// DELETE /api/core-blocks/ - Delete all core blocks of a specific day or shift
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawParams = {
      dayOfWeek: searchParams.get("dayOfWeek"),
      shiftOfDay: searchParams.get("shiftOfDay"),
    };

    const queryParams = GetCoreBlocksQuerySchema.parse(rawParams);

    if (!queryParams.dayOfWeek && !queryParams.shiftOfDay) {
      throw new NotFoundError(
        "Requires at least one parameter: dayOfWeek or shiftOfDay",
      );
    }

    const conditions = [];
    if (queryParams.dayOfWeek) {
      conditions.push(eq(coreBlocks.dayOfWeek, queryParams.dayOfWeek));
    }

    if (queryParams.shiftOfDay) {
      conditions.push(eq(coreBlocks.shiftOfDay, queryParams.shiftOfDay));
    }

    const deletedCoreBlocks = await db
      .delete(coreBlocks)
      .where(and(...conditions))
      .returning();

    return Response.json(
      {
        success: true,
        message: deletedCoreBlocks
          ? `Core blocks deleted for day of the week ${queryParams.dayOfWeek} and shift of the day ${queryParams.shiftOfDay}`
          : "No changes made",
        coreBlocks: deletedCoreBlocks ?? null,
        error: null,
      },
      { status: 200 },
    );
  } catch (error) {
    const apiError = handleAPIError(error);

    return Response.json(
      {
        success: false,
        message: "Core block deletion failed",
        coreBlocks: null,
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
