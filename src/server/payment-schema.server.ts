// Additive, restart-safe tables. Existing orders/payments and production data remain intact.
export const paymentSchema = [
  `CREATE TABLE IF NOT EXISTS razorpay_checkouts (
    order_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    gateway_order_id VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL UNIQUE,
    gateway_payment_id VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL UNIQUE,
    key_id VARCHAR(80) NOT NULL,
    amount_paise BIGINT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
    method VARCHAR(30) NULL,
    verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_razorpay_checkout_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
    event_id VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    payload_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];
