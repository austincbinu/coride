package com.example.coride.database;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Update;

import com.example.coride.model.User;

import java.util.List;

@Dao
public interface UserDao {
    @Insert
    void insertUser(User user);

    @Query("SELECT * FROM User WHERE isVerified = 1")
    List<User> getAllVerifiedUsers();

    @Query("SELECT * FROM User LIMIT 1")
    User getCurrentUser();

    @Query("DELETE FROM User")
    void deleteAll();

    @Update
    void updateUser(User user);
}
