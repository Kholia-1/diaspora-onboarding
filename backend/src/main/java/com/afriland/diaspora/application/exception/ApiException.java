package com.afriland.diaspora.application.exception;

/**
 * Exception métier portant un statut HTTP et un message "detail" — parité avec
 * HTTPException(status_code, detail) de FastAPI. Aucune dépendance framework.
 */
public class ApiException extends RuntimeException {

    private final int status;

    /** Detail structuré (Map/List) pour les erreurs FastAPI dont le detail est un objet JSON. */
    private final transient Object detailPayload;

    public ApiException(int status, String detail) {
        super(detail);
        this.status = status;
        this.detailPayload = null;
    }

    public ApiException(int status, Object detailPayload) {
        super(String.valueOf(detailPayload));
        this.status = status;
        this.detailPayload = detailPayload;
    }

    public int status() {
        return status;
    }

    /** Contenu du champ "detail" de la réponse JSON : objet structuré si fourni, sinon le message. */
    public Object detail() {
        return detailPayload != null ? detailPayload : getMessage();
    }

    public static ApiException badRequest(String detail) {
        return new ApiException(400, detail);
    }

    public static ApiException unauthorized(String detail) {
        return new ApiException(401, detail);
    }

    public static ApiException forbidden(String detail) {
        return new ApiException(403, detail);
    }

    public static ApiException notFound(String detail) {
        return new ApiException(404, detail);
    }

    public static ApiException conflict(String detail) {
        return new ApiException(409, detail);
    }

    public static ApiException internal(String detail) {
        return new ApiException(500, detail);
    }
}
