package com.coride.web.repository;

import com.coride.web.model.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findByDestinationContainingIgnoreCaseOrFromLocationContainingIgnoreCaseOrderByIdDesc(String dest, String from);
    List<Ride> findAllByOrderByIdDesc();
}
