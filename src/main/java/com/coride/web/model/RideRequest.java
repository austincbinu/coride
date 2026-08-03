package com.coride.web.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ride_requests")
public class RideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String requesterName;
    private String requesterRole;
    private String fromLocation;
    private String destination;
    private String dateTime;
    private String notes;
    private String status;

    public RideRequest() {}

    public RideRequest(String requesterName, String requesterRole, String fromLocation, String destination, String dateTime, String notes) {
        this.requesterName = requesterName;
        this.requesterRole = requesterRole;
        this.fromLocation = fromLocation;
        this.destination = destination;
        this.dateTime = dateTime;
        this.notes = notes;
        this.status = "OPEN";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterRole() { return requesterRole; }
    public void setRequesterRole(String requesterRole) { this.requesterRole = requesterRole; }

    public String getFromLocation() { return fromLocation; }
    public void setFromLocation(String fromLocation) { this.fromLocation = fromLocation; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getDateTime() { return dateTime; }
    public void setDateTime(String dateTime) { this.dateTime = dateTime; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
