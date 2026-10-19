export type Enquiry = {
  name: string;
  mobile: string;
  email: string;
  interestedIn: string;
  message: string;
  source: "Website popup" | "Contact form";
};

// Web3Forms access keys are public form identifiers, intended for browser use.
const accessKey = "1b1c6440-1c30-4ced-85f9-e41df5e8b303";

export function createEnquirySubmitter(fetcher: typeof fetch = fetch) {
  let savedEnquiry = "";
  return async (enquiry: Enquiry) => {
    const signature = JSON.stringify(enquiry);
    if (savedEnquiry !== signature) {
      const response = await fetcher("/api/popup-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: signature,
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "Could not save your enquiry. Please try again.");
      }
      savedEnquiry = signature;
      window.dispatchEvent(new Event("sherise-popup-leads-updated"));
    }
    try {
      const response = await fetcher("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "content-type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `SheRise enquiry — ${enquiry.source}: ${enquiry.interestedIn}`,
          from_name: "SheRise Website",
          name: enquiry.name,
          email: enquiry.email,
          mobile: enquiry.mobile,
          topic: enquiry.interestedIn,
          message: enquiry.message,
          source: enquiry.source,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error("Email delivery failed.");
    } catch {
      throw new Error("Your enquiry is saved, but the email could not be sent. Please submit again to retry.");
    }
    savedEnquiry = "";
  };
}
