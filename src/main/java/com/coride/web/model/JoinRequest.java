package com.coride.web.model;

import jakarta.persistence.*;

@Entity
@Table(name = "join_requests")
public class JoinRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long rideId;
    private String passengerName;
    private String driverName;
    private String status; // PENDING, ACCEPTED, DECLINED

    public JoinRequest() {}

    public JoinRequest(Long rideId, String passengerName, String driverName) {
        this.rideId = rideId;
        this.passengerName = passengerName;
        this.driverName = driverName;
        this.status = "PENDING";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRideId() { return rideId; }
    public void setRideId(Long rideId) { this.rideId = rideId; }

    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
