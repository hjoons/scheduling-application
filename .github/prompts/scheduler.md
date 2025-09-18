## 1. Context

- Application stack:
  **Next.js (TypeScript)**
  **Supabase/PostgreSQL** using **DrizzleORM**
  **Clerk** for authentication
  **TailwindCSS + ShadCN** for styling

- Core domain: Schedule generation using the shifts schema from the database, weekly availability for emplooyees, hourly wages and tip distribution
- Business rules:
  - Employees have a core availability schedule (baseline)
  - Weekly availabilities can be adjusted using exceptions
  - No double shifts per day, but evening to next morning is allowed
  - There must be an administrator/leadership role per half day (e.g., `"m1"` & `"m2"` must have an administrator/leadership role and `"e1"` & `"e2"` must have an administrator/leadership role and they must be the **same user**)
  - Trainees are included within the scheduling, but do **not** receive tips
  - Tips are distributed evenly per shift block among non-trainee employees
  - Schedule creation should not be wildly variable from week to week; employees should often work similar shifts from week to week
  - Historical schedules and earnings must be stored for paycheck validation

## 2. Development Rules

- Use TypeScript throughout
- Use DrizzleORM for all database interactions (no raw SQL)
- Follow functional programming principles where possible (pure functions, small units)
- Use descriptive variable names that match domain terms; generalize nomenclature where possible such as when returning similar data across different endpoints (e.g., `shift_block_id`, `core_block_id`, but generalizing variables such as `dayOfWeek` and `tipsEarned`)
- Never invent database columns or schema fields
- Runtime schema and type validation using Zod and Drizzle-Zod. Refer to `~/lib/requests/`

## 3. Code Style

- Prefer `async/await` over `.then()`
- Always include brief, one line comments explaining business logic
- Keep functions concise and composable
- Follow the following project naming conventions:
  - Database tables: snake_case (`employee_earnings`)
  - TypeScript variables: camelCase (`shiftBlockId`)
- Database operations through Drizzle should be an individual call where possible with multiple JOINs where necessary instead of several calls to the database
- Endpoints should return successes based on the use case and semantics of the endpoint. If the client asks for a specific resource and the resource is not found, then it should return a NotFoundError. If a client asks for a collection or a filtered set and the collection is empty, then no data matches the query and we should return a success with an empty array and success message.

## 4. Key entities

- **users**
  - Columns: `id`, `first_name`, `last_name`, `role`, `status`, `email`
  - `role` is an `ENUM`: {`"unvalidated"`, `"trainee"`, `"staff"`, `"leadership"`, `"administrator"`}
  - `status` is an `ENUM`: {`"on_leave"`, `"inactive"`, `"active"`}
- **availabilities**
  - Columns: `id`, `user_id`, `core_id`
  - `availabilities` is a junction table that connects users to core blocks (many to many)
  - The unique index (`user_id`, `core_id`) deduplicates user -> core block relationships
- **exceptions**
  - Columns: `id`, `user_id`, `core_id`, `date`, `description`
  - Exceptions is a junction table that stores information about exceptions while also facilitating many to many for users -> core blocks
- **user_shifts**
  - Columns: `id`, `user_id`, `shift_id` (points to the `shifts` table)
  - `user_shifts` is a junction table that connects users to shift information (many to many)
  - The unique index (`user_id`, `shift_id`) deduplicates user -> shift relationships
- **shifts**
  - Columns: `id`, `core_id`, `date`, `tips_earned`
  - `shifts` contains information about completed shifts that has a FK pointing to the `core_blocks` table for more information about datetime and number of employees for the shift
- **core_blocks**
  - Columns: `id`, `day_of_week`, `shift_of_day`, `time_start`, `time_end`, `number_of_employees`
  - Scheduling and business logic is based around the information in our the `core_blocks` table
    - All tables eventually relate to `core_blocks`, so core_blocks should be treated as a central component that the rest of scheduling logic, shifts, and availability revolve around
  - `day_of_week` is an `ENUM`: {`"mon"`, `"tues"`, `"weds"`, `"thurs"`, `"fri"`, `"sat"`, `"sun"`}
  - `shift_of_day` is an `ENUM`: {`"m1"`, `"m2"`, `"e1"`, `"e2"`} (morning 1, morning 2, evening 1, evening 2)

  # Any changes to key entities will be reflected in `~/src/server/db/schemas`

## 5. Notes

- Always confirm assumptions about schema and double check the file referenced in 4. Key Entities
- If logic is ambiguous, return a **clarifying question** instead of guessing
- Before abstracting, confirm any additions by **clarifying the request** instead of assuming
