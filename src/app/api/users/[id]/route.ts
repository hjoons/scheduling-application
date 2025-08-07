import { NextRequest } from 'next/server';
import { db } from '~/server/db';
import { users } from '~/server/db/schemas';
import { UpdateUserRequestSchema } from '~/lib/requests';
import { eq } from 'drizzle-orm';
import { handleAPIError } from '~/lib/errors/error-handler';
import { ValidationError, NotFoundError } from '~/lib/errors/';
import { ZodError } from 'zod/v4';

// PUT /api/users/[id] - Update ONE user
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const userId = Number(id);

        if (isNaN(userId) || userId <= 0) {
            throw new ValidationError("Invalid user ID format")
        }

        const body = await request.json();

        if (!body || Object.keys(body).length === 0) {
            throw new NotFoundError("Request body cannot be empty");
        }

        const updatePayload = UpdateUserRequestSchema.parse(body);

        const updatedUser = await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, userId))
        .returning();

        if (updatedUser.length === 0) {
            throw new NotFoundError(`User with ID ${userId} not found`);
        }

        return Response.json({
            success: true,
            user: updatedUser[0] || null,
            error: null,
        });
    }  catch (error) {
        const apiError = handleAPIError(error);
        return Response.json({
            success: false,
            user: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, {status: apiError.statusCode});
    }  
}

// DELETE /api/users/[id] - Delete ONE user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = await params;
        const userId = Number(id);

        if (isNaN(userId) || userId <= 0) {
            throw new ValidationError("Invalid user ID format");
        }

        const deletedUser = await db
            .delete(users)
            .where(eq(users.id, userId))
            .returning();

        if (deletedUser.length === 0) {
            throw new NotFoundError(`User with ID ${userId} not found`);
        }

        return Response.json({
            success: true,
            message: `User with ID ${userId} has been deactivated`,
            error: null,
        });
    } catch (error) {
        const apiError = handleAPIError(error);
        return Response.json({
            success: false,
            message: null,
            error: {
                type: apiError.type,
                message: apiError.message,
                details: apiError.details,
            }
        }, {status: apiError.statusCode});
    }
}