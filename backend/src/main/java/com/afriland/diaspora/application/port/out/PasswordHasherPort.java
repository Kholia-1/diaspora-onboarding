package com.afriland.diaspora.application.port.out;

public interface PasswordHasherPort {

    /** Hache un mot de passe au format Python "salt$hexdigest" (PBKDF2-HMAC-SHA256, 200 000 itérations). */
    String encode(String rawPassword);

    /** Vérifie un mot de passe contre un hash stocké, en temps constant. */
    boolean matches(String rawPassword, String storedHash);
}
