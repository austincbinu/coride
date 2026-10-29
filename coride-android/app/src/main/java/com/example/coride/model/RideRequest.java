package com.example.coride.model;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity
public class RideRequest {
    @PrimaryKey(autoGenerate = true)
    public int id;
    
    public String requesterName;
    public String fromLocation;
    public String destination;
    public String dateTime;
    public String notes;

    public RideRequest() {}
}
