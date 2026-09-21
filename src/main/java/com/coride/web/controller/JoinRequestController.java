package com.coride.web.controller;

import com.coride.web.model.JoinRequest;
import com.coride.web.model.Ride;
import com.coride.web.repository.JoinRequestRepository;
import com.coride.web.repository.RideRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Handles passenger join-requests for rides.
 * Separate table – no more comma-string hacks.
 *
 * Endpoints:
 *   GET    /api/join-requests/ride/{rideId}          – all requests for a ride (driver use)
 *   GET    /api/join-requests/my-requests            – requests made BY current passenger
 *   POST   /api/join-requests                        – passenger sends a join request
 *   POST   /api/join-requests/{id}/accept            – driver accepts
 *   POST   /api/join-requests/{id}/decline           – driver declines
 *   DELETE /api/join-requests/{id}                   – passenger cancels their own request
 */
@RestController
@RequestMapping("/api/join-requests")
@CrossOrigin(origins = "*")
public class JoinRequestController {

    @Autowired
    private JoinRequestRepository joinRequestRepository;

    @Autowired
    private RideRepository rideRepository;

    // ── GET requests for a specific ride (driver sees who wants to join) ─────
    @GetMapping("/ride/{rideId}")
    public ResponseEntity<List<JoinRequest>> getRequestsForRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(joinRequestRepository.findByRideId(rideId));
    }

    // ── GET all pending requests for a specific driver ────────────────────────
    @GetMapping("/driver/{driverName}")
    public ResponseEntity<List<JoinRequest>> getPendingForDriver(@PathVariable String driverName) {
        return ResponseEntity.ok(joinRequestRepository.findByDriverNameAndStatus(driverName, "PENDING"));
    }

    // ── GET requests made by a specific passenger ─────────────────────────────
    @GetMapping("/passenger/{passengerName}")
    public ResponseEntity<List<JoinRequest>> getByPassenger(@PathVariable String passengerName) {
        return ResponseEntity.ok(joinRequestRepository.findByPassengerName(passengerName));
    }

    // ── POST: passenger sends a join request ──────────────────────────────────
    @PostMapping
    public ResponseEntity<?> sendJoinRequest(@RequestBody Map<String, Object> body) {
        Long rideId = Long.parseLong(body.getOrDefault("rideId", "0").toString());
        String passengerName = body.getOrDefault("passengerName", "").toString().trim();

        if (rideId == 0 || passengerName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing rideId or passengerName."));
        }

        Optional<Ride> rideOpt = rideRepository.findById(rideId);
        if (rideOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));
        }

        Ride ride = rideOpt.get();

        // Check if already requested
        Optional<JoinRequest> existing = joinRequestRepository.findByRideIdAndPassengerName(rideId, passengerName);
        if (existing.isPresent()) {
            String existingStatus = existing.get().getStatus();
            if ("PENDING".equals(existingStatus)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "You have already sent a join request. Please wait for the driver to respond."));
            }
            if ("ACCEPTED".equals(existingStatus)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Your request was already accepted! You are confirmed on this ride."));
            }
            // If DECLINED, allow re-requesting by updating
            existing.get().setStatus("PENDING");
            joinRequestRepository.save(existing.get());
            return ResponseEntity.ok(Map.of("success", true, "message", "Re-sent join request to " + ride.getCreatorName() + "!", "request", existing.get()));
        }

        if (ride.getSeats() <= 0 || "FULL".equals(ride.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No seats available on this ride."));
        }

        JoinRequest jr = new JoinRequest(rideId, passengerName, ride.getCreatorName());
        joinRequestRepository.save(jr);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Join request sent to " + ride.getCreatorName() + "! Waiting for driver confirmation.",
            "request", jr
        ));
    }

    // ── POST: driver accepts a join request ───────────────────────────────────
    @PostMapping("/{id}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long id) {
        Optional<JoinRequest> opt = joinRequestRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request not found."));

        JoinRequest jr = opt.get();
        if (!"PENDING".equals(jr.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request is no longer pending."));
        }

        Optional<Ride> rideOpt = rideRepository.findById(jr.getRideId());
        if (rideOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Ride not found."));

        Ride ride = rideOpt.get();
        if (ride.getSeats() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No seats left to accept passenger."));
        }

        // Accept: update join request status
        jr.setStatus("ACCEPTED");
        joinRequestRepository.save(jr);

        // Add to ride's confirmed passengers & decrement seat count
        String current = ride.getPassengers() != null ? ride.getPassengers().trim() : "";
        ride.setPassengers(current.isEmpty() ? jr.getPassengerName() : current + "," + jr.getPassengerName());
        ride.setSeats(ride.getSeats() - 1);
        if (ride.getSeats() <= 0) ride.setStatus("FULL");
        rideRepository.save(ride);

        return ResponseEntity.ok(Map.of("success", true, "message", "Accepted " + jr.getPassengerName() + " for your ride!", "request", jr));
    }

    // ── POST: driver declines a join request ──────────────────────────────────
    @PostMapping("/{id}/decline")
    public ResponseEntity<?> declineRequest(@PathVariable Long id) {
        Optional<JoinRequest> opt = joinRequestRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request not found."));

        JoinRequest jr = opt.get();
        jr.setStatus("DECLINED");
        joinRequestRepository.save(jr);

        return ResponseEntity.ok(Map.of("success", true, "message", "Declined request from " + jr.getPassengerName() + ".", "request", jr));
    }

    // ── DELETE: passenger cancels their own request ───────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id) {
        Optional<JoinRequest> opt = joinRequestRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        JoinRequest jr = opt.get();

        // If it was accepted, restore seat in ride
        if ("ACCEPTED".equals(jr.getStatus())) {
            Optional<Ride> rideOpt = rideRepository.findById(jr.getRideId());
            rideOpt.ifPresent(ride -> {
                String passengers = ride.getPassengers();
                if (passengers != null) {
                    List<String> list = new java.util.ArrayList<>(java.util.Arrays.asList(passengers.split(",")));
                    list.removeIf(p -> p.trim().equalsIgnoreCase(jr.getPassengerName()));
                    ride.setPassengers(list.isEmpty() ? null : String.join(",", list));
                }
                ride.setSeats(ride.getSeats() + 1);
                if ("FULL".equals(ride.getStatus())) ride.setStatus("ACTIVE");
                rideRepository.save(ride);
            });
        }

        joinRequestRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Join request cancelled."));
    }
}
