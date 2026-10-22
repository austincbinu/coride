package com.coride.web.service;

import com.coride.web.config.DatabaseConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

/**
 * Service providing direct JDBC database health metrics and row counts
 * using PreparedStatement and try-with-resources.
 */
@Service
public class DatabaseHealthService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseHealthService.class);

    public Map<String, Object> checkHealth() {
        Map<String, Object> health = new HashMap<>();
        String countUsersSql = "SELECT COUNT(*) FROM users";
        String countRidesSql = "SELECT COUNT(*) FROM rides";
        String countRequestsSql = "SELECT COUNT(*) FROM ride_requests";
        String countJoinSql = "SELECT COUNT(*) FROM join_requests";

        try (Connection conn = DatabaseConfig.getConnection()) {
            String cat = conn.getCatalog();
            health.put("database", (cat != null && !cat.isEmpty()) ? cat : "coride.db");
            health.put("driver", conn.getMetaData().getDriverName());
            health.put("driverVersion", conn.getMetaData().getDriverVersion());
            health.put("databaseProduct", conn.getMetaData().getDatabaseProductName());
            health.put("databaseVersion", conn.getMetaData().getDatabaseProductVersion());

            try (PreparedStatement ps = conn.prepareStatement(countUsersSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) health.put("userCount", rs.getLong(1));
            }

            try (PreparedStatement ps = conn.prepareStatement(countRidesSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) health.put("rideCount", rs.getLong(1));
            }

            try (PreparedStatement ps = conn.prepareStatement(countRequestsSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) health.put("requestCount", rs.getLong(1));
            }

            try (PreparedStatement ps = conn.prepareStatement(countJoinSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) health.put("joinRequestCount", rs.getLong(1));
            }

            health.put("status", "UP");
        } catch (SQLException e) {
            log.error("Error executing JDBC health query: {}", e.getMessage(), e);
            health.put("status", "DOWN");
            health.put("error", e.getMessage());
        }

        return health;
    }
}
