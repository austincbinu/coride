package com.coride.web.controller;

import com.coride.web.model.User;
import com.coride.web.repository.UserRepository;
import com.coride.web.service.AdmissionValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthApiController {

    @Autowired
    private AdmissionValidationService validationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Existing verify endpoint (kept for compatibility)
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        String admissionInput = body.getOrDefault("admissionNo", "").trim();
        String role = body.getOrDefault("role", "Student").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Name is required."));
        }

        AdmissionValidationService.ValidationResult result = validationService.validate(admissionInput);
        if (!result.isValid()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", result.getError()));
        }

        User user = userRepository.findByAdmissionNo(result.getAdmissionNo()).orElse(new User());
        user.setName(name);
        user.setAdmissionNo(result.getAdmissionNo());
        user.setRegisterNumber(result.getRegisterNumber());
        user.setBranchCode(result.getBranchCode());
        user.setDepartment(result.getDeptName());
        user.setRole(role);
        user.setVerified(true);
        user.setVerificationMethod("MANUAL");
        // Keep existing password if any
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "admissionNo", result.getAdmissionNo(),
                "registerNumber", result.getRegisterNumber(),
                "branchCode", result.getBranchCode(),
                "department", result.getDeptName(),
                "year", result.getYear(),
                "serialNo", result.getSerialNo(),
                "role", role,
                "isVerified", true
        ));
        return ResponseEntity.ok(response);
    }

    // New registration endpoint
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        String admissionNo = body.getOrDefault("admissionNo", "").trim();
        String rawPassword = body.getOrDefault("password", "").trim();
        String role = body.getOrDefault("role", "Student").trim();

        if (name.isEmpty() || admissionNo.isEmpty() || rawPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Name, admissionNo and password are required."));
        }

        // Validate admission number same as verify step
        AdmissionValidationService.ValidationResult result = validationService.validate(admissionNo);
        if (!result.isValid()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", result.getError()));
        }

        if (userRepository.findByAdmissionNo(admissionNo).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "User already exists."));
        }

        String hashed = passwordEncoder.encode(rawPassword);
        User user = new User();
        user.setName(name);
        user.setAdmissionNo(result.getAdmissionNo());
        user.setRegisterNumber(result.getRegisterNumber());
        user.setBranchCode(result.getBranchCode());
        user.setDepartment(result.getDeptName());
        user.setRole(role);
        user.setVerified(false);
        user.setVerificationMethod("REGISTER");
        user.setPassword(hashed);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "User registered. Please verify your account."));
    }

    // New login endpoint
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String admissionNo = body.getOrDefault("admissionNo", "").trim();
        String rawPassword = body.getOrDefault("password", "").trim();

        if (admissionNo.isEmpty() || rawPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "AdmissionNo and password are required."));
        }

        return userRepository.findByAdmissionNo(admissionNo)
                .map(user -> {
                    if (!user.isVerified()) {
                        return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Account not verified."));
                    }
                    if (passwordEncoder.matches(rawPassword, user.getPassword())) {
                        Map<String, Object> resp = new HashMap<>();
                        resp.put("success", true);
                        resp.put("user", Map.of(
                                "id", user.getId(),
                                "name", user.getName(),
                                "admissionNo", user.getAdmissionNo(),
                                "role", user.getRole()
                        ));
                        return ResponseEntity.ok(resp);
                    } else {
                        return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid credentials."));
                    }
                })
                .orElseGet(() -> ResponseEntity.badRequest().body(Map.of("success", false, "error", "User not found.")));
    }

    @PostMapping("/validate-admission")
    public ResponseEntity<?> validateAdmission(@RequestBody Map<String, String> body) {
        String input = body.getOrDefault("input", "").trim();
        AdmissionValidationService.ValidationResult result = validationService.validate(input);
        if (!result.isValid()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", result.getError()));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "admissionNo", result.getAdmissionNo(),
                "registerNumber", result.getRegisterNumber(),
                "year", result.getYear(),
                "serialNo", result.getSerialNo(),
                "branchCode", result.getBranchCode(),
                "department", result.getDeptName()
        ));
    }
}
