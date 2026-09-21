package com.coride.web.repository;

import com.coride.web.model.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {
    List<JoinRequest> findByRideId(Long rideId);
    List<JoinRequest> findByDriverName(String driverName);
    List<JoinRequest> findByPassengerName(String passengerName);
    Optional<JoinRequest> findByRideIdAndPassengerName(Long rideId, String passengerName);
    List<JoinRequest> findByRideIdAndStatus(Long rideId, String status);
    List<JoinRequest> findByDriverNameAndStatus(String driverName, String status);
}
