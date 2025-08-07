# Scheduling Web App for UTea Pho

This scheduling web application will be used by a small business to generate schedules for employees on a weekly basis. This web application will also be used by employees to track tips and hours worked over periods of time (planned feature).

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + ShadCN
- **Deployment**: Netlify

## User Roles

- **Administrator**: Full access to manage employees, create schedules, and oversee all operations
- **Leadership**: Can view/update employee availability and enter shift tips
- **Staff**: Can view schedules and track personal hours/tips
- **Trainee**: Can view schedules and track personal hours (no tips)
- **Unvalidated**: Can not access any pages -- prevents unauthorized users from creating an account and accessing information

## Administrative User Stories (Managerial)

- As an administrator, I want to see a list of all active and inactive employees (inactive = former employees or those on extended leave)
- As an administrator, I want to create schedules based on employees' availability whenever I want
- As an administrator, I want to specify time slots for events where employees don't need to work (holidays, maintenance, etc.)
- As an administrator, I want to have a log of previously used schedules for reference and pattern analysis
- As an administrator, I want to be able to approve, limit, and deny access of employees to the system
- As a team lead, I want to view and update employees' availability preferences
- As a team lead, I want to enter the tips received for each shift to track employee earnings

## Employee User Stories

- As an employee, I want to set and update my availability preferences
- As an employee, I want to view my assigned shifts in an easy-to-read format
- As an employee, I want to see my total hours worked and tips earned over time
- As an employee, I want to receive notifications about schedule changes

## General Features (All Users)

- As a user, I want to be able to authenticate myself and log into the web application securely
- As a user, I want to be able to view the current schedule in a clean, mobile-friendly format
- As a user, I want to generate summaries for my time worked and tips received over custom time periods

## Backend Schemas

![Schemas](public/scheduler-schemas.png)

## Feature Priority

### MVP (Minimum Viable Product)

- [ ] User authentication and role-based access
- [ ] Employee management (add/edit/deactivate)
- [ ] Basic availability setting
- [ ] Schedule creation and viewing
- [ ] Shift assignment

### Phase 2

- [ ] Tips tracking and reporting
- [ ] Schedule history and analytics
- [ ] Advanced availability preferences

### Future Enhancements

- [ ] Automatic schedule optimization
- [ ] Integration with payroll systems
- [ ] Advanced reporting and insights

## TODO:

### API Routes (Backend)

- [ ] **CRUD Operations**
  - [ ] Set up Zod schemas for request/response validation
    - [x] User validation schemas (create, update, role changes)
    - [ ] Core block validation schemas (time blocks, employee requirements)
    - [ ] Shift validation schemas (assignments, tips, dates)
    - [ ] Availability validation schemas (preferences, exceptions)

  - [x] User Management API Routes
    - [x] `GET /api/users` - List all users
    - [x] `POST /api/users` - Create new user account
    - [x] `PUT /api/users/[id]` - Update user profile and role
    - [x] `DELETE /api/users/[id]` - Deactivate user account (consider making this a soft delete)

  - [ ] Core Blocks API Routes
    - [ ] `GET /api/core-blocks` - Get all time block templates
    - [ ] `POST /api/core-blocks` - Create new time block template
    - [ ] `PUT /api/core-blocks/[id]` - Update time block requirements
    - [ ] `DELETE /api/core-blocks/[id]` - Remove time block template

  - [ ] Availability API Routes
    - [ ] `GET /api/availability/[userId]` - Get user's availability preferences
    - [ ] `POST /api/availability` - Set availability for core blocks
    - [ ] `PUT /api/availability/[id]` - Update availability preferences
    - [ ] `DELETE /api/availability/[id]` - Remove availability

  - [ ] Exceptions API Routes
    - [ ] `GET /api/exceptions/[userId]` - Get user's availability exceptions
    - [ ] `POST /api/exceptions` - Create availability exception
    - [ ] `PUT /api/exceptions/[id]` - Update exception details
    - [ ] `DELETE /api/exceptions/[id]` - Remove exception

  - [ ] Shift Management API Routes
    - [ ] `GET /api/shifts` - Get shifts with date/user filtering
    - [ ] `POST /api/shifts` - Create/assign new shift
    - [ ] `PUT /api/shifts/[id]` - Update shift details and tips
    - [ ] `DELETE /api/shifts/[id]` - Remove shift assignment

  - [ ] Reporting API Routes
    - [ ] `GET /api/reports/tips/[userId]` - Tips earned by user over period
    - [ ] `GET /api/reports/hours/[userId]` - Hours worked by user over period
    - [ ] `GET /api/reports/schedule-history` - Historical schedule data

- [ ] **Scheduling Engine** (Business Logic)
  - [ ] Set up Zod schemas for request/response validation
    - [ ] Schedule generation schemas (create, update, and get)
    - [ ] Schedule validation schemas (conflict responses and coverage)
    - [ ] Analytics schemas (workload and availability preferences)
  - Schedule Generation API Routes
    - [ ] `POST /api/schedule/generate` - Generate schedule for a week of the month
    - [ ] `GET /api/schedule/week/[date]` - Get the weekly schedule view
    - [ ] `PUT /api/schedule/week/[date]` - Bulk update weekly assignments

  - Schedule Validation API Routes
    - [ ] `GET /api/schedule/validate/[date]` - Checks for any conflicts / gaps
    - [ ] `GET /api/schedule/coverage` - Analyze staffing coverage (are all shifts filled to # of employees)
  - Analytics API Routes
    - [ ] `GET /api/analytics/workload/[userId]` - Number of hours worked in a week
    - [ ] `GET /api/analytics/preferences/[userId]` - Availability pattern insights

### Frontend Development

- [ ] Generate a basic, modern front-end utilizing V0 by Vercel
  - [ ] Import ShadCN and set up base components for use
- [ ] Integrate Clerk authentication and authorization for the front-end
