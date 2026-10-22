package com.coride.web.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Central DataSource and JDBC configuration for SQLite with HikariCP.
 * Reads database location / credentials from environment variables / .env.
 */
@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);
    private static volatile HikariDataSource globalDataSource;

    @Value("${spring.datasource.url:jdbc:sqlite:coride.db}")
    private String dbUrl;

    @Value("${spring.datasource.driver-class-name:org.sqlite.JDBC}")
    private String driverClassName;

    @Value("${spring.datasource.hikari.maximum-pool-size:1}")
    private int maxPoolSize;

    @Value("${spring.datasource.hikari.minimum-idle:1}")
    private int minIdle;

    @Value("${spring.datasource.hikari.idle-timeout:300000}")
    private long idleTimeout;

    @Value("${spring.datasource.hikari.connection-timeout:30000}")
    private long connectionTimeout;

    @Value("${spring.datasource.hikari.max-lifetime:1200000}")
    private long maxLifetime;

    @Value("${spring.datasource.hikari.pool-name:CoRideSQLitePool}")
    private String poolName;

    @Bean
    @Primary
    public DataSource dataSource() {
        log.info("Initializing central HikariCP DataSource for SQLite at URL: {}", dbUrl);
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(dbUrl);
        config.setDriverClassName(driverClassName);
        config.setMaximumPoolSize(maxPoolSize);
        config.setMinimumIdle(minIdle);
        config.setIdleTimeout(idleTimeout);
        config.setConnectionTimeout(connectionTimeout);
        config.setMaxLifetime(maxLifetime);
        config.setPoolName(poolName);

        HikariDataSource ds = new HikariDataSource(config);
        globalDataSource = ds;
        log.info("HikariCP pool '{}' successfully initialized for SQLite.", poolName);

        // Verify JDBC connection with a PreparedStatement using try-with-resources
        verifyJdbcConnection(ds);

        return ds;
    }

    /**
     * Static access to obtain a JDBC Connection directly from the central connection pool.
     * Always use with try-with-resources.
     *
     * @return active java.sql.Connection from pool
     * @throws SQLException if a database access error occurs
     */
    public static Connection getConnection() throws SQLException {
        if (globalDataSource == null) {
            throw new SQLException("Database connection pool is not yet initialized.");
        }
        return globalDataSource.getConnection();
    }

    /**
     * Verifies JDBC connectivity using PreparedStatement with try-with-resources.
     */
    private void verifyJdbcConnection(DataSource ds) {
        String testSql = "SELECT 1";
        try (Connection conn = ds.getConnection();
             PreparedStatement ps = conn.prepareStatement(testSql);
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                log.info("SQLite JDBC connectivity verified successfully via PreparedStatement: SELECT 1 returned {}", rs.getInt(1));
            }
        } catch (SQLException e) {
            log.error("Failed to verify SQLite JDBC connection via PreparedStatement: {}", e.getMessage(), e);
            throw new IllegalStateException("Could not establish connection to SQLite database: " + e.getMessage(), e);
        }
    }
}
