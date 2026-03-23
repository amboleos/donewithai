# User Management Feature - Comprehensive Test Plan

**Date:** 2026-03-24
**Feature:** User Management (Create, Read, Update, Delete users)
**Components:** DB functions, API endpoints, React components, E2E flows

---

## Summary

This document outlines a comprehensive automated testing strategy for the user management feature. Tests are organized by category:

- **Unit Tests:** 15 tasks for DB functions
- **Integration Tests:** 18 tasks for API endpoints
- **Component Tests:** 12 tasks for React components
- **E2E Tests:** 10 tasks for full user flows

**Total: 55 test tasks**

---

## 1. Unit Tests for DB Functions

**Test File:** `tests/lib/db-user-management.test.ts`

### 1.1 createUser() - Happy Path

**Test:** `should create a new user with valid data`

**Description:** Verify that a user can be successfully created with all required fields.

**Setup:**
- Mock database client with successful INSERT response
- Provide valid user data with hashed password

**Assertions:**
- Returns User object with id, name, email, role, github_username, created_at
- Name is trimmed
- Email is lowercased
- github_username is lowercased if provided
- Password is stored (hashed)

**Test data:**
```typescript
{
  name: '  John Doe  ',
  email: 'John@Example.com',
  password: '$2a$10$hashedpassword',
  role: 'developer',
  github_username: '  JohnDoe  '
}
```

---

### 1.2 createUser() - Edge Cases

**Test:** `should handle null github_username`

**Description:** Verify that null github_username is handled correctly.

**Setup:**
- Mock database client
- Provide user data with github_username: null

**Assertions:**
- User is created successfully
- github_username is null in returned object

---

**Test:** `should handle empty string github_username`

**Description:** Verify that empty string github_username is converted to null.

**Setup:**
- Provide user data with github_username: '  ' (whitespace)

**Assertions:**
- Empty string is trimmed to null
- Database receives null for github_username

---

**Test:** `should handle minimum valid data`

**Description:** Verify creation with only required fields.

**Setup:**
- Provide only name, email, password, role
- Omit github_username

**Assertions:**
- User created successfully
- github_username is null

---

### 1.3 createUser() - Database Errors

**Test:** `should throw error on database constraint violation`

**Description:** Verify that duplicate email throws appropriate error.

**Setup:**
- Mock database to throw UNIQUE constraint error

**Assertions:**
- Function throws error
- Error message contains constraint information

---

**Test:** `should throw error on database connection failure`

**Description:** Verify graceful handling of database unavailability.

**Setup:**
- Mock database client to throw connection error

**Assertions:**
- Function throws error
- Error is propagated correctly

---

### 1.4 updateUser() - Happy Path

**Test:** `should update all user fields`

**Description:** Verify that all updatable fields can be modified.

**Setup:**
- Mock database with existing user (id: 1)
- Provide update data for all fields

**Assertions:**
- Returns updated User object
- Name is trimmed
- Email is lowercased
- github_username is lowercased or null
- All fields are updated correctly

---

**Test:** `should update partial user data`

**Description:** Verify that partial updates work correctly.

**Setup:**
- Provide only name and role in update data

**Assertions:**
- Only specified fields are updated
- Other fields remain unchanged
- Returns updated User object

---

**Test:** `should return null for non-existent user`

**Description:** Verify behavior when updating user that doesn't exist.

**Setup:**
- Mock database to return empty result set

**Assertions:**
- Returns null
- No error is thrown

---

### 1.5 updateUser() - Edge Cases

**Test:** `should handle empty update object`

**Description:** Verify behavior when no fields are provided for update.

**Setup:**
- Provide empty object {} as update data

**Assertions:**
- Returns null (no updates to make)
- No database query is executed

---

**Test:** `should convert empty string github_username to null`

**Description:** Verify that empty string is converted to null.

**Setup:**
- Provide github_username: '' in update data

**Assertions:**
- Database receives null for github_username
- User is updated correctly

---

### 1.6 updateUser() - Database Errors

**Test:** `should throw error on duplicate email`

**Description:** Verify that updating to an existing email throws error.

**Setup:**
- Mock database to throw UNIQUE constraint error

**Assertions:**
- Function throws error
- Error message indicates email conflict

---

### 1.7 deleteUser() - Happy Path

**Test:** `should delete existing user`

**Description:** Verify that existing user can be deleted.

**Setup:**
- Mock database with existing user
- Mock rowsAffected = 1

**Assertions:**
- Returns true
- Database DELETE query is executed with correct id

---

**Test:** `should return false for non-existent user`

**Description:** Verify behavior when deleting non-existent user.

**Setup:**
- Mock database with rowsAffected = 0

**Assertions:**
- Returns false
- No error is thrown

---

### 1.8 deleteUser() - Edge Cases

**Test:** `should handle user with cascade dependencies`

**Description:** Verify deletion of user with related data (mappings, jobs).

**Setup:**
- Mock database with CASCADE foreign keys
- User has related user_mappings and ai_jobs

**Assertions:**
- Returns true
- User is deleted
- Related records are also deleted (CASCADE)

---

### 1.9 getAllUsers() - Verification

**Test:** `should return users without passwords`

**Description:** Verify that public user data excludes password field.

**Setup:**
- Mock database with multiple users

**Assertions:**
- Returns array of PublicUser objects
- Password field is NOT included in any user
- All other fields are present

---

**Test:** `should return users ordered by name`

**Description:** Verify that users are sorted alphabetically by name.

**Setup:**
- Mock database with users in random order

**Assertions:**
- Returns users sorted by name ascending
- All users are included

---

### 1.10 getUserByEmail() - Edge Cases

**Test:** `should handle case-insensitive email lookup`

**Description:** Verify that email lookup is case-insensitive.

**Setup:**
- Mock database with user having email: 'test@example.com'

**Assertions:**
- Querying 'TEST@EXAMPLE.COM' returns the user
- Querying 'Test@Example.com' returns the user

---

**Test:** `should return undefined for non-existent email`

**Description:** Verify behavior when email doesn't exist.

**Setup:**
- Mock database with empty result set

**Assertions:**
- Returns undefined
- No error is thrown

---

## 2. API Integration Tests

**Test File:** `tests/api/admin/users-api.test.ts`

### 2.1 GET /api/admin/users - Authentication

**Test:** `should return 403 for non-authenticated request`

**Description:** Verify that unauthenticated requests are rejected.

**Setup:**
- Create request without auth_token cookie

**Assertions:**
- Response status is 403
- Response body contains { error: 'Forbidden' }

---

**Test:** `should return 403 for non-admin user`

**Description:** Verify that non-admin users are rejected.

**Setup:**
- Create request with valid token for role: 'developer'

**Assertions:**
- Response status is 403
- Response body contains { error: 'Forbidden' }

---

**Test:** `should return 200 for admin user`

**Description:** Verify that admin users can access the endpoint.

**Setup:**
- Create request with valid token for role: 'admin'
- Mock getAllUsers() to return test users

**Assertions:**
- Response status is 200
- Response body contains { users: [...] }
- Users do not include password field

---

### 2.2 POST /api/admin/users - Authentication

**Test:** `should return 403 for non-admin create request`

**Description:** Verify that only admins can create users.

**Setup:**
- Create POST request with developer token
- Include valid user data in body

**Assertions:**
- Response status is 403
- User is not created in database

---

### 2.3 POST /api/admin/users - Validation

**Test:** `should return 400 when name is missing`

**Description:** Verify that name is required.

**Setup:**
- Create POST request with admin token
- Body lacks name field

**Assertions:**
- Response status is 400
- Response contains { error: 'Name, email, role and password are required' }

---

**Test:** `should return 400 when email is missing`

**Description:** Verify that email is required.

**Setup:**
- Create POST request with admin token
- Body lacks email field

**Assertions:**
- Response status is 400
- Response contains required fields error

---

**Test:** `should return 400 when password is missing`

**Description:** Verify that password is required for creation.

**Setup:**
- Create POST request with admin token
- Body lacks password field

**Assertions:**
- Response status is 400
- Response contains required fields error

---

**Test:** `should return 400 when role is missing`

**Description:** Verify that role is required.

**Setup:**
- Create POST request with admin token
- Body lacks role field

**Assertions:**
- Response status is 400
- Response contains required fields error

---

**Test:** `should return 400 for invalid role`

**Description:** Verify that only 'admin' or 'developer' roles are accepted.

**Setup:**
- Create POST request with role: 'superadmin'

**Assertions:**
- Response status is 400
- Response contains { error: 'Invalid role' }

---

**Test:** `should return 400 for empty string required fields`

**Description:** Verify that whitespace-only strings are rejected.

**Setup:**
- Create POST with name: '   ', email: '   '

**Assertions:**
- Response status is 400
- Response contains required fields error

---

**Test:** `should return 400 for duplicate email`

**Description:** Verify that duplicate email addresses are rejected.

**Setup:**
- Mock getUserByEmail() to return existing user
- Create POST with existing email

**Assertions:**
- Response status is 400
- Response contains { error: 'Email already exists' }

---

### 2.4 POST /api/admin/users - Success Path

**Test:** `should create user with valid data`

**Description:** Verify successful user creation.

**Setup:**
- Create POST request with all required fields
- Mock createUser() to return new user
- Mock hashPassword() to return hashed password

**Assertions:**
- Response status is 201
- Response contains { user: {...} }
- User object excludes password
- Email is lowercased
- Name is trimmed

---

**Test:** `should create user with github_username`

**Description:** Verify that github_username is handled correctly.

**Setup:**
- Create POST with github_username: 'JohnDoe'

**Assertions:**
- Response status is 201
- User object includes github_username: 'johndoe' (lowercased)

---

**Test:** `should create user with null github_username`

**Description:** Verify that optional github_username defaults to null.

**Setup:**
- Create POST without github_username field

**Assertions:**
- Response status is 201
- User object has github_username: null

---

### 2.5 POST /api/admin/users - Error Handling

**Test:** `should return 500 on database error`

**Description:** Verify graceful handling of database failures.

**Setup:**
- Mock createUser() to throw database error

**Assertions:**
- Response status is 500
- Response contains { error: 'Internal server error' }
- Error is logged to console

---

### 2.6 PUT /api/admin/users/[id] - Authentication

**Test:** `should return 403 for non-admin update request`

**Description:** Verify that only admins can update users.

**Setup:**
- Create PUT request with developer token
- Include valid update data

**Assertions:**
- Response status is 403
- User is not updated

---

### 2.7 PUT /api/admin/users/[id] - Validation

**Test:** `should return 400 for invalid user ID`

**Description:** Verify that non-numeric IDs are rejected.

**Setup:**
- Create PUT request to '/api/admin/users/invalid'

**Assertions:**
- Response status is 400
- Response contains { error: 'Invalid user ID' }

---

**Test:** `should return 400 for invalid role in update`

**Description:** Verify that only valid roles can be set.

**Setup:**
- Create PUT request with role: 'superuser'

**Assertions:**
- Response status is 400
- Response contains { error: 'Invalid role' }

---

### 2.8 PUT /api/admin/users/[id] - Success Path

**Test:** `should update user with valid data`

**Description:** Verify successful user update.

**Setup:**
- Create PUT request with update data
- Mock updateUser() to return updated user

**Assertions:**
- Response status is 200
- Response contains { user: {...} }
- User object excludes password
- Updated fields reflect new values

---

**Test:** `should update user with empty github_username`

**Description:** Verify that empty string github_username is converted to null.

**Setup:**
- Create PUT with github_username: ''

**Assertions:**
- Response status is 200
- User has github_username: null
- updateUser() was called with github_username: null

---

### 2.9 PUT /api/admin/users/[id] - Error Handling

**Test:** `should return 404 for non-existent user`

**Description:** Verify behavior when user doesn't exist.

**Setup:**
- Mock updateUser() to return null

**Assertions:**
- Response status is 404
- Response contains { error: 'User not found' }

---

**Test:** `should return 400 for duplicate email`

**Description:** Verify that email uniqueness is enforced on update.

**Setup:**
- Mock updateUser() to throw UNIQUE constraint error

**Assertions:**
- Response status is 400
- Response contains { error: 'Email already exists' }

---

**Test:** `should return 500 on database error`

**Description:** Verify graceful handling of database failures.

**Setup:**
- Mock updateUser() to throw unexpected error

**Assertions:**
- Response status is 500
- Response contains { error: 'Internal server error' }

---

### 2.10 DELETE /api/admin/users/[id] - Authentication

**Test:** `should return 403 for non-admin delete request`

**Description:** Verify that only admins can delete users.

**Setup:**
- Create DELETE request with developer token

**Assertions:**
- Response status is 403
- User is not deleted

---

### 2.11 DELETE /api/admin/users/[id] - Validation

**Test:** `should return 400 for invalid user ID`

**Description:** Verify that non-numeric IDs are rejected.

**Setup:**
- Create DELETE request to '/api/admin/users/invalid'

**Assertions:**
- Response status is 400
- Response contains { error: 'Invalid user ID' }

---

### 2.12 DELETE /api/admin/users/[id] - Success Path

**Test:** `should delete existing user`

**Description:** Verify successful user deletion.

**Setup:**
- Create DELETE request for existing user
- Mock deleteUser() to return true

**Assertions:**
- Response status is 200
- Response contains { success: true }
- deleteUser() was called with correct ID

---

### 2.13 DELETE /api/admin/users/[id] - Error Handling

**Test:** `should return 404 for non-existent user`

**Description:** Verify behavior when user doesn't exist.

**Setup:**
- Mock deleteUser() to return false

**Assertions:**
- Response status is 404
- Response contains { error: 'User not found' }

---

**Test:** `should return 500 on database error`

**Description:** Verify graceful handling of database failures.

**Setup:**
- Mock deleteUser() to throw error

**Assertions:**
- Response status is 500
- Response contains { error: 'Internal server error' }

---

## 3. Component Tests

**Test File:** `tests/components/admin/user-dialog.test.tsx`

### 3.1 UserDialog - Rendering

**Test:** `should render create mode dialog`

**Description:** Verify that dialog renders correctly for creating new user.

**Setup:**
- Render UserDialog with open={true}, user={null}

**Assertions:**
- Dialog title is 'ADD USER'
- All input fields are rendered (name, email, github_username, role, password)
- Password field label is 'Password'
- Submit button text is 'CREATE'
- Cancel button is present

---

**Test:** `should render edit mode dialog`

**Description:** Verify that dialog renders correctly for editing existing user.

**Setup:**
- Render UserDialog with open={true}, user={existingUser}

**Assertions:**
- Dialog title is 'EDIT USER'
- Fields are pre-populated with user data
- Password field is empty
- Password field label is 'Password (leave empty to keep current)'
- Password hint says 'Leave empty to keep current password'
- Submit button text is 'UPDATE'

---

**Test:** `should show loading state during submission`

**Description:** Verify that loading state is displayed during API call.

**Setup:**
- Render UserDialog
- Mock fetch to delay response
- Submit form

**Assertions:**
- Submit button shows loading spinner
- All input fields are disabled
- Submit and cancel buttons are disabled

---

### 3.2 UserDialog - Form Validation

**Test:** `should show error when name is empty`

**Description:** Verify that name field validates on submit.

**Setup:**
- Render UserDialog
- Leave name field empty
- Fill other required fields
- Submit form

**Assertions:**
- Error message 'Name is required' is shown
- Form is NOT submitted
- Dialog remains open

---

**Test:** `should show error when email is empty`

**Description:** Verify that email field validates on submit.

**Setup:**
- Fill name but leave email empty
- Submit form

**Assertions:**
- Error message 'Email is required' is shown
- Form is NOT submitted

---

**Test:** `should show error for invalid email format`

**Description:** Verify that email format is validated.

**Setup:**
- Fill email with 'invalid-email'
- Submit form

**Assertions:**
- Error message 'Invalid email format' is shown
- Form is NOT submitted

---

**Test:** `should show error when password is empty in create mode`

**Description:** Verify that password is required for new users.

**Setup:**
- Render in create mode (user={null})
- Fill all fields except password
- Submit form

**Assertions:**
- Error message 'Password is required' is shown
- Form is NOT submitted

---

**Test:** `should show error for short password`

**Description:** Verify that password minimum length is enforced.

**Setup:**
- Fill password with '12345' (5 characters)
- Submit form

**Assertions:**
- Error message 'Password must be at least 6 characters' is shown
- Form is NOT submitted

---

**Test:** `should not require password in edit mode`

**Description:** Verify that password is optional when editing.

**Setup:**
- Render in edit mode with existing user
- Leave password empty
- Submit form

**Assertions:**
- No password error is shown
- Form is submitted
- Password field is not included in request body

---

**Test:** `should trim whitespace from name and email`

**Description:** Verify that input values are trimmed.

**Setup:**
- Enter name: '  John Doe  '
- Enter email: '  john@example.com  '

**Assertions:**
- Form data has trimmed values before submission
- Request body contains 'John Doe' and 'john@example.com'

---

### 3.3 UserDialog - API Integration

**Test:** `should call POST /api/admin/users on create`

**Description:** Verify that correct API is called for creation.

**Setup:**
- Render in create mode
- Fill all fields with valid data
- Mock fetch to return success
- Submit form

**Assertions:**
- fetch is called with POST method
- URL is '/api/admin/users'
- Request body includes all form fields
- Password is included in body

---

**Test:** `should call PUT /api/admin/users/[id] on update`

**Description:** Verify that correct API is called for update.

**Setup:**
- Render in edit mode with user.id = 1
- Modify fields
- Mock fetch to return success
- Submit form

**Assertions:**
- fetch is called with PUT method
- URL is '/api/admin/users/1'
- Request body includes modified fields
- Password is NOT included in body (unless changed)

---

**Test:** `should show success toast on successful create`

**Description:** Verify success message is displayed.

**Setup:**
- Mock successful create API response
- Submit form

**Assertions:**
- Success toast is shown with message 'User "[name]" created successfully'
- Dialog is closed
- onSave callback is invoked with returned user

---

**Test:** `should show success toast on successful update`

**Description:** Verify success message is displayed.

**Setup:**
- Mock successful update API response
- Submit form

**Assertions:**
- Success toast is shown with message 'User "[name]" updated successfully'
- Dialog is closed
- onSave callback is invoked with returned user

---

**Test:** `should show error toast on API failure`

**Description:** Verify error handling.

**Setup:**
- Mock fetch to return 400 error
- Submit form

**Assertions:**
- Error toast is shown with API error message
- Dialog remains open
- Form data is preserved
- Loading state is cleared

---

**Test File:** `tests/components/admin/users-tab.test.tsx`

### 3.4 UsersTab - Rendering

**Test:** `should render loading state initially`

**Description:** Verify loading state is displayed.

**Setup:**
- Render UsersTab
- Mock fetch to delay response

**Assertions:**
- Loading spinner is shown
- '[LOADING USERS...]' text is displayed
- Table is not rendered

---

**Test:** `should render user table with data`

**Description:** Verify that users are displayed in table.

**Setup:**
- Mock GET /api/admin/users to return users
- Render UsersTab

**Assertions:**
- Users are displayed in table rows
- Each row shows: name, email, role badge, github username, created date
- Edit and delete buttons are present for each user
- Admin count badge is shown
- Total users count is shown

---

**Test:** `should render empty state when no users`

**Description:** Verify empty state display.

**Setup:**
- Mock API to return empty users array
- Render UsersTab

**Assertions:**
- Empty state message is shown
- Users icon is displayed
- 'No users found.' message is shown

---

**Test:** `should render empty state when search matches nothing`

**Description:** Verify search empty state.

**Setup:**
- Mock API to return users
- Enter search query that matches no users

**Assertions:**
- 'No matching users found.' message is shown

---

### 3.5 UsersTab - Filtering and Sorting

**Test:** `should filter users by search query`

**Description:** Verify that search filters by name or email.

**Setup:**
- Mock users: ['John Doe', 'Jane Smith']
- Enter 'john' in search

**Assertions:**
- Only 'John Doe' is shown
- 'Jane Smith' is hidden
- Filter is case-insensitive

---

**Test:** `should clear search on ESC click`

**Description:** Verify that search can be cleared.

**Setup:**
- Enter search query
- Click [ESC] button

**Assertions:**
- Search input is cleared
- All users are shown

---

**Test:** `should sort users by name`

**Description:** Verify name sorting.

**Setup:**
- Mock users in random order
- Click NAME column header

**Assertions:**
- Users are sorted A-Z on first click
- Users are sorted Z-A on second click
- Sort indicator (chevron) shows direction

---

**Test:** `should sort users by email`

**Description:** Verify email sorting.

**Setup:**
- Click EMAIL column header

**Assertions:**
- Users are sorted by email
- Sort indicator is shown

---

**Test:** `should sort users by role`

**Description:** Verify role sorting.

**Setup:**
- Click ROLE column header

**Assertions:**
- Users are sorted by role (admin before developer or vice versa)

---

**Test:** `should sort users by created date`

**Description:** Verify date sorting.

**Setup:**
- Click CREATED column header

**Assertions:**
- Users are sorted by created_at date
- Sort indicator is shown

---

### 3.6 UsersTab - Actions

**Test:** `should open UserDialog for create`

**Description:** Verify ADD USER button opens dialog.

**Setup:**
- Render UsersTab
- Click ADD USER button

**Assertions:**
- UserDialog opens with create mode
- user prop is null
- onOpenChange callback is invoked

---

**Test:** `should open UserDialog for edit`

**Description:** Verify edit button opens dialog with user data.

**Setup:**
- Render UsersTab with users
- Click edit button for a user

**Assertions:**
- UserDialog opens with edit mode
- user prop contains selected user data
- Dialog is pre-populated

---

**Test:** `should open delete confirmation dialog`

**Description:** Verify delete button opens confirmation.

**Setup:**
- Click delete button for a user

**Assertions:**
- ConfirmDialog opens
- Title is 'Delete User'
- Message includes user name and email
- Warning message 'This action cannot be undone' is shown

---

**Test:** `should call DELETE API on delete confirmation`

**Description:** Verify delete API is called.

**Setup:**
- Open delete confirmation
- Mock DELETE /api/admin/users/[id] to return success
- Click DELETE button

**Assertions:**
- DELETE request is made to correct URL
- Success toast is shown
- Users list is refreshed
- Dialog is closed

---

**Test:** `should show error toast on delete failure`

**Description:** Verify delete error handling.

**Setup:**
- Open delete confirmation
- Mock DELETE to return error
- Click DELETE button

**Assertions:**
- Error toast is shown
- Users list is NOT refreshed
- Dialog is closed

---

**Test:** `should refresh users after save`

**Description:** Verify that users list updates after create/edit.

**Setup:**
- Mock GET /api/admin/users
- Open UserDialog
- Mock successful save
- Save user

**Assertions:**
- GET /api/admin/users is called again
- Users list is updated with new/modified user
- Dialog is closed

---

**Test:** `should show error toast on fetch failure`

**Description:** Verify error handling for initial fetch.

**Setup:**
- Mock GET /api/admin/users to return error
- Render UsersTab

**Assertions:**
- Error toast 'Failed to load users' is shown
- Loading state is cleared
- Empty state or previous data may be shown

---

## 4. E2E Tests

**Test File:** `e2e/user-management.spec.ts`

### 4.1 Login and Navigation

**Test:** `should navigate to Users tab as admin`

**Description:** Verify that admin can access Users tab.

**Steps:**
1. Login as admin user
2. Navigate to Admin page
3. Click on Users tab

**Assertions:**
- Users tab is active
- Users table is displayed
- ADD_USER button is visible
- User counts are shown

---

**Test:** `should not show Users tab to non-admin`

**Description:** Verify that non-admin users don't see Users tab.

**Steps:**
1. Login as developer user
2. Navigate to Admin page (if accessible)

**Assertions:**
- Users tab is NOT visible OR
- Access to Users tab is forbidden

---

### 4.2 Create User Flow

**Test:** `should create new user successfully`

**Description:** Verify complete user creation flow.

**Steps:**
1. Login as admin
2. Navigate to Users tab
3. Click ADD_USER button
4. Fill form:
   - Name: 'Test User'
   - Email: 'test@example.com'
   - Password: 'password123'
   - Role: 'Developer'
   - GitHub Username: 'testuser'
5. Click CREATE button
6. Wait for success toast

**Assertions:**
- Dialog closes
- Success toast appears: 'User "Test User" created successfully'
- New user appears in table
- User count increments
- New user data is correct in table

---

**Test:** `should validate required fields on create`

**Description:** Verify form validation for create.

**Steps:**
1. Open ADD_USER dialog
2. Leave all fields empty
3. Click CREATE button

**Assertions:**
- Dialog remains open
- Error messages shown for: name, email, password, role
- No API call is made
- No success toast appears

---

**Test:** `should enforce email format validation`

**Description:** Verify email format validation.

**Steps:**
1. Open ADD_USER dialog
2. Fill all fields except email
3. Enter invalid email: 'not-an-email'
4. Click CREATE button

**Assertions:**
- Error message: 'Invalid email format'
- Form is NOT submitted

---

**Test:** `should enforce password minimum length`

**Description:** Verify password length validation.

**Steps:**
1. Open ADD_USER dialog
2. Fill all fields
3. Enter password: '12345' (5 chars)
4. Click CREATE button

**Assertions:**
- Error message: 'Password must be at least 6 characters'
- Form is NOT submitted

---

### 4.3 Edit User Flow

**Test:** `should edit existing user successfully`

**Description:** Verify complete user edit flow.

**Steps:**
1. Login as admin
2. Navigate to Users tab
3. Click edit button for a user
4. Modify fields:
   - Change name: 'Updated Name'
   - Change role: 'Admin'
5. Leave password empty
6. Click UPDATE button
7. Wait for success toast

**Assertions:**
- Dialog closes
- Success toast appears: 'User "Updated Name" updated successfully'
- User data is updated in table
- Name and role reflect changes

---

**Test:** `should update password in edit mode`

**Description:** Verify password update in edit mode.

**Steps:**
1. Open edit dialog for a user
2. Fill password field: 'newpassword123'
3. Click UPDATE button

**Assertions:**
- User is updated
- Password change is accepted
- Success toast appears

---

**Test:** `should not require password in edit mode`

**Description:** Verify optional password in edit mode.

**Steps:**
1. Open edit dialog for a user
2. Leave password empty
3. Update other fields
4. Click UPDATE button

**Assertions:**
- Form submits successfully
- No password error is shown
- User is updated
- Existing password is preserved

---

### 4.4 Delete User Flow

**Test:** `should delete user with confirmation`

**Description:** Verify complete delete flow.

**Steps:**
1. Login as admin
2. Navigate to Users tab
3. Click delete button for a user
4. Verify confirmation dialog appears
5. Verify dialog shows user name and email
6. Click DELETE button
7. Wait for success toast

**Assertions:**
- Confirmation dialog appears
- User details are shown in confirmation
- After confirmation, dialog closes
- Success toast: 'User "[name]" deleted'
- User is removed from table
- User count decrements

---

**Test:** `should cancel delete operation`

**Description:** Verify delete cancellation.

**Steps:**
1. Click delete button
2. Click CANCEL button in confirmation dialog

**Assertions:**
- Dialog closes
- User remains in table
- No delete API call is made
- No toast appears

---

### 4.5 Search and Filter

**Test:** `should filter users by name`

**Description:** Verify name search functionality.

**Steps:**
1. Navigate to Users tab
2. Enter search query matching a user's name
3. Observe table updates

**Assertions:**
- Only matching users are shown
- Search is case-insensitive
- Match count is accurate

---

**Test:** `should filter users by email`

**Description:** Verify email search functionality.

**Steps:**
1. Enter search query matching a user's email
2. Observe table updates

**Assertions:**
- Only matching users are shown
- Email search works correctly

---

**Test:** `should clear search filter`

**Description:** Verify search can be cleared.

**Steps:**
1. Enter search query
2. Click [ESC] button or clear search input
3. Observe table updates

**Assertions:**
- Search input is cleared
- All users are shown again

---

**Test:** `should sort users by column`

**Description:** Verify column sorting.

**Steps:**
1. Click NAME column header
2. Verify sort order
3. Click NAME column header again
4. Verify reverse sort order
5. Repeat for EMAIL, ROLE, CREATED columns

**Assertions:**
- First click sorts ascending
- Second click sorts descending
- Sort indicator appears
- Data reorders correctly

---

### 4.6 Error Handling

**Test:** `should handle duplicate email error`

**Description:** Verify duplicate email handling.

**Steps:**
1. Open ADD_USER dialog
2. Enter email that already exists
3. Fill other fields
4. Click CREATE

**Assertions:**
- Error toast: 'Email already exists'
- Dialog remains open
- Form data is preserved

---

**Test:** `should handle network error on create`

**Description:** Verify network error handling.

**Steps:**
1. Open ADD_USER dialog
2. Fill valid data
3. Mock network failure
4. Click CREATE

**Assertions:**
- Error toast appears
- Dialog remains open
- Loading state is cleared

---

**Test:** `should handle unauthorized access`

**Description:** Verify auth enforcement.

**Steps:**
1. Login as admin
2. Navigate to Users tab
3. Logout
4. Try to create/update/delete user

**Assertions:**
- Operations fail
- User is redirected to login
- Or operations show forbidden error

---

### 4.7 Edge Cases

**Test:** `should handle long user names and emails`

**Description:** Verify UI handles long text.

**Steps:**
1. Create user with very long name (100 chars)
2. Create user with very long email

**Assertions:**
- Text is truncated or wrapped appropriately
- No layout breakage
- Data is preserved correctly

---

**Test:** `should handle special characters in name`

**Description:** Verify special character handling.

**Steps:**
1. Create user with name: "José María García-López"
2. Create user with name: "用户"

**Assertions:**
- User is created successfully
- Name displays correctly in table
- Search works with special characters

---

**Test:** `should display role badges correctly`

**Description:** Verify role badge styling.

**Steps:**
1. View users table

**Assertions:**
- Admin badge has accent color styling
- Developer badge has muted styling
- Badges are clearly distinguishable

---

**Test:** `should handle users without github username`

**Description:** Verify null github_username display.

**Steps:**
1. Create user without github username
2. View users table

**Assertions:**
- GitHub column shows '—' for user without github username
- No broken layout

---

### 4.8 Performance

**Test:** `should handle large user list`

**Description:** Verify performance with many users.

**Steps:**
1. Create 50+ test users
2. Navigate to Users tab
3. Test sorting and filtering

**Assertions:**
- Table renders without significant delay
- Sort/filter operations are responsive
- No memory errors or crashes

---

### 4.9 Persistence

**Test:** `should persist changes across page refresh`

**Description:** Verify database persistence.

**Steps:**
1. Create a user
2. Refresh page
3. Verify user exists

**Assertions:**
- New user appears in table after refresh
- User data is correct

---

### 4.10 Concurrent Operations

**Test:** `should handle multiple rapid operations`

**Description:** Verify behavior with rapid clicks.

**Steps:**
1. Rapidly click CREATE button multiple times
2. Rapidly open/close dialogs
3. Rapidly switch sort columns

**Assertions:**
- No duplicate API calls
- No race conditions
- UI remains responsive
- Only one operation is processed

---

## Test Data Setup

### Mock User Data

```typescript
const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    github_username: 'adminuser',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Developer User',
    email: 'dev@example.com',
    role: 'developer',
    github_username: 'devuser',
    created_at: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'No GitHub User',
    email: 'nogithub@example.com',
    role: 'developer',
    github_username: null,
    created_at: '2026-01-03T00:00:00.000Z'
  }
];
```

### Test Credentials for E2E

```typescript
const ADMIN_USER = {
  email: 'admin@test.com',
  password: 'admin123',
  role: 'admin'
};

const DEVELOPER_USER = {
  email: 'developer@test.com',
  password: 'dev123',
  role: 'developer'
};
```

---

## Test Execution Order

### Phase 1: Unit Tests (Fastest)
1. Run DB function tests
2. Run in parallel with mocks
3. Expected time: < 1 minute

### Phase 2: Integration Tests (Medium)
1. Run API endpoint tests
2. Use mock database
3. Expected time: 1-2 minutes

### Phase 3: Component Tests (Medium)
1. Run React component tests
2. Use mocked API responses
3. Expected time: 1-2 minutes

### Phase 4: E2E Tests (Slowest)
1. Run full user flows
2. Use test database
3. Expected time: 5-10 minutes

---

## Coverage Goals

- **Unit Tests:** 90%+ coverage of DB functions
- **Integration Tests:** 100% of API endpoints
- **Component Tests:** 80%+ of component logic
- **E2E Tests:** Critical user flows only

---

## Success Criteria

- All 55 test tasks pass
- No test timeouts
- No flaky tests
- Tests run reliably in CI/CD
- Coverage goals met
- E2E tests complete in < 10 minutes

---

## Dependencies

- Vitest for unit/integration/component tests
- Playwright for E2E tests
- Mock database for unit/integration tests
- Test database for E2E tests
- Test user accounts with known credentials

---

## Notes

- Tests should be isolated (no shared state)
- Use transaction rollback for database tests
- Mock external dependencies (auth, email, etc.)
- Clean up test data after E2E runs
- Use consistent test data across all test types
