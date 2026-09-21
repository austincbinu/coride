package com.coride.web.repository;

import com.coride.web.model.JoinRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoinRequestRepository extends JpaRepository<JoinRequest, Long> {
    List<JoinRequest> findByRideId(Long rideId);
    List<JoinRequest> findByDriverNameIgnoreCase(String driverName);
    List<JoinRequest> findByPassengerNameIgnoreCase(String passengerName);
    Optional<JoinRequest> findByRideIdAndPassengerNameIgnoreCase(Long rideId, String passengerName);
    List<JoinRequest> findByRideIdAndStatusIgnoreCase(Long rideId, String status);
    List<JoinRequest> findByDriverNameIgnoreCaseAndStatusIgnoreCase(String driverName, String status);
}
