# CoRide - Campus Ride Sharing Web Application

CoRide is a modern, responsive college ride-sharing web application built with Spring Boot, Java, and SQLite. It provides students and faculty with verified carpooling, instant ride requests, automated admission number validation, and real-time status tracking.

---

## Database Architecture: SQLite with JDBC Connectivity

The project has been migrated from in-memory/file-based H2 to **SQLite** using **native JDBC connectivity**:
- **JDBC Driver**: `org.xerial:sqlite-jdbc` (v3.45.2.0)
- **Connection Pool**: `com.zaxxer:HikariCP` configured with single-connection serialization (`maximum-pool-size: 1`, `connection-timeout: 30000ms`) to provide reliable file-backed SQLite transactions without lock contention.
- **ORM / Dialect**: Hibernate Community Dialect `org.hibernate.community.dialect.SQLiteDialect` with DDL validation (`validate`).
- **Database File**: `coride.db` (file-backed, persisted locally and ignored by Git).
- **H2 Completely Removed**: Zero H2 drivers, dependencies, or console endpoints remain in the application.

---

## Prerequisites

- **Java Development Kit (JDK)**: JDK 17 or higher
- **Maven**: Bundled Maven wrapper (`./mvnw` or `.\mvnw.cmd`) included in the repository

---

## Configuration (`.env`)

CoRide uses a `.env` file at the root of the project to manage environment variables without committing sensitive credentials or environment-specific paths to source control.

Copy the provided example file:
```bash
cp .env.example .env
```

Default `.env` contents:
```env
# Application Server Port
PORT=8080

# SQLite Database Connection URL
DB_URL=jdbc:sqlite:coride.db
```

The application automatically loads `.env` key-value pairs into Spring Boot environment properties on startup.

---

## Database Schema & Initialization

A standard DDL file is provided at `src/main/resources/schema.sql` defining:
- `users`: ID, name, email, admission_number, role, branch_code, phone, created_at
- `rides`: ID, driver_id (FK -> users.id), origin, destination, departure_time, available_seats, total_seats, fuel_cost, notes, status, created_at
- `ride_requests`: ID, rider_id (FK -> users.id), origin, destination, preferred_time, notes, status, created_at
- `join_requests`: ID, ride_id (FK -> rides.id ON DELETE CASCADE), rider_id (FK -> users.id), status, message, created_at
- Optimized indexes on foreign keys and lookup columns (`idx_rides_driver`, `idx_rides_status`, `idx_join_ride`, etc.)

---

## Running the Application

### Option 1: Using the Maven Wrapper (Development)
On Windows:
```cmd
.\mvnw.cmd spring-boot:run
```
On Linux/macOS:
```bash
./mvnw spring-boot:run
```

### Option 2: Building and Running the Executable JAR
```bash
# Clean and package
./mvnw clean package

# Run the packaged JAR
java -jar target/coride-java-web-1.0.0.jar
```

Once started, access the application in your browser:
```
http://localhost:8080/
```

---

## Health & Database Verification API

A dedicated health controller is provided at `/api/health` to verify JDBC connectivity, database driver metadata, and table metrics:

```bash
curl http://localhost:8080/api/health
```

Example response:
```json
{
  "status": "UP",
  "database": "coride.db",
  "driver": "SQLite JDBC (3.45.2.0)",
  "sqliteVersion": "3.45.2",
  "tables": {
    "users": 0,
    "rides": 0,
    "join_requests": 0,
    "ride_requests": 0
  }
}
```

---

## Testing

Run the automated test suite verifying SQLite integration and repository operations:
```bash
./mvnw test
```
