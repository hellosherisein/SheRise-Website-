// Keep SQL, credentials, and customer data out of browser responses.
export function adminErrorResponse(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const statusCode = error?.statusCode;
  if ([400, 401, 404, 409].includes(statusCode)) {
    return { status: statusCode, body: { error: statusCode === 401 ? "Admin login required." : error.message } };
  }
  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR"].includes(code)) {
    return failure(503, code, "Database is unavailable. Check the database host, port, and service in hosting settings.");
  }
  if (["ER_ACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR"].includes(code)) {
    return failure(503, code, "Database login or access was denied. Check the database user and permissions in hosting settings.");
  }
  if (["ER_TABLEACCESS_DENIED_ERROR", "ER_COLUMNACCESS_DENIED_ERROR", "ER_SPECIFIC_ACCESS_DENIED_ERROR"].includes(code)) {
    return failure(500, code, "The database user does not have permission for this admin action. Check database write and schema permissions.");
  }
  if (["ER_BAD_FIELD_ERROR", "ER_NO_SUCH_TABLE", "ER_BAD_DB_ERROR"].includes(code)) {
    return failure(500, code, "The deployed database schema does not match this admin action. Check the missing table or column in application logs.");
  }
  if (["ER_CANT_AGGREGATE_2COLLATIONS", "ER_CANT_AGGREGATE_3COLLATIONS", "ER_CANT_AGGREGATE_NCOLLATIONS", "ER_COLLATION_CHARSET_MISMATCH"].includes(code)) {
    return failure(500, code, "Database text collations conflict in this action. Check query and database collation settings in application logs.");
  }
  if (["ER_TRUNCATED_WRONG_VALUE", "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD", "WARN_DATA_TRUNCATED", "ER_DATA_TOO_LONG", "ER_BAD_NULL_ERROR", "ER_NO_DEFAULT_FOR_FIELD", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(code)) {
    return failure(500, code, "The database rejected this change. Check field types, required values, and related records in application logs.");
  }
  if (code === "ER_DUP_ENTRY") {
    const detail = String(error?.sqlMessage || error?.message || "");
    if (/slug/i.test(detail)) {
      return failure(409, code, "Another product already uses this slug. Keep the existing slug or enter a unique one.");
    }
    if (/sku/i.test(detail)) {
      return failure(409, code, "Another product already uses this SKU. Enter a unique SKU.");
    }
    return failure(409, code, "A unique product value is already in use. Check the product SKU and slug.");
  }
  return failure(500, "ADMIN_REQUEST_FAILED", "Admin action failed. Check the application logs for the exact cause.");
}

function failure(status, errorCode, message) {
  return { status, body: { error: `${message} (${errorCode})`, errorCode } };
}
