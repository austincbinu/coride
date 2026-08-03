package com.coride.web.controller;

import com.coride.web.model.RideRequest;
import com.coride.web.repository.RideRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
        String fromLocation = (String) body.getOrDefault("fromLocation", "");
        String destination = (String) body.getOrDefault("destination", "");
        String dateTime = (String) body.getOrDefault("dateTime", "");
        String notes = (String) body.getOrDefault("notes", "");

        if (requesterName.isEmpty() || fromLocation.isEmpty() || destination.isEmpty() || dateTime.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing required fields."));
        }

        RideRequest req = new RideRequest(requesterName, requesterRole, fromLocation, destination, dateTime, notes);
        rideRequestRepository.save(req);
        return ResponseEntity.ok(Map.of("success", true, "request", req));
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
