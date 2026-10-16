export async function ordersPayload(queryRows) {
  const orders = await queryRows(
    `SELECT id, order_number, customer_name, customer_email, grand_total, payment_method, payment_status, order_status,
      customer_note FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`,
  );
  const items = orders.length ? await queryRows(
    `SELECT i.order_id, i.product_name, i.quantity FROM order_items i
     JOIN orders o ON o.id = i.order_id WHERE o.deleted_at IS NULL ORDER BY i.id`,
  ) : [];
  const products = new Map();
  for (const item of items) {
    const key = String(item.order_id);
    const names = products.get(key) || [];
    names.push(`${item.product_name} x${item.quantity}`);
    products.set(key, names);
  }
  const payments = { CARD: "Cards", NET_BANKING: "Net Banking", WALLET: "Wallet", COD: "Cash on Delivery" };
  const pending = orders.filter((order) => ["NEW", "CONFIRMED", "PROCESSING", "PACKED"].includes(order.order_status)).length;
  return {
    title: "Orders",
    action: "Create Order",
    columns: ["Order", "Customer", "Products", "Amount", "Payment", "Status", "Payment Status", "Razorpay Payment ID", "Transaction Date", "Razorpay Order ID"],
    rows: orders.map((order) => {
      let payment = {};
      try { payment = JSON.parse(order.customer_note || "{}"); } catch { /* Legacy plain notes. */ }
      return [
      order.order_number,
      order.customer_name || order.customer_email,
      (products.get(String(order.id)) || []).join(", ") || "-",
      `Rs.${Number(order.grand_total).toLocaleString("en-IN")}`,
      payment.paymentMethod || payments[order.payment_method] || order.payment_method,
      order.order_status,
      order.payment_status || "PENDING", payment.gatewayPaymentId || "-", payment.paidAt || "-", payment.gatewayOrderId || "-",
    ]; }),
    metrics: [
      { label: "Orders", value: String(orders.length), trend: "From website checkout", tone: "up" },
      { label: "Pending", value: String(pending), trend: "Awaiting dispatch", tone: pending ? "warn" : "neutral" },
      { label: "Delivered", value: String(orders.filter((order) => order.order_status === "DELIVERED").length), trend: "Completed orders", tone: "up" },
      { label: "Cancelled", value: String(orders.filter((order) => order.order_status === "CANCELLED").length), trend: "Cancelled orders", tone: "neutral" },
    ],
    source: "mysql",
  };
}

export async function updateOrderStatus(transaction, input) {
  const statuses = { preview: "NEW", packed: "PACKED", shipped: "SHIPPED", delivered: "DELIVERED", cancelled: "CANCELLED" };
  const status = Object.hasOwn(statuses, input.status) ? statuses[input.status] : undefined;
  const orderNumber = typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!orderNumber || orderNumber.length > 40 || !status) throw orderError(400, "A valid order and status are required.");
  await transaction(async (connection) => {
    const [orders] = await connection.query(
      "SELECT id, order_status, payment_method, payment_status FROM orders WHERE order_number = ? AND deleted_at IS NULL FOR UPDATE", [orderNumber],
    );
    const order = orders[0];
    if (!order) throw orderError(404, "Order not found.");
    if (order.payment_method === "RAZORPAY" && order.payment_status !== "SUCCESS" && ["PACKED", "SHIPPED", "DELIVERED"].includes(status)) {
      throw orderError(409, "Confirm online payment before fulfilling this order.");
    }
    if (order.order_status === status) return;
    // Select fixed SQL fragments from the validated status rather than comparing
    // bound strings to SQL literals, which can have different server collations.
    const timestamps = [
      ...(status === "SHIPPED" ? ["dispatched_at = COALESCE(dispatched_at, NOW())"] : []),
      status === "DELIVERED" ? "delivered_at = COALESCE(delivered_at, NOW())" : "delivered_at = NULL",
      status === "CANCELLED" ? "cancelled_at = COALESCE(cancelled_at, NOW())" : "cancelled_at = NULL",
    ];
    await connection.execute(
      `UPDATE orders SET order_status = ?, ${timestamps.join(", ")} WHERE id = ?`, [status, order.id],
    );
    await connection.execute(
      "INSERT INTO order_status_history (order_id, previous_status, new_status, note) VALUES (?, ?, ?, ?)",
      [order.id, order.order_status, status, "Status updated from admin orders."],
    );
  });
}

function orderError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
