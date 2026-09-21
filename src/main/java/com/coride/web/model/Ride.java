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
    private String status; // ACTIVE, FULL
    private String passengers; // Comma-separated confirmed passenger names
    private String contactPhone;
    private double fuelCost;

    public Ride() {}

    public Ride(String creatorName, String creatorRole, String fromLocation, String destination,
                String dateTime, String vehicle, int seats, String notes) {
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
    public void setCreatorName(String v) { this.creatorName = v; }

    public String getCreatorRole() { return creatorRole; }
    public void setCreatorRole(String v) { this.creatorRole = v; }

    public String getFromLocation() { return fromLocation; }
    public void setFromLocation(String v) { this.fromLocation = v; }

    public String getDestination() { return destination; }
    public void setDestination(String v) { this.destination = v; }

    public String getDateTime() { return dateTime; }
    public void setDateTime(String v) { this.dateTime = v; }

    public String getVehicle() { return vehicle; }
    public void setVehicle(String v) { this.vehicle = v; }

    public int getSeats() { return seats; }
    public void setSeats(int v) { this.seats = v; }

    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }

    public String getPassengers() { return passengers; }
    public void setPassengers(String v) { this.passengers = v; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String v) { this.contactPhone = v; }

    public double getFuelCost() { return fuelCost; }
    public void setFuelCost(double v) { this.fuelCost = v; }
}
