package com.coride.web.controller;

import com.coride.web.model.RideRequest;
import com.coride.web.repository.RideRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/requests")
@CrossOrigin(origins = "*")
public class RequestApiController {

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @GetMapping
    public ResponseEntity<List<RideRequest>> getAllRequests() {
        return ResponseEntity.ok(rideRequestRepository.findAllByOrderByIdDesc());
    }

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody Map<String, Object> body) {
        String requesterName = (String) body.getOrDefault("requesterName", "");
        String requesterRole = (String) body.getOrDefault("requesterRole", "Student");
        String fromLocation  = (String) body.getOrDefault("fromLocation", "");
        String destination   = (String) body.getOrDefault("destination", "");
        String dateTime      = (String) body.getOrDefault("dateTime", "");
        String notes         = (String) body.getOrDefault("notes", "");

        if (requesterName.isEmpty() || fromLocation.isEmpty() || destination.isEmpty() || dateTime.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing required fields."));
        }

        RideRequest req = new RideRequest(requesterName, requesterRole, fromLocation, destination, dateTime, notes);
        rideRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("success", true, "request", req));
    }

    /** Driver accepts a ride request */
    @PostMapping("/{id}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<RideRequest> opt = rideRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request not found."));
        }
        RideRequest req = opt.get();
        if (!"OPEN".equals(req.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "This request has already been " + req.getStatus().toLowerCase() + "."));
        }

        String driverName    = body.getOrDefault("driverName", "").trim();
        String driverContact = body.getOrDefault("driverContact", "").trim();
        String driverVehicle = body.getOrDefault("driverVehicle", "").trim();

        if (driverName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Driver name is required."));
        }

        req.setStatus("ACCEPTED");
        req.setAcceptedBy(driverName);
        req.setDriverContact(driverContact);
        req.setDriverVehicle(driverVehicle);
        rideRequestRepository.save(req);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "You have accepted " + req.getRequesterName() + "'s ride request!",
            "request", req
        ));
    }

    /** Driver declines / revokes acceptance of a ride request */
    @PostMapping("/{id}/decline")
    public ResponseEntity<?> declineRequest(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<RideRequest> opt = rideRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Request not found."));
        }
        RideRequest req = opt.get();
        String callerName = body.getOrDefault("driverName", "").trim();

        // Only the driver who accepted (or anyone if still OPEN) can decline
        if ("ACCEPTED".equals(req.getStatus()) && !req.getAcceptedBy().equalsIgnoreCase(callerName)) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Only the driver who accepted can revoke this."));
        }

        req.setStatus("OPEN");
        req.setAcceptedBy(null);
        req.setDriverContact(null);
        req.setDriverVehicle(null);
        rideRequestRepository.save(req);

        return ResponseEntity.ok(Map.of("success", true, "message", "Request is now open again.", "request", req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRequest(@PathVariable Long id) {
        if (!rideRequestRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        rideRequestRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
