package com.example.coride.util;

import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AdmissionValidator {

    private static final Pattern ADMISSION_REGEX = Pattern.compile("^(\\d{2})/(\\d{3})/([A-Za-z]{2,3})$");

    private static final HashMap<String, String> BRANCH_ALIASES = new HashMap<>();
    static {
        BRANCH_ALIASES.put("CSE", "CS");
        BRANCH_ALIASES.put("ECE", "EC");
        BRANCH_ALIASES.put("EEE", "EE");
        BRANCH_ALIASES.put("ME", "ME");
        BRANCH_ALIASES.put("CE", "CE");
        BRANCH_ALIASES.put("ES", "ES");
        BRANCH_ALIASES.put("IT", "IT");
        // self mapping
        BRANCH_ALIASES.put("CS", "CS");
        BRANCH_ALIASES.put("EC", "EC");
        BRANCH_ALIASES.put("EE", "EE");
    }

    private static final HashMap<String, String> BRANCH_NAMES = new HashMap<>();
    static {
        BRANCH_NAMES.put("CS", "Computer Science & Engg (CSE)");
        BRANCH_NAMES.put("ME", "Mechanical Engg");
        BRANCH_NAMES.put("CE", "Civil Engg");
        BRANCH_NAMES.put("EC", "Electronics & Comm (ECE)");
        BRANCH_NAMES.put("EE", "Electrical & Electronics (EEE)");
        BRANCH_NAMES.put("ES", "Electronics & Systems");
        BRANCH_NAMES.put("IT", "Information Technology");
    }

    public static class ValidationResult {
        public boolean isValid;
        public String admissionNo;
        public String year;
        public String serialNo;
        public String branchCode;
        public String deptName;
    }

    public static ValidationResult validate(String raw) {
        ValidationResult result = new ValidationResult();
        if (raw == null) {
            result.isValid = false;
            return result;
        }

        String cleaned = raw.trim().toUpperCase();
        Matcher matcher = ADMISSION_REGEX.matcher(cleaned);
        
        if (matcher.matches()) {
            String year = matcher.group(1);
            String serial = matcher.group(2);
            String rawBranch = matcher.group(3);

            String normalizedBranch = BRANCH_ALIASES.get(rawBranch);

            if (normalizedBranch != null && BRANCH_NAMES.containsKey(normalizedBranch)) {
                result.isValid = true;
                result.year = year;
                result.serialNo = serial;
                result.branchCode = normalizedBranch;
                result.deptName = BRANCH_NAMES.get(normalizedBranch);
                result.admissionNo = year + "/" + serial + "/" + normalizedBranch;
                return result;
            }
        }
        
        result.isValid = false;
        return result;
    }
}
