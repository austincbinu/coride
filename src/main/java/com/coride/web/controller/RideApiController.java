package com.coride.web.controller;

import com.coride.web.model.Ride;
import com.coride.web.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rides")
@CrossOrigin(origins = "*")
public class RideApiController {

    @Autowired
    private RideRepository rideRepository;

    @GetMapping
    public ResponseEntity<List<Ride>> getAllRides(@RequestParam(required = false) String search) {
        List<Ride> rides;
        if (search != null && !search.trim().isEmpty()) {
            rides = rideRepository.findByDestinationContainingIgnoreCaseOrFromLocationContainingIgnoreCaseOrderByIdDesc(search.trim(), search.trim());
        } else {
            rides = rideRepository.findAllByOrderByIdDesc();
        }
        return ResponseEntity.ok(rides);
    }

    @PostMapping
    public ResponseEntity<?> createRide(@RequestBody Map<String, Object> body) {
        String creatorName = (String) body.getOrDefault("creatorName", "");
        String creatorRole = (String) body.getOrDefault("creatorRole", "Student");
        String fromLocation = (String) body.getOrDefault("fromLocation", "");
        String destination = (String) body.getOrDefault("destination", "");
        String dateTime = (String) body.getOrDefault("dateTime", "");
        String vehicle = (String) body.getOrDefault("vehicle", "");
        int seats = Integer.parseInt(body.getOrDefault("seats", "1").toString());
        String notes = (String) body.getOrDefault("notes", "");

        if (creatorName.isEmpty() || fromLocation.isEmpty() || destination.isEmpty() || dateTime.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing required fields."));
        }

        Ride ride = new Ride(creatorName, creatorRole, fromLocation, destination, dateTime, vehicle, seats, notes);
        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of("success", true, "ride", ride));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRide(@PathVariable Long id) {
        Optional<Ride> ride = rideRepository.findById(id);
        if (ride.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        rideRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
