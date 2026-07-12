package com.afriland.diaspora.application.port.out;

import com.afriland.diaspora.domain.model.AccountOpeningRecord;

import java.util.Optional;

public interface AccountOpeningRecordPort {

    Optional<AccountOpeningRecord> findByApplicationReference(String applicationReference);

    AccountOpeningRecord save(AccountOpeningRecord record);
}
