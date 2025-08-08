import { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { coreBlocks } from '~/server/db/schemas';
import { UpdateCoreBlockRequestSchema } from '~/lib/requests';
import { eq } from 'drizzle-orm';
import { handleAPIError } from '~/lib/errors/error-handler';
import { NotFoundError, ValidationError } from '~/lib/errors/'

// GET /api/core-blocks/[id] - GET ONE core block
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const coreId = Number(id);

        if (isNaN(coreId) || coreId <= 0) {
            throw new ValidationError("Invalid core block ID format");
        }

        const coreBlock = await db.select()
            .from(coreBlocks)
            .where(eq(coreBlocks.id, coreId));
        
        if (coreBlock.length === 0) { 
            throw new NotFoundError(`Core block with ID ${coreId} not found`);
        }

        return Response.json({
            success: true,
            message: "Core block retrieved successfully",
            coreBlocks: coreBlock[0],
            error: null,
        }, {status: 200});
    } catch (error) {
        const apiError = handleAPIError(error);

        return Response.json({
            success: false,
            message: "Retrieving core block failed",
            coreBlocks: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, {status: apiError.statusCode});
    }
}

// PUT /api/core-blocks/[id] - Update ONE core block
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const coreId = Number(id);

        if (isNaN(coreId) || coreId <= 0) {
            throw new ValidationError("Core block ID must be a number");
        }

        const body = await request.json();

        if (!body || Object.keys(body).length === 0) {
            throw new NotFoundError("Request body cannot be empty");
        }

        const updatePayload = UpdateCoreBlockRequestSchema.parse(body);

        // Update core block in the database
        const updatedCoreBlock = await db.update(coreBlocks)
            .set(updatePayload)
            .where(eq(coreBlocks.id, coreId))
            .returning();

        if (updatedCoreBlock.length === 0) {
            throw new NotFoundError(`Core block with ID ${coreId} not found`);
        }

        return Response.json({
            success: true,
            message: updatedCoreBlock ? `Core block with ID ${coreId} has been updated` : "No changes made",
            coreBlocks: updatedCoreBlock[0],
            error: null
        }, {status: 200});
    } catch (error) {
        const apiError = handleAPIError(error);

        return Response.json({
            success: false,
            message: "Core block update failed",
            coreBlocks: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, { status: apiError.statusCode });
    }
}

// DELETE /api/core-blocks/[id] - Delete ONE core block
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const coreId = Number(id);

        if (isNaN(coreId) || coreId <= 0) {
            throw new ValidationError("Core block ID must be a number");
        }

        // Delete core block from the database
        const deletedCoreBlock = await db.delete(coreBlocks)
            .where(eq(coreBlocks.id, coreId))
            .returning();

        return Response.json({
            success: true,
            message: deletedCoreBlock ? `Core block with ID ${coreId} has been deleted` : "No changes made",
            coreBlocks: deletedCoreBlock[0] ?? null,
            error: null
        }, {status: 200});
    } catch (error) {
        const apiError = handleAPIError(error);

        return Response.json({
            success: false,
            message: "Core block deletion failed",
            coreBlocks: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, { status: apiError.statusCode });
    }
}