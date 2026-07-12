package com.afriland.diaspora.adapter.out.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Projection minimale (lecture seule) de payment_transactions : la Phase 2 n'a
 * besoin que du statut lié à une référence de paiement package.
 */
@Entity
@Table(name = "payment_transactions")
public class PaymentTransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_reference", nullable = false)
    private String paymentReference;

    private String status;

    protected PaymentTransactionEntity() {
    }

    public Long getId() {
        return id;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public String getStatus() {
        return status;
    }
}
