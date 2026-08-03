package com.coride.web.controller;

import com.coride.web.model.User;
import com.coride.web.repository.UserRepository;
import com.coride.web.service.AdmissionValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

        // Save/Update user in DB
        User user = userRepository.findByAdmissionNo(result.getAdmissionNo())
                .orElse(new User());
        user.setName(name);
        user.setAdmissionNo(result.getAdmissionNo());
        user.setRegisterNumber(result.getRegisterNumber());
        user.setBranchCode(result.getBranchCode());
        user.setDepartment(result.getDeptName());
        user.setRole(role);
        user.setVerified(true);
        user.setVerificationMethod("MANUAL");
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

    @PostMapping("/verify-barcode")
    public ResponseEntity<?> verifyBarcode(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "").trim();
        String barcodeData = body.getOrDefault("barcodeData", "").trim();
        String role = body.getOrDefault("role", "Student").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Name is required."));
        }

        AdmissionValidationService.ValidationResult result = validationService.validate(barcodeData);

        if (!result.isValid()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", result.getError()));
        }

        User user = userRepository.findByAdmissionNo(result.getAdmissionNo())
                .orElse(new User());
        user.setName(name);
        user.setAdmissionNo(result.getAdmissionNo());
        user.setRegisterNumber(result.getRegisterNumber());
        user.setBranchCode(result.getBranchCode());
        user.setDepartment(result.getDeptName());
        user.setRole(role);
        user.setVerified(true);
        user.setVerificationMethod("BARCODE");
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
