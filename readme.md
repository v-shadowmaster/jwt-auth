# JWT AUTHENTICATION AND AUTHORIZATION

    - Building the full-stack auth system using Next-js Express and Postgresql DB with prisma as ORM

### 1) - CORE CONCEPTS ( SIMPLE )

**Authentication** = providing who a user is (login)
**Authorization** = deciding what a logged-in user may do (roles, scopes).

**JWT (JSON Web Token)** is a compact , URL-safe token that carries claims (data) and is signed so the server can verify it wasn’t tampered with. A JWT has three parts: header.payload.signature (base64url encoded).

- **Header**: algorithm, token type (e.g. { "alg": "HS256", "typ": "JWT" }).
- **Payload (claims)**: e.g. sub (user id), iat, exp, plus custom claims such as role.
- **Signature**: HMAC or RSA signature over header+payload.

**Access token** : short-lived JWT used to access APIs.  
**Refresh token** : longer-lived credential used to get new access tokens when the access token expires.

### 2) - HIGH - LEVEL FLOW (login, use, refresh, logout)

- User logs in with credentials.
- Server verifies credentials, issues:
  - **access token (JWT)** (e.g., expiry 15 min).
  - **refresh token** (random opaque token or long JWT, expiry e.g., 7–30 days).
- Client sends access token with API requests (usually in Authorization: Bearer <token> or via secure cookie).
- When access token expires, client calls /refresh-token with refresh token to obtain a new access token (and often a new refresh token).
- On logout or suspicious activity, server revokes refresh token(s). Access tokens expire quickly and don’t need immediate revocation (optional blacklist).

### 3) - STORAGE AND REVOCATION STRATEGIES

- **Access tokens:** stateless; typically not stored server-side. Validate signature and exp.
- **Refresh tokens:** must be stored server-side (DB or Redis) or issued as opaque tokens so you can revoke them. Store them hashed (bcrypt or HMAC) — never store raw tokens.
- **Revocation:**
  - **Database table:** refresh_tokens { id, userId, tokenHash, expiresAt, createdAt, replacedBy, revokedAt, revokedReason, ip, userAgent }.
  - **Token rotation:** when client refreshes, mark old token revoked and store new token.
  - Optional access token blacklist (e.g. Redis) for immediate invalidation in exceptional cases.

## AUTHENTICATION WORKFLOW (END - TO - END)

```sql

Register/Login
   └─► Server verifies credentials
        ├─ issues Access Token (exp ~10m)
        ├─ issues Refresh Token (exp ~7–30d, has jti = unique id)
        ├─ stores a server-side session record for the RT (hashed)
        └─ sets RT in HttpOnly cookie; returns AT in response (or sets in cookie)

Protected API call
   └─► Client sends AT in Authorization: Bearer <token>
        └─► Server verifies signature + exp + claims
              └─► OK → handle request
              └─► 401 if invalid/expired

Access token expired
   └─► Client calls /auth/refresh with RT cookie
        └─► Server verifies RT signature + looks up RT session by jti
              ├─ if valid and not revoked:
              │     ├─ ROTATE: mint new AT + new RT (new jti)
              │     ├─ revoke/replace old RT session
              │     └─ set new RT cookie
              └─ if RT reuse detected or revoked → revoke entire family and force re-login

Logout
   └─► Server revokes current RT session (and optionally its descendants)

```

**Rotation means:** each time you refresh, you invalidate the previous refresh token and create a brand new one with a new jti. If an old RT shows up later → reuse attack → kill the chain.
