package com.example.coride.model;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity
public class User {
    @PrimaryKey(autoGenerate = true)
    public int id;
    
    public String name;
    public String admissionNo;
    public String branchCode;
    public String department;
    public String role;
    public boolean isVerified;

    public User() {}
}
