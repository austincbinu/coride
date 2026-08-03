package com.coride.web.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String admissionNo;
    private String registerNumber;
    private String branchCode;
    private String department;
    private String role;
    private boolean isVerified;
    private String verificationMethod;

    public User() {}

    public User(String name, String admissionNo, String registerNumber, String branchCode, String department, String role, boolean isVerified, String verificationMethod) {
        this.name = name;
        this.admissionNo = admissionNo;
        this.registerNumber = registerNumber;
        this.branchCode = branchCode;
        this.department = department;
        this.role = role;
        this.isVerified = isVerified;
        this.verificationMethod = verificationMethod;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAdmissionNo() { return admissionNo; }
    public void setAdmissionNo(String admissionNo) { this.admissionNo = admissionNo; }

    public String getRegisterNumber() { return registerNumber; }
    public void setRegisterNumber(String registerNumber) { this.registerNumber = registerNumber; }

    public String getBranchCode() { return branchCode; }
    public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public boolean isVerified() { return isVerified; }
    public void setVerified(boolean verified) { isVerified = verified; }

    public String getVerificationMethod() { return verificationMethod; }
    public void setVerificationMethod(String verificationMethod) { this.verificationMethod = verificationMethod; }
}
