# Frontend RBAC (Phase 12)

The React workspace now uses the signed-in user's role from the verified
`/api/auth/me` response to control navigation, page access, and preview actions.
See [AUTHENTICATION.md](AUTHENTICATION.md) for login and local startup.

## Role matrix

| UI permission | Admin | Analyst | Viewer |
|---|---|---|---|
| Dashboard | Yes | Yes | Yes |
| Transactions | Yes | Yes | Yes |
| Analytics | Yes | Yes | Yes |
| Users | Yes | No | No |
| Audit Logs | Yes | No | No |
| Create transaction button | Visible | Visible | Hidden |
| Delete transaction buttons | Visible | Hidden | Hidden |

The create/delete controls are disabled because transaction records remain
read-only sample data. The page states this explicitly. Actual create forms,
delete confirmation, and mutation refresh are Phase 13 work; this phase does
not mutate sample data or call business APIs. User role editing also remains
in Phase 13.

## Implementation

- `lib/permissions.js` defines the client permission matrix and exposes
  `hasRole(user, ...roles)` and `can(user, permission)`.
- `lib/navigation.js` associates each workspace route with a permission.
  The sidebar filters links using `can()` for both desktop and mobile menus.
- `PermissionRoute` wraps every workspace page. Entering an unauthorized URL
  shows an Access restricted view inside the layout without rendering the
  page's table/data. Allowed roles can return to the dashboard.
- Transactions conditionally render the Create action for Admin/Analyst and
  the Delete column for Admin only. Viewer sees neither action.
- The header shows a role badge at all screen widths. Unsupported roles are
  labelled Unknown role and receive no workspace permissions. Unknown
  permission names and inherited object keys also fail closed.

The client does not derive authority from JWT payload hints or local role
storage. Login/reload/session retry refresh the current user through `/me`.
A role change is reflected in the UI on the next session validation.

These controls are for UX. Client code can be modified by a browser user;
[backend RBAC](../server/RBAC.md) independently checks the current active user
and role for every protected API operation. No backend permissions were
changed in this phase. The two permission matrices intentionally live on
opposite sides of the client/server boundary.

## Validation

Commands executed from the repository root:

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix client test
git diff --check
```

On a fresh environment, follow the Chromium installation instructions in
[AUTHENTICATION.md](AUTHENTICATION.md). Automated browser tests use API fixtures
and do not require real cloud credentials.

Results:

- ESLint, production build, and all 20 Chromium browser tests passed.
- Role tests verified all three roles on desktop and 390px mobile layouts:
  navigation visibility, current-role badge, create/delete action visibility,
  read-only disabled controls, and absence of global horizontal overflow.
- Analyst/Viewer direct `/users` and `/audit-logs` visits were rejected before
  and after reload. Admin could visit both pages directly.
- Unsupported roles, local role hints, unknown permissions, and inherited
  object keys did not grant access. Reload refreshed a changed server role
  and removed prior Admin navigation/access.
- Existing login/session tests remained passing, including logout, expired
  session handling, deep links, safe errors, and retry.
- A live headless Chromium check signed in all three real demo accounts using
  Keychain credentials held in memory. Navigation, transaction actions,
  direct URLs, role badges, and independent backend permission probes all
  matched the matrix. No credentials or JWTs were printed or saved as artifacts.
- The live pages made only login/me API requests, with zero runtime errors.
  No business API integration was added. Backend probes were separate
  read-only validation requests, not page behavior.
- Admin desktop and Viewer mobile layouts were visually reviewed.
- Counts and full-row digests remained unchanged: three users, 750 sales,
  seven audit logs. No other datasets, IAM, or project settings were modified.
- Local servers started for validation were stopped afterward.

Phase 12 stops here. Phase 13 has not started.
