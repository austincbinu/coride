package com.example.coride.database;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.Query;

import com.example.coride.model.Ride;

import java.util.List;

@Dao
public interface RideDao {
    @Insert
    void insertRide(Ride ride);

    @Query("SELECT * FROM Ride ORDER BY id DESC")
    LiveData<List<Ride>> getAllRides();

    @Query("SELECT * FROM Ride WHERE destination LIKE '%' || :search || '%' ORDER BY id DESC")
    LiveData<List<Ride>> searchByDestination(String search);

    @Delete
    void deleteRide(Ride ride);
}
