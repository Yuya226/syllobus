CREATE TABLE rate_limits (
 bucket TEXT PRIMARY KEY,
 count INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX rate_limit_expiry ON rate_limits(expires_at);
