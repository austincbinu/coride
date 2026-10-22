package com.coride.web;

import com.coride.web.config.DatabaseConfig;
import com.coride.web.model.JoinRequest;
import com.coride.web.model.Ride;
import com.coride.web.model.RideRequest;
import com.coride.web.model.User;
import com.coride.web.repository.JoinRequestRepository;
import com.coride.web.repository.RideRepository;
import com.coride.web.repository.RideRequestRepository;
import com.coride.web.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class CoRideApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private JoinRequestRepository joinRequestRepository;

    @Test
    @DisplayName("Context loads and SQLite JDBC connection via PreparedStatement works")
    void testJdbcConnection() throws SQLException {
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT 1")) {
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "Query should return at least one row");
                assertEquals(1, rs.getInt(1), "SELECT 1 should return 1");
            }
        }
    }

    @Test
    @DisplayName("End-to-end flow: register user, offer ride, request ride, book ride and verify in MySQL via JDBC")
    void testEndToEndFlowWithJdbcVerification() throws SQLException {
        // 1. Register User
        String testAdmission = "25/999/CS";
        User user = new User("Test Student", testAdmission, "TLY25CS999", "CS", "Computer Science", "Student", true, "MANUAL");
        User savedUser = userRepository.save(user);
        assertNotNull(savedUser.getId());

        // Verify user via direct JDBC PreparedStatement
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT name, admission_no, role FROM users WHERE id = ?")) {
            ps.setLong(1, savedUser.getId());
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "User must exist in MySQL users table");
                assertEquals("Test Student", rs.getString("name"));
                assertEquals(testAdmission, rs.getString("admission_no"));
            }
        }

        // 2. Offer Ride
        Ride ride = new Ride("Test Driver", "Student", "Campus Gate", "Railway Station", "08:30", "Car (KL-13-1234)", 3, "Morning commute");
        ride.setFuelCost(50.00);
        Ride savedRide = rideRepository.save(ride);
        assertNotNull(savedRide.getId());

        // Verify ride via direct JDBC PreparedStatement
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT creator_name, seats, fuel_cost FROM rides WHERE id = ?")) {
            ps.setLong(1, savedRide.getId());
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "Ride must exist in MySQL rides table");
                assertEquals("Test Driver", rs.getString("creator_name"));
                assertEquals(3, rs.getInt("seats"));
                assertEquals(50.00, rs.getDouble("fuel_cost"), 0.001);
            }
        }

        // 3. Request Ride (Travel Need)
        RideRequest req = new RideRequest("Test Passenger", "Student", "Hostel", "City Center", "17:00", "Evening class");
        RideRequest savedReq = rideRequestRepository.save(req);
        assertNotNull(savedReq.getId());

        // Verify ride request via JDBC PreparedStatement
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT requester_name, status FROM ride_requests WHERE id = ?")) {
            ps.setLong(1, savedReq.getId());
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "RideRequest must exist in MySQL ride_requests table");
                assertEquals("Test Passenger", rs.getString("requester_name"));
                assertEquals("OPEN", rs.getString("status"));
            }
        }

        // 4. Request to Join Ride (Book Ride)
        JoinRequest joinReq = new JoinRequest(savedRide.getId(), "Test Passenger", "Test Driver");
        JoinRequest savedJoin = joinRequestRepository.save(joinReq);
        assertNotNull(savedJoin.getId());

        // Verify join request via JDBC PreparedStatement
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT passenger_name, driver_name, status FROM join_requests WHERE id = ?")) {
            ps.setLong(1, savedJoin.getId());
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "JoinRequest must exist in MySQL join_requests table");
                assertEquals("Test Passenger", rs.getString("passenger_name"));
                assertEquals("Test Driver", rs.getString("driver_name"));
                assertEquals("PENDING", rs.getString("status"));
            }
        }

        // Cleanup test entries
        joinRequestRepository.delete(savedJoin);
        rideRequestRepository.delete(savedReq);
        rideRepository.delete(savedRide);
        userRepository.delete(savedUser);
    }
}
