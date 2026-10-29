package com.example.coride.model;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity
public class Ride {
    @PrimaryKey(autoGenerate = true)
    public int id;
    
    public String creatorName;
    public String fromLocation;
    public String destination;
    public String dateTime;
    public String vehicle;
    public int seats;
    public String notes;

    public Ride() {}
}
