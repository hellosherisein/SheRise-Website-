import flatlay from "@/assets/sherise-flatlay.jpg";
import guide from "@/assets/sherise-guide.jpg";
import story from "@/assets/sherise-story.jpg";

export type Product = {
  id: string; slug: string; name: string; shortDescription: string; description: string;
  category: "Sanitary Pads" | "Period Care"; images: string[]; sizes: string[];
  flow: string[]; packOptions: { label: string; price: number; mrp: number; stock: number }[];
  mrp: number; salePrice: number; discount: number; stock: number; sku: string;
  rating?: number; reviewCount?: number; features: string[]; materials: string[];
  usageInstructions: string[]; disposalInstructions: string[]; faq: { q: string; a: string }[];
  relatedProducts: string[]; badge?: string; featured?: boolean;
};

const shared = {
  images: [flatlay, flatlay, flatlay], sizes: ["XL", "XXL", "XXXL"],
  materials: ["Material information placeholder â€” replace with verified SheRise details."],
  usageInstructions: ["Remove the wrapper.", "Place securely on underwear.", "Change as needed for your comfort."],
  disposalInstructions: ["Wrap the used pad securely.", "Place in an appropriate waste bin. Do not flush."],
  faq: [{ q: "Which size should I choose?", a: "Choose by your flow, routine and preferred coverage. See our Period Guide for a simple starting point." }],
};

export const products: Product[] = [
  {
    ...shared,
    id: "p20",
    slug: "sherise-20-count-organic-sanitary-pads",
    name: "SheRise 20 Count Organic Sanitary Pads With Anion Strip",
    shortDescription: "20-count pack with 12 Regular and 8 XXL pads plus disposable bag.",
    description:
      "A SheRise 20-count sanitary pad pack for normal and heavy flow routines. Includes 12 Regular pads at 290 mm and 8 XXL pads at 320 mm, with disposable bag.",
    category: "Sanitary Pads",
    sizes: ["Regular", "XXL"],
    flow: ["Medium", "Heavy"],
    packOptions: [{ label: "20 Count - 12 Regular + 8 XXL", price: 329, mrp: 400, stock: 12 }],
    mrp: 400,
    salePrice: 329,
    discount: 18,
    stock: 12,
    sku: "SR-ANION-20",
    features: [
      "Soft Cotton Top Layer",
      "Super Absorbent Core",
      "Breathable Back Sheet",
      "Leak Guard Protection",
      "Dry & Comfortable Feel",
      "Individually Wrapped for Hygiene",
    ],
    materials: ["Organic Sanitary Pads With Anion Strip", "Soft cotton top layer", "Breathable back sheet"],
    usageInstructions: [
      "Peel off back paper.",
      "Place on underwear and press.",
      "Remove wing strips.",
      "Fold wings and secure.",
    ],
    disposalInstructions: [
      "Roll the used pad.",
      "Place it into the disposable bag.",
      "Do not flush it.",
      "Dispose of it in a dustbin.",
    ],
    faq: [
      {
        q: "What is inside the 20 count pack?",
        a: "Total 20 pads: 12 Count Regular - 290 mm and 8 Count XXL - 320 mm. The pack includes a disposable bag.",
      },
      {
        q: "Who is this pack suitable for?",
        a: "The pack is described for normal and heavy flow. Choose based on your flow, comfort and coverage needs.",
      },
      {
        q: "What is the SheRise brand message?",
        a: "With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal. Release, Renew, Rise.",
      },
      {
        q: "What are the anion strip notes on the packaging?",
        a: "The packaging mentions anion strip advantages such as balance, energy, immunity, metabolism, circulation, mood, stress and sleep support. These are packaging claims and should be verified before using as medical or wellness claims on the website.",
      },
      {
        q: "How should this product be stored?",
        a: "Store in a clean, dry and sealed place. Best before: 36 months from date of manufacture.",
      },
      {
        q: "Who manufactures and markets this product?",
        a: "Manufactured by Kollisto Hygiene Pvt Ltd. Marketed by S3 Enterprises, Prabhadevi, Mumbai 400 013. Contact: 95942 41666. Email: hellosherise.in@gmail.com. Website: hellosherise.com.",
      },
    ],
    relatedProducts: ["sherise-9-count-organic-sanitary-pads", "sherise-7-count-organic-sanitary-pads"],
    badge: "20 Count",
    featured: true,
  },
  {
    ...shared,
    id: "p9",
    slug: "sherise-9-count-organic-sanitary-pads",
    name: "SheRise 9 Count Organic Sanitary Pads With Anion Strip",
    shortDescription: "Medium 9-count pack with disposable bag.",
    description:
      "A SheRise 9-count sanitary pad pack for everyday period care. The pack is marked Medium and includes a disposable bag.",
    category: "Sanitary Pads",
    sizes: ["Medium"],
    flow: ["Medium"],
    packOptions: [{ label: "9 Count Medium", price: 149, mrp: 180, stock: 14 }],
    mrp: 180,
    salePrice: 149,
    discount: 17,
    stock: 14,
    sku: "SR-ANION-09",
    features: [
      "Organic Sanitary Pads With Anion Strip",
      "With Disposable Bag",
      "Medium Pack",
      "Total 9 Count",
      "Designed for everyday comfort",
      "Individually Wrapped for Hygiene",
    ],
    materials: ["Organic Sanitary Pads With Anion Strip", "Soft cotton top layer", "Breathable back sheet"],
    usageInstructions: [
      "Peel off back paper.",
      "Place on underwear and press.",
      "Remove wing strips.",
      "Fold wings and secure.",
    ],
    disposalInstructions: [
      "Roll the used pad.",
      "Place it into the disposable bag.",
      "Do not flush it.",
      "Dispose of it in a dustbin.",
    ],
    faq: [
      {
        q: "What is inside the 9 count pack?",
        a: "Total 9 sanitary pads. The pack is marked Medium and includes a disposable bag.",
      },
      {
        q: "What is the SheRise brand message?",
        a: "With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal.",
      },
      {
        q: "How do I use this product?",
        a: "Peel off back paper, place on underwear and press, remove wing strips, then fold wings and secure.",
      },
      {
        q: "How should I dispose of it?",
        a: "Roll the used pad, place it into the disposable bag, do not flush it, and dispose of it in a dustbin.",
      },
      {
        q: "Who manufactures and markets this product?",
        a: "Manufactured by Kallisto Hygiene Pvt Ltd. Marketed by S3 Enterprises, Prabhadevi, Mumbai 400 013. Contact: 95942 41666. Email: hellosherise.in@gmail.com. Website: hellosherise.com.",
      },
      {
        q: "What additional pack details are shown?",
        a: "The pack includes product description, anion strip notes, usage information, storage instructions, MRP, best before information, certification marks and contact details. Exact small-print wording should be verified from a clearer pack image.",
      },
    ],
    relatedProducts: ["sherise-7-count-organic-sanitary-pads", "sherise-20-count-organic-sanitary-pads"],
    badge: "9 Count",
    featured: true,
  },
  {
    ...shared,
    id: "p7",
    slug: "sherise-7-count-organic-sanitary-pads",
    name: "SheRise 7 Count Organic Sanitary Pads With Anion Strip",
    shortDescription: "Medium 7-count pack with Regular and XXL pads plus disposable bag.",
    description:
      "A compact 7-count SheRise pack for normal and heavy flow routines. Includes 4 Regular pads at 290 mm and 3 XXL pads at 320 mm, with disposable bag.",
    category: "Sanitary Pads",
    sizes: ["Regular", "XXL"],
    flow: ["Medium", "Heavy"],
    packOptions: [{ label: "7 Count Medium", price: 119, mrp: 145, stock: 15 }],
    mrp: 145,
    salePrice: 119,
    discount: 18,
    stock: 15,
    sku: "SR-ANION-07",
    features: [
      "Soft Cotton Top Layer",
      "Super Absorbent Core",
      "Breathable Back Sheet",
      "Leak Guard Protection",
      "Dry & Comfortable Feel",
      "Individually Wrapped for Hygiene",
    ],
    materials: ["Organic Sanitary Pads With Anion Strip", "Soft cotton top layer", "Breathable back sheet"],
    usageInstructions: [
      "Peel off back paper.",
      "Place on underwear and press.",
      "Remove wing strips.",
      "Fold wings and secure.",
    ],
    disposalInstructions: [
      "Roll the used pad.",
      "Place it into the disposable bag.",
      "Do not flush it.",
      "Dispose of it in a dustbin.",
    ],
    faq: [
      {
        q: "What is inside the 7 count pack?",
        a: "Total 7 pads: 4 Count Regular - 290 mm and 3 Count XXL - 320 mm. The pack is marked Medium and includes a disposable bag.",
      },
      {
        q: "Who is this pack suitable for?",
        a: "The pack is described for normal and heavy flow. Choose based on your flow, comfort and coverage needs.",
      },
      {
        q: "What is the SheRise brand message?",
        a: "With every cycle, She Releases, Renews, and Rises. Inspired by the natural rhythm of the body, SheRise celebrates strength, balance, and renewal. Release, Renew, Rise.",
      },
      {
        q: "What are the anion strip notes on the packaging?",
        a: "The packaging mentions anion strip advantages such as balance, energy, immunity, metabolism, circulation, mood, stress and sleep support. These are packaging claims and should be verified before using as medical or wellness claims on the website.",
      },
      {
        q: "How should this product be stored?",
        a: "Store in a clean, dry and sealed place. Best before: 36 months from date of manufacture.",
      },
      {
        q: "Who manufactures and markets this product?",
        a: "Manufactured by Kallisto Hygiene Pvt Ltd. Marketed by S3 Enterprises, Prabhadevi, Mumbai 400 013. Contact: 95942 41666. Email: hellosherise.in@gmail.com. Website: hellosherise.com.",
      },
    ],
    relatedProducts: ["sherise-9-count-organic-sanitary-pads", "sherise-20-count-organic-sanitary-pads"],
    badge: "7 Count",
    featured: true,
  },
];

export type BlogPost = { slug:string; title:string; excerpt:string; category:string; date:string; image:string; content:string[] };
export const posts: BlogPost[] = [
  {slug:"understanding-your-menstrual-cycle",title:"Understanding Your Menstrual Cycle",excerpt:"A calm, practical introduction to the phases of your cycle.",category:"Cycle Basics",date:"12 September 2026",image:guide,content:["Your menstrual cycle is a repeating pattern of changes in the body. Every personâ€™s experience can differ, and tracking your own patterns can help you understand what feels typical for you.","If pain, bleeding, or another symptom worries you, seek advice from a qualified healthcare professional."]},
  {slug:"how-to-choose-sanitary-pad-size",title:"Choosing the Right Pad Size",excerpt:"Use flow, coverage and routine to find a comfortable starting point.",category:"Period Guide",date:"8 September 2026",image:flatlay,content:["Start with your usual flow and the activities in your day. Longer formats can offer more coverage, while a lighter format may feel more comfortable on lower-flow days.","There is no universal perfect size. Adjust as your flow changes and always follow verified product instructions."]},
  {slug:"period-care-on-busy-days",title:"Period Care on Busy Days",excerpt:"Simple planning ideas for commutes, classes and long workdays.",category:"Everyday Care",date:"2 September 2026",image:story,content:["Keep a small period-care kit with products you already know, disposal bags if needed, and a spare pair of underwear.","Plan breaks around your own comfort and follow the productâ€™s change guidance."]},
];

export const getProduct = (slug:string) => products.find((p)=>p.slug===slug);
export const getPost = (slug:string) => posts.find((p)=>p.slug===slug);
export const money = (value:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
