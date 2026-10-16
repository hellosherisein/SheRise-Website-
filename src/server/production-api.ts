import { handleProductImageUpload } from "./uploads.server";
import { handleCustomerRequest } from "./customer.server";
import { handleNewsletterRequest } from "./newsletter.server";
import { handlePopupLeadRequest } from "./popup-leads.server";
import { handleReviewsRequest } from "./reviews.server";
import { getContentBlog, listContentBlogs, listContentFaqs } from "./content.server";
import { handlePaymentsRequest } from "./payments.server";
export { validatePaymentEnvironment } from "./payments.server";

export async function handleProductionApiRequest(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/payments/")) return handlePaymentsRequest(request);

  if (pathname === "/api/admin/upload-product-image") {
    return handleProductImageUpload(request);
  }
  if (pathname.startsWith("/api/customer/")) {
    return handleCustomerRequest(request, pathname.replace("/api/customer/", ""));
  }
  if (pathname === "/api/newsletter") {
    return handleNewsletterRequest(request);
  }
  if (pathname === "/api/popup-leads") {
    return handlePopupLeadRequest(request);
  }
  if (pathname === "/api/reviews") {
    return handleReviewsRequest();
  }
  if (pathname === "/api/content/blogs") {
    return json({ posts: await listContentBlogs() });
  }
  if (pathname.startsWith("/api/content/blogs/")) {
    const slug = decodeURIComponent(pathname.replace("/api/content/blogs/", ""));
    return json({ post: await getContentBlog(slug), related: await listContentBlogs() });
  }
  if (pathname === "/api/content/faqs") {
    return json({ faqs: listContentFaqs() });
  }

  return json({ error: "Not found." }, 404);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
