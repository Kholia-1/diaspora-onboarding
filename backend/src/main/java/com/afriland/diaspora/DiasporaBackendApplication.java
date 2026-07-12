package com.afriland.diaspora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DiasporaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(DiasporaBackendApplication.class, args);
	}

}
