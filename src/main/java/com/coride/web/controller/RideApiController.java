package com.coride.web.controller;

import com.coride.web.model.Ride;
import com.coride.web.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
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

    /**
     * Passenger requests to join a ride.
     * Puts the passenger into pendingRequests awaiting driver acceptance.
     */
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

        // Check if already accepted or pending
        List<String> accepted = getList(ride.getPassengers());
        if (accepted.contains(passengerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "You are already confirmed on this ride."));
        }

        List<String> pending = getList(ride.getPendingRequests());
        if (pending.contains(passengerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "You have already requested to join this ride. Please wait for the driver to accept."));
        }

        pending.add(passengerName);
        ride.setPendingRequests(String.join(",", pending));
        rideRepository.save(ride);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Join request sent to " + ride.getCreatorName() + "! Awaiting driver confirmation.",
            "ride", ride
        ));
    }

    /**
     * Driver accepts a pending passenger join request.
     */
    @PostMapping("/{id}/accept-passenger")
    public ResponseEntity<?> acceptPassenger(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String passengerName = body.getOrDefault("passengerName", "").trim();
        Optional<Ride> optionalRide = rideRepository.findById(id);
        if (optionalRide.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));
        }
        Ride ride = optionalRide.get();

        if (ride.getSeats() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No seats left to accept passenger."));
        }

        List<String> pending = getList(ride.getPendingRequests());
        if (!pending.contains(passengerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Passenger request not found in pending list."));
        }

        // Remove from pending
        pending.removeIf(p -> p.equalsIgnoreCase(passengerName));
        ride.setPendingRequests(pending.isEmpty() ? null : String.join(",", pending));

        // Add to accepted passengers
        List<String> accepted = getList(ride.getPassengers());
        accepted.add(passengerName);
        ride.setPassengers(String.join(",", accepted));

        // Decrement seats
        ride.setSeats(ride.getSeats() - 1);
        if (ride.getSeats() <= 0) {
            ride.setStatus("FULL");
        }

        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Accepted " + passengerName + " for your ride!",
            "ride", ride
        ));
    }

    /**
     * Driver declines/rejects a pending passenger join request.
     */
    @PostMapping("/{id}/decline-passenger")
    public ResponseEntity<?> declinePassenger(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String passengerName = body.getOrDefault("passengerName", "").trim();
        Optional<Ride> optionalRide = rideRepository.findById(id);
        if (optionalRide.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));
        }
        Ride ride = optionalRide.get();

        List<String> pending = getList(ride.getPendingRequests());
        if (!pending.contains(passengerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Passenger request not found in pending list."));
        }

        pending.removeIf(p -> p.equalsIgnoreCase(passengerName));
        ride.setPendingRequests(pending.isEmpty() ? null : String.join(",", pending));

        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Declined request from " + passengerName + ".",
            "ride", ride
        ));
    }

    /**
     * Passenger cancels their seat (if confirmed) OR cancels their pending request.
     * OR Driver removes a confirmed passenger.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRide(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String passengerName = body.getOrDefault("passengerName", "").trim();
        Optional<Ride> optionalRide = rideRepository.findById(id);
        if (optionalRide.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));
        }
        Ride ride = optionalRide.get();

        List<String> pending = getList(ride.getPendingRequests());
        List<String> accepted = getList(ride.getPassengers());

        boolean wasPending = pending.removeIf(p -> p.equalsIgnoreCase(passengerName));
        boolean wasAccepted = accepted.removeIf(p -> p.equalsIgnoreCase(passengerName));

        if (!wasPending && !wasAccepted) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "You are not listed on this ride."));
        }

        if (wasPending) {
            ride.setPendingRequests(pending.isEmpty() ? null : String.join(",", pending));
        }

        if (wasAccepted) {
            ride.setPassengers(accepted.isEmpty() ? null : String.join(",", accepted));
            ride.setSeats(ride.getSeats() + 1);
            if ("FULL".equals(ride.getStatus())) {
                ride.setStatus("ACTIVE");
            }
        }

        rideRepository.save(ride);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", wasPending ? "Join request cancelled." : "Seat cancelled successfully.",
            "ride", ride
        ));
    }

    private List<String> getList(String commaSeparated) {
        if (commaSeparated == null || commaSeparated.trim().isEmpty()) {
            return new ArrayList<>();
        }
        List<String> list = new ArrayList<>();
        for (String item : commaSeparated.split(",")) {
            String trimmed = item.trim();
            if (!trimmed.isEmpty()) {
                list.add(trimmed);
            }
        }
        return list;
    }
}
