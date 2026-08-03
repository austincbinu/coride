package com.coride.web.model;

import jakarta.persistence.*;

@Entity
@Table(name = "rides")
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String creatorName;
    private String creatorRole;
    private String fromLocation;
    private String destination;
    private String dateTime;
    private String vehicle;
    private int seats;
    private String notes;
    private String status; // ACTIVE, COMPLETED, CANCELLED

    public Ride() {}

    public Ride(String creatorName, String creatorRole, String fromLocation, String destination, String dateTime, String vehicle, int seats, String notes) {
        this.creatorName = creatorName;
        this.creatorRole = creatorRole;
        this.fromLocation = fromLocation;
        this.destination = destination;
        this.dateTime = dateTime;
        this.vehicle = vehicle;
        this.seats = seats;
        this.notes = notes;
        this.status = "ACTIVE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCreatorName() { return creatorName; }
    public void setCreatorName(String creatorName) { this.creatorName = creatorName; }

    public String getCreatorRole() { return creatorRole; }
    public void setCreatorRole(String creatorRole) { this.creatorRole = creatorRole; }

    public String getFromLocation() { return fromLocation; }
    public void setFromLocation(String fromLocation) { this.fromLocation = fromLocation; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getDateTime() { return dateTime; }
    public void setDateTime(String dateTime) { this.dateTime = dateTime; }

    public String getVehicle() { return vehicle; }
    public void setVehicle(String vehicle) { this.vehicle = vehicle; }

    public int getSeats() { return seats; }
    public void setSeats(int seats) { this.seats = seats; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
