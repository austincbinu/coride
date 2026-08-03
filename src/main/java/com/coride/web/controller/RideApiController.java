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
        String contactPhone = (String) body.getOrDefault("contactPhone", "");
        double fuelCost = Double.parseDouble(body.getOrDefault("fuelCost", "0").toString());

        if (creatorName.isEmpty() || fromLocation.isEmpty() || destination.isEmpty() || dateTime.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing required fields."));
        }

        Ride ride = new Ride(creatorName, creatorRole, fromLocation, destination, dateTime, vehicle, seats, notes);
        if (!contactPhone.isEmpty()) {
            ride.setContactPhone(contactPhone);
        }
        ride.setFuelCost(fuelCost);
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

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinRide(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String passengerName = body.getOrDefault("passengerName", "Student Passenger").trim();
        Optional<Ride> optionalRide = rideRepository.findById(id);
        if (optionalRide.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride offer not found."));
        }
        Ride ride = optionalRide.get();
        if (ride.getSeats() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Sorry, no seats available on this ride."));
        }

        // Decrement seats
        ride.setSeats(ride.getSeats() - 1);
        if (ride.getSeats() == 0) {
            ride.setStatus("FULL");
        }

        // Record passenger
        String currentPassengers = ride.getPassengers() != null ? ride.getPassengers() : "";
        if (!currentPassengers.isEmpty()) currentPassengers += ", ";
        currentPassengers += passengerName;
        ride.setPassengers(currentPassengers);

        rideRepository.save(ride);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Seat confirmed! You have joined " + ride.getCreatorName() + "'s ride.",
            "ride", ride
        ));
    }
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRide(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String passengerName = body.getOrDefault("passengerName", "").trim();
        Optional<Ride> optionalRide = rideRepository.findById(id);
        if (optionalRide.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));
        }
        Ride ride = optionalRide.get();
        String passengers = ride.getPassengers();
        if (passengers == null || !passengers.contains(passengerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "You have not joined this ride."));
        }
        // Remove passenger from list
        java.util.List<String> list = new java.util.ArrayList<>(java.util.Arrays.asList(passengers.split(",")));
        list.removeIf(p -> p.trim().equalsIgnoreCase(passengerName));
        String updated = String.join(",", list).trim();
        ride.setPassengers(updated.isEmpty() ? null : updated);
        // Increment seats
        ride.setSeats(ride.getSeats() + 1);
        // Update status if was FULL
        if ("FULL".equals(ride.getStatus())) {
            ride.setStatus("ACTIVE");
        }
        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of("success", true, "message", "Ride cancelled successfully.", "ride", ride));
    }
}
