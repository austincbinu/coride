package com.coride.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@SpringBootApplication
public class CoRideApplication {

    private static final Logger log = LoggerFactory.getLogger(CoRideApplication.class);

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(CoRideApplication.class, args);
    }

    /**
     * Loads .env key-value pairs into system properties if not already set in OS environment.
     */
    private static void loadDotenv() {
        File envFile = new File(".env");
        if (envFile.exists() && envFile.isFile()) {
            log.info("Loading environment configurations from local .env file");
            try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String val = line.substring(eqIndex + 1).trim();
                        if (System.getenv(key) == null && System.getProperty(key) == null) {
                            System.setProperty(key, val);
                        }
                    }
                }
            } catch (IOException e) {
                log.warn("Could not read .env file: {}", e.getMessage());
            }
        }
    }
}
