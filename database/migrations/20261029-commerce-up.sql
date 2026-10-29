-- Explicit approval and backup required before production execution. No existing data is replaced.
ALTER TABLE products ADD COLUMN shipping_weight_g DECIMAL(12,3) NULL,
 ADD COLUMN package_length_cm DECIMAL(10,2) NULL, ADD COLUMN package_width_cm DECIMAL(10,2) NULL,
 ADD COLUMN package_height_cm DECIMAL(10,2) NULL;
CREATE TABLE commerce_configuration (id TINYINT UNSIGNED PRIMARY KEY, config JSON NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB;
CREATE TABLE shipping_quotes (id CHAR(36) PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL,
 fingerprint CHAR(64) NOT NULL, quote JSON NOT NULL, expires_at DATETIME NOT NULL, order_id BIGINT UNSIGNED NULL UNIQUE,
 KEY idx_quotes_expiry (expires_at), FOREIGN KEY (customer_id) REFERENCES customers(id), FOREIGN KEY (order_id) REFERENCES orders(id)) ENGINE=InnoDB;
CREATE TABLE stock_allocations (order_id BIGINT UNSIGNED NOT NULL, inventory_id BIGINT UNSIGNED NOT NULL,
 quantity INT UNSIGNED NOT NULL, state ENUM('RESERVED','COMMITTED','RELEASED') NOT NULL, expires_at DATETIME NULL,
 PRIMARY KEY (order_id,inventory_id), KEY idx_allocations_expiry (state,expires_at),
 FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (inventory_id) REFERENCES inventory(id)) ENGINE=InnoDB;
CREATE TABLE ekart_shipments (order_id BIGINT UNSIGNED PRIMARY KEY, reference VARCHAR(80) NOT NULL UNIQUE,
 status ENUM('BLOCKED','QUEUED','PROCESSING','UNKNOWN','CREATED','FAILED','CANCELLED') NOT NULL DEFAULT 'BLOCKED',
 carrier_status VARCHAR(100) NULL, shipment_id VARCHAR(150) NULL UNIQUE, awb VARCHAR(150) NULL UNIQUE,
 tracking_url VARCHAR(500) NULL, label_reference VARCHAR(500) NULL, cod_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
 cod_settlement_status ENUM('NOT_APPLICABLE','PENDING','VERIFIED') NOT NULL, cod_evidence VARCHAR(500) NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0, last_error VARCHAR(500) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES orders(id)) ENGINE=InnoDB;
CREATE TABLE ekart_shipment_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
 carrier_event_id VARCHAR(200) NOT NULL UNIQUE, status VARCHAR(100) NOT NULL, occurred_at DATETIME NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES ekart_shipments(order_id)) ENGINE=InnoDB;
