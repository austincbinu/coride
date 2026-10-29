package com.example.coride.database;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.Query;

import com.example.coride.model.RideRequest;

import java.util.List;

@Dao
public interface RideRequestDao {
    @Insert
    void insertRideRequest(RideRequest request);

    @Query("SELECT * FROM RideRequest ORDER BY id DESC")
    LiveData<List<RideRequest>> getAllRideRequests();

    @Query("SELECT * FROM RideRequest WHERE destination LIKE '%' || :search || '%' ORDER BY id DESC")
    LiveData<List<RideRequest>> searchByDestination(String search);

    @Delete
    void deleteRideRequest(RideRequest request);
}
