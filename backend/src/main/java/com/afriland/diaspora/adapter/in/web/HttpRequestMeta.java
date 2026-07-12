package com.afriland.diaspora.adapter.in.web;

import jakarta.servlet.http.HttpServletRequest;

/** Extraction IP / User-Agent — parité avec app/services/audit_service.py. */
public final class HttpRequestMeta {

    private HttpRequestMeta() {
    }

    public static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("x-forwarded-for");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }

    public static String userAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("user-agent");
        if (userAgent == null) {
            return "";
        }
        return userAgent.length() > 300 ? userAgent.substring(0, 300) : userAgent;
    }
}
