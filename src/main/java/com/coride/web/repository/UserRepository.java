package com.coride.web.repository;

import com.coride.web.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByAdmissionNo(String admissionNo);
    Optional<User> findByRegisterNumber(String registerNumber);
}
