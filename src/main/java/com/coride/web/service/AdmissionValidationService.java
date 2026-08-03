package com.coride.web.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AdmissionValidationService {

    // Admission Barcode Pattern: YY/NNN/BRANCH (2-digit year only, 3-digit serial no, 2-3 letter branch)
    private static final Pattern ADMISSION_NO_REGEX = Pattern.compile("^(\\d{2})/(\\d{3})/([A-Za-z]{2,3})$");

    // Register Number Pattern: TLY + 2-digit Year + 2-letter Branch + 3-digit Serial No
    private static final Pattern REGISTER_NO_REGEX = Pattern.compile("^TLY\\d{2}[A-Za-z]{2}\\d{3}$", Pattern.CASE_INSENSITIVE);

    // Branch aliases mapping
    private static final Map<String, String> BRANCH_ALIASES = new HashMap<>();
    static {
        BRANCH_ALIASES.put("CSE", "CS"); BRANCH_ALIASES.put("CS", "CS");
        BRANCH_ALIASES.put("ECE", "EC"); BRANCH_ALIASES.put("EC", "EC");
        BRANCH_ALIASES.put("EEE", "EE"); BRANCH_ALIASES.put("EE", "EE");
        BRANCH_ALIASES.put("ME",  "ME");
        BRANCH_ALIASES.put("CE",  "CE");
        BRANCH_ALIASES.put("ES",  "ES");
        BRANCH_ALIASES.put("IT",  "IT");
    }

    // Allowed canonical branches for this college ONLY
    private static final List<String> ALLOWED_BRANCHES = Arrays.asList("CS", "ME", "CE", "EC", "EE", "ES", "IT");

    // Department Names
    private static final Map<String, String> BRANCH_MAP = new HashMap<>();
    static {
        BRANCH_MAP.put("CS", "Computer Science & Engg (CSE)");
        BRANCH_MAP.put("ME", "Mechanical Engineering (ME)");
        BRANCH_MAP.put("CE", "Civil Engineering (CE)");
        BRANCH_MAP.put("EC", "Electronics & Communication Engg (ECE)");
        BRANCH_MAP.put("EE", "Electrical & Electronics Engg (EEE)");
        BRANCH_MAP.put("ES", "Electronic & Computer Science (ES)");
        BRANCH_MAP.put("IT", "Information Technology (IT)");
    }

    public static class ValidationResult {
        private boolean valid;
        private String error;
        private String admissionNo;
        private String registerNumber;
        private String year;
        private String serialNo;
        private String branchCode;
        private String deptName;

        public ValidationResult(boolean valid, String error) {
            this.valid = valid;
            this.error = error;
        }

        public ValidationResult(boolean valid, String admissionNo, String registerNumber, String year, String serialNo, String branchCode, String deptName) {
            this.valid = valid;
            this.admissionNo = admissionNo;
            this.registerNumber = registerNumber;
            this.year = year;
            this.serialNo = serialNo;
            this.branchCode = branchCode;
            this.deptName = deptName;
        }

        public boolean isValid() { return valid; }
        public String getError() { return error; }
        public String getAdmissionNo() { return admissionNo; }
        public String getRegisterNumber() { return registerNumber; }
        public String getYear() { return year; }
        public String getSerialNo() { return serialNo; }
        public String getBranchCode() { return branchCode; }
        public String getDeptName() { return deptName; }
    }

    public ValidationResult validate(String input) {
        if (input == null || input.trim().isEmpty()) {
            return new ValidationResult(false, "Admission Number / Register Number cannot be empty.");
        }

        String trimmed = input.trim().toUpperCase();

        // 1. Try admission number barcode format: YY/NNN/BRANCH
        Matcher admMatcher = ADMISSION_NO_REGEX.matcher(trimmed);
        if (admMatcher.matches()) {
            String year2d = admMatcher.group(1);
            String serialNo = admMatcher.group(2);
            String branchRaw = admMatcher.group(3);

            String canonicalBranch = BRANCH_ALIASES.get(branchRaw);
            if (canonicalBranch == null || !ALLOWED_BRANCHES.contains(canonicalBranch)) {
                return new ValidationResult(false, "Branch \"" + branchRaw + "\" is not valid at this college. Allowed branches: CSE, ECE, EEE, ME, CE, ES, IT.");
            }

            String deptName = BRANCH_MAP.get(canonicalBranch);
            String derivedRegNo = "TLY" + year2d + canonicalBranch + serialNo;

            return new ValidationResult(true, trimmed, derivedRegNo, "20" + year2d, serialNo, canonicalBranch, deptName);
        }

        // 2. Try register number format: TLY25CS033
        Matcher regMatcher = REGISTER_NO_REGEX.matcher(trimmed);
        if (regMatcher.matches()) {
            String year2d = trimmed.substring(3, 5);
            String branchCode = trimmed.substring(5, 7);
            String serialNo = trimmed.substring(7, 10);

            if (!ALLOWED_BRANCHES.contains(branchCode)) {
                return new ValidationResult(false, "Branch \"" + branchCode + "\" is not valid at this college. Allowed branches: CS, ME, CE, EC, EE, ES, IT.");
            }

            String deptName = BRANCH_MAP.get(branchCode);
            return new ValidationResult(true, trimmed, trimmed, "20" + year2d, serialNo, branchCode, deptName);
        }

        return new ValidationResult(false, "Invalid format. Expected: YY/NNN/BRANCH (e.g. 25/033/CS or 25/033/CSE) or TLY25CS033.");
    }
}
