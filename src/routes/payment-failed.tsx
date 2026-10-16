import { createFileRoute } from "@/router-shim";
import { PaymentFailed } from "@/features/checkout-pages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/payment-failed")({
  head: () => seo("Payment not completed", "Check or retry your SheRise payment.", "/payment-failed", true),
  component: PaymentFailed,
});
