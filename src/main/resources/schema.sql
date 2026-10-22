-- =============================================================================
-- CoRide SQLite Database Schema
-- Compatible with SQLite 3.x and SQLite JDBC
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    admission_no TEXT UNIQUE,
    register_number TEXT,
    branch_code TEXT,
    department TEXT,
    role TEXT DEFAULT 'Student',
    is_verified INTEGER NOT NULL DEFAULT 0,
    verification_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_register_number ON users (register_number);

-- -----------------------------------------------------------------------------
-- Table: rides
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_name TEXT NOT NULL,
    creator_role TEXT DEFAULT 'Student',
    from_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    date_time TEXT NOT NULL,
    vehicle TEXT,
    seats INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE',
    passengers TEXT,
    contact_phone TEXT,
    fuel_cost NUMERIC NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_from_location ON rides (from_location);
CREATE INDEX IF NOT EXISTS idx_rides_destination ON rides (destination);

-- -----------------------------------------------------------------------------
-- Table: ride_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ride_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_name TEXT NOT NULL,
    requester_role TEXT DEFAULT 'Student',
    from_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    date_time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'OPEN',
    accepted_by TEXT,
    driver_contact TEXT,
    driver_vehicle TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests (status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_requester ON ride_requests (requester_name);

-- -----------------------------------------------------------------------------
-- Table: join_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS join_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_join_requests_ride_id ON join_requests (ride_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_passenger ON join_requests (passenger_name);
CREATE INDEX IF NOT EXISTS idx_join_requests_driver ON join_requests (driver_name);
