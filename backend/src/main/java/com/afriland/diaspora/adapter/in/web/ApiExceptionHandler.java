package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

/** Réponses d'erreur JSON {"detail": "..."} — parité avec FastAPI. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException e) {
        return ResponseEntity.status(e.status()).body(Map.of("detail", e.detail()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoResourceFoundException e) {
        return ResponseEntity.status(404).body(Map.of("detail", "Not Found"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return ResponseEntity.status(405).body(Map.of("detail", "Method Not Allowed"));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableBody(
            org.springframework.http.converter.HttpMessageNotReadableException e) {
        // Corps JSON invalide (syntaxe, encodage...) : erreur client, pas erreur serveur.
        return ResponseEntity.status(400).body(Map.of(
                "detail", "Corps de requête invalide (JSON mal formé ou encodage incorrect)."));
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> handleMissingParameter(
            org.springframework.web.bind.MissingServletRequestParameterException e) {
        // Champ de formulaire obligatoire manquant : erreur client.
        return ResponseEntity.status(400).body(Map.of(
                "detail", "Champ obligatoire manquant : " + e.getParameterName() + "."));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleTooLarge(
            org.springframework.web.multipart.MaxUploadSizeExceededException e) {
        // Parité legacy : fichier trop volumineux → 413.
        return ResponseEntity.status(413).body(Map.of("detail", "Fichier trop volumineux"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception e) {
        log.error("Erreur interne non gérée", e);
        return ResponseEntity.status(500).body(Map.of("detail", "Internal Server Error"));
    }
}
