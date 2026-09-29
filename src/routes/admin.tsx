import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@/router-shim";
import {
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Home,
  ImagePlus,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquareText,
  Package,
  Percent,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminDemoCredentials, isAdminAuthenticated, logoutAdmin } from "@/lib/admin-auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => seo("Admin Dashboard", "SheRise e-commerce operations dashboard."),
  component: AdminConsole,
});

type Tone = "ok" | "warn" | "danger";
type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "orders" | "customers" | "reviews" | "popupLeads";
};
type ModuleConfig = {
  title: string;
  action: string;
  columns: string[];
  rows: string[][];
  metrics: Array<{ label: string; value: string; trend: string; tone: string }>;
  source?: "mysql" | "frontend" | "sqlite";
};
type AdminBadgeCounts = Record<NonNullable<NavItem["badgeKey"]>, number>;
type ActionFormData = {
  adminAction?: "create" | "update" | "delete";
  originalSku?: string;
  originalKey?: string;
  title: string;
  code: string;
  status: string;
  notes: string;
  author?: string;
  publishedDate?: string;
  slug?: string;
  sku?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  mrp?: string;
  sellingPrice?: string;
  gstPercent?: string;
  stock?: string;
  lowStockThreshold?: string;
  packQuantity?: string;
  sizes?: string;
  productDimensions?: string;
  padLength?: string;
  frontPackContent?: string;
  flow?: string;
  imageUrl?: string;
  imageUrls?: string;
  anionStripNotes?: string;
  brandMessage?: string;
  features?: string;
  materials?: string;
  usageInstructions?: string;
  disposalInstructions?: string;
  safetyInformation?: string;
  storageInstruction?: string;
  manufacturerDetails?: string;
  marketerDetails?: string;
  productContact?: string;
  productEmail?: string;
  productWebsite?: string;
  shelfLife?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isFeatured?: string;
  isBestseller?: string;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Dashboard",
    items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "E-Commerce",
    items: [
      { label: "Products", to: "/admin/products", icon: Package },
      { label: "Categories", to: "/admin/categories", icon: Boxes },
      { label: "Inventory", to: "/admin/inventory", icon: Warehouse },
      { label: "Orders", to: "/admin/orders", icon: ShoppingCart, badgeKey: "orders" },
      { label: "Customers", to: "/admin/customers", icon: Users, badgeKey: "customers" },
      { label: "Coupons", to: "/admin/coupons", icon: Percent },
      { label: "Reviews", to: "/admin/reviews", icon: Star, badgeKey: "reviews" },
    ],
  },
  {
    label: "Website CMS",
    items: [
      { label: "Homepage", to: "/admin/homepage", icon: Home },
      { label: "Banners", to: "/admin/banners", icon: FileText },
      { label: "Pop-up Leads", to: "/admin/popup-leads", icon: Inbox, badgeKey: "popupLeads" },
      { label: "Newsletter", to: "/admin/newsletter", icon: Mail },
      { label: "Blogs", to: "/admin/blogs", icon: MessageSquareText },
      { label: "FAQs", to: "/admin/faqs", icon: ClipboardList },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Business Settings", to: "/admin/business-settings", icon: Settings },
      { label: "Shipping Settings", to: "/admin/shipping-settings", icon: Truck },
    ],
  },
];

const moduleConfig: Record<string, ModuleConfig> = {
  products: {
    title: "Products",
    action: "Add Product",
    columns: ["Product", "SKU", "Category", "Stock", "Status"],
    rows: [
      ["SheRise 20 Count Organic Sanitary Pads", "SR-ANION-20", "Sanitary Pads", "12", "ACTIVE"],
      ["SheRise 9 Count Organic Sanitary Pads", "SR-ANION-09", "Sanitary Pads", "14", "ACTIVE"],
      ["SheRise 7 Count Organic Sanitary Pads", "SR-ANION-07", "Sanitary Pads", "15", "ACTIVE"],
    ],
    metrics: [
      { label: "Total Products", value: "3", trend: "All live", tone: "up" },
      { label: "Active Products", value: "3", trend: "Store visible", tone: "up" },
      { label: "Low Stock", value: "0", trend: "Clean", tone: "up" },
      { label: "Out of Stock", value: "0", trend: "Clean", tone: "up" },
    ],
  },
  categories: {
    title: "Categories",
    action: "Add Category",
    columns: ["Category", "Slug", "Products", "Navigation", "SEO", "Sort", "Status"],
    rows: [
      ["Sanitary Pads", "sanitary-pads", "36", "Shown", "Ready", "10", "ACTIVE"],
      ["Period Care", "period-care", "18", "Shown", "Ready", "20", "ACTIVE"],
      ["Day Pads", "day-pads", "14", "Shown", "Needs Meta", "30", "ACTIVE"],
      ["Night / Overnight Pads", "night-overnight-pads", "12", "Shown", "Ready", "40", "ACTIVE"],
      ["Combo Packs", "combo-packs", "6", "Shown", "Ready", "50", "ACTIVE"],
    ],
    metrics: [
      { label: "Categories", value: "5", trend: "All active", tone: "up" },
      { label: "Menu Items", value: "5", trend: "Visible", tone: "neutral" },
      { label: "SEO Missing", value: "1", trend: "Review", tone: "warn" },
      { label: "Drafts", value: "0", trend: "Clean", tone: "up" },
    ],
  },
  inventory: {
    title: "Inventory",
    action: "Stock Entry",
    columns: ["Item", "Variant", "Current", "Reserved", "Alert"],
    rows: [
      ["SheRise 20 Count Organic Sanitary Pads", "20 Count", "12", "0", "ACTIVE"],
      ["SheRise 9 Count Organic Sanitary Pads", "9 Count Medium", "14", "0", "ACTIVE"],
      ["SheRise 7 Count Organic Sanitary Pads", "7 Count Medium", "15", "0", "ACTIVE"],
    ],
    metrics: [
      { label: "Current Stock", value: "41", trend: "Preview stock", tone: "up" },
      { label: "Reserved", value: "0", trend: "Open orders", tone: "neutral" },
      { label: "Low Stock", value: "0", trend: "Clean", tone: "up" },
      { label: "Out of Stock", value: "0", trend: "Clean", tone: "up" },
    ],
  },
  orders: {
    title: "Orders",
    action: "Create Order",
    columns: ["Order", "Customer", "Amount", "Payment", "Status"],
    rows: [
      ["SR-1048", "Aarohi Jain", "Rs.438", "UPI", "PROCESSING"],
      ["SR-1047", "Nisha Patel", "Rs.829", "COD", "NEW"],
      ["SR-1046", "Meera Shah", "Rs.358", "Card", "PACKED"],
    ],
    metrics: [
      { label: "Today's Orders", value: "38", trend: "+6", tone: "up" },
      { label: "Pending", value: "17", trend: "Needs action", tone: "warn" },
      { label: "Shipped", value: "24", trend: "Today", tone: "up" },
      { label: "Returns", value: "3", trend: "Review", tone: "warn" },
    ],
  },
  customers: {
    title: "Customers",
    action: "Add Customer",
    columns: ["Customer", "Mobile", "Orders", "Last Login", "Status"],
    rows: [
      ["Aarohi Jain", "9876543210", "8", "Today", "ACTIVE"],
      ["Nisha Patel", "9876501234", "3", "Yesterday", "ACTIVE"],
      ["Meera Shah", "9876511111", "5", "22 Sep", "ACTIVE"],
    ],
    metrics: [
      { label: "Customers", value: "4,912", trend: "+128", tone: "up" },
      { label: "New Today", value: "21", trend: "+9%", tone: "up" },
      { label: "Repeat Buyers", value: "42%", trend: "+3.2%", tone: "up" },
      { label: "Blocked", value: "2", trend: "Low", tone: "neutral" },
    ],
  },
  coupons: {
    title: "Coupons",
    action: "Create Coupon",
    columns: ["Code", "Type", "Value", "Usage", "Status"],
    rows: [
      ["RISE10", "Percentage", "10%", "46", "ACTIVE"],
      ["FIRST50", "Fixed", "Rs.50", "88", "ACTIVE"],
      ["COMBO15", "Percentage", "15%", "12", "ACTIVE"],
    ],
    metrics: [
      { label: "Active Coupons", value: "8", trend: "3 ending soon", tone: "warn" },
      { label: "Used Today", value: "22", trend: "+5", tone: "up" },
      { label: "Discount Given", value: "Rs.9,820", trend: "This week", tone: "neutral" },
      { label: "Expired", value: "4", trend: "Archived", tone: "neutral" },
    ],
  },
  reviews: {
    title: "Reviews",
    action: "Moderate",
    columns: ["Customer", "Product", "Rating", "Verified", "Status"],
    rows: [
      ["Anika Rao", "20 Count Pack", "5/5", "Yes", "PENDING"],
      ["Pooja Menon", "9 Count Pack", "4/5", "Yes", "PENDING"],
      ["Simran Kaur", "7 Count Pack", "5/5", "No", "PENDING"],
    ],
    metrics: [
      { label: "Pending Reviews", value: "11", trend: "Moderate", tone: "warn" },
      { label: "Approved", value: "248", trend: "+18", tone: "up" },
      { label: "Avg Rating", value: "4.8", trend: "Strong", tone: "up" },
      { label: "Rejected", value: "7", trend: "All time", tone: "neutral" },
    ],
  },
  homepage: {
    title: "Homepage Sections",
    action: "Add Section",
    columns: ["Section", "Type", "CTA", "Sort", "Status"],
    rows: [
      ["Hero Banner", "HERO", "Shop Now", "10", "ACTIVE"],
      ["Featured Products", "FEATURED_PRODUCTS", "View Products", "20", "ACTIVE"],
      ["Why SheRise", "WHY_SHERISE", "Learn More", "30", "ACTIVE"],
      ["Testimonials", "TESTIMONIALS", "-", "40", "ACTIVE"],
    ],
    metrics: [
      { label: "Sections", value: "8", trend: "6 active", tone: "up" },
      { label: "Drafts", value: "2", trend: "Review", tone: "warn" },
      { label: "Hero Live", value: "1", trend: "Desktop + mobile", tone: "up" },
      { label: "Custom Blocks", value: "3", trend: "JSON content", tone: "neutral" },
    ],
  },
  banners: {
    title: "Homepage Banners",
    action: "Add Banner",
    columns: ["Banner", "Desktop Image", "Mobile Image", "CTA", "Schedule", "Sort", "Status"],
    rows: [
      ["Release Renew Rise", "hero-desktop.jpg", "hero-mobile.jpg", "Shop Pads", "Always On", "10", "ACTIVE"],
      ["Period Care Essentials", "period-care.jpg", "period-care-mobile.jpg", "Explore", "1 Oct - 15 Oct", "20", "ACTIVE"],
      ["Night Comfort Promo", "night-comfort.jpg", "night-comfort-mobile.jpg", "Buy Combo", "Scheduled", "30", "INACTIVE"],
      ["Trial Pack Offer", "trial-pack.jpg", "trial-pack-mobile.jpg", "Try Now", "Ends 30 Sep", "40", "ACTIVE"],
    ],
    metrics: [
      { label: "Total Banners", value: "4", trend: "3 active", tone: "up" },
      { label: "Scheduled", value: "1", trend: "Starts soon", tone: "warn" },
      { label: "Mobile Images", value: "4/4", trend: "Complete", tone: "up" },
      { label: "Missing CTA", value: "0", trend: "Clean", tone: "up" },
    ],
  },
  "popup-leads": {
    title: "Pop-up Leads",
    action: "Add Lead",
    columns: ["Lead", "Mobile", "Interested In", "Source", "Status"],
    rows: [
      ["Riya Sharma", "9876500001", "Trial Pack", "Exit Popup", "NEW"],
      ["Kavya Nair", "9876500002", "Overnight Pads", "Homepage Popup", "NEW"],
      ["Wellness Mart", "9876500003", "Wholesale", "Bulk Popup", "CONTACTED"],
    ],
    metrics: [
      { label: "New Leads", value: "7", trend: "Today", tone: "warn" },
      { label: "Total Leads", value: "22", trend: "+5 today", tone: "up" },
      { label: "Contacted", value: "9", trend: "Follow-up", tone: "neutral" },
      { label: "Converted", value: "3", trend: "This week", tone: "up" },
    ],
  },
  newsletter: {
    title: "Newsletter Subscribers",
    action: "Add Subscriber",
    columns: ["Email", "Source", "Subscribed", "Updated", "Status"],
    rows: [["No newsletter signups yet", "Footer newsletter", "Waiting", "Waiting", "PENDING"]],
    metrics: [
      { label: "Subscribers", value: "0", trend: "Waiting for signups", tone: "neutral" },
      { label: "Active", value: "0", trend: "Newsletter list", tone: "neutral" },
      { label: "Source", value: "Website", trend: "JOIN US form", tone: "up" },
      { label: "Storage", value: "On", trend: "Admin visible", tone: "up" },
    ],
  },
  blogs: {
    title: "Blogs",
    action: "Add Blog",
    columns: ["Title", "Category", "Author", "Published", "Status"],
    rows: [
      ["How to choose the right pad", "Period Care", "SheRise Team", "22 Sep", "ACTIVE"],
      ["Night flow comfort guide", "Wellness", "SheRise Team", "Draft", "PENDING"],
      ["Period myths explained", "Education", "SheRise Team", "18 Sep", "ACTIVE"],
    ],
    metrics: [
      { label: "Published", value: "12", trend: "+2 month", tone: "up" },
      { label: "Drafts", value: "3", trend: "Review", tone: "warn" },
      { label: "Categories", value: "4", trend: "Active", tone: "up" },
      { label: "SEO Missing", value: "1", trend: "Fix meta", tone: "warn" },
    ],
  },
  faqs: {
    title: "FAQs",
    action: "Add FAQ",
    columns: ["Question", "Category", "Sort", "Updated", "Status"],
    rows: [
      ["How often should I change pads?", "Usage", "10", "Today", "ACTIVE"],
      ["Is COD available?", "Shipping", "20", "Yesterday", "ACTIVE"],
      ["How do returns work?", "Returns", "30", "20 Sep", "ACTIVE"],
    ],
    metrics: [
      { label: "FAQs", value: "18", trend: "All active", tone: "up" },
      { label: "Categories", value: "5", trend: "Grouped", tone: "neutral" },
      { label: "Drafts", value: "0", trend: "Clean", tone: "up" },
      { label: "Top Category", value: "Usage", trend: "6 FAQs", tone: "neutral" },
    ],
  },
  "business-settings": {
    title: "Business Settings",
    action: "Update Business",
    columns: ["Setting", "Value", "Owner", "Updated", "Status"],
    rows: [
      ["Business Name", "SheRise", "Super Admin", "Today", "ACTIVE"],
      ["Support Email", "support@sherise.local", "Super Admin", "Today", "ACTIVE"],
      ["WhatsApp", "+91 98765 43210", "Super Admin", "22 Sep", "ACTIVE"],
    ],
    metrics: [
      { label: "Profile", value: "90%", trend: "Logo pending", tone: "warn" },
      { label: "Support", value: "Ready", trend: "Email + phone", tone: "up" },
      { label: "GST", value: "Not applied", trend: "No GSTIN", tone: "neutral" },
      { label: "Socials", value: "4", trend: "Active", tone: "neutral" },
    ],
  },
  "shipping-settings": {
    title: "Shipping Settings",
    action: "Add Rule",
    columns: ["Rule", "Coverage", "Charge", "COD", "Status"],
    rows: [
      ["Default India", "All India", "Rs.49", "Enabled", "ACTIVE"],
      ["Free Shipping", "Orders Rs.499+", "Rs.0", "Enabled", "ACTIVE"],
      ["Selected Pincodes", "Priority Cities", "Rs.29", "Enabled", "INACTIVE"],
    ],
    metrics: [
      { label: "Active Rules", value: "2", trend: "All India", tone: "up" },
      { label: "COD", value: "On", trend: "Charge Rs.25", tone: "up" },
      { label: "Free Shipping", value: "Rs.499", trend: "Threshold", tone: "neutral" },
      { label: "Pincodes", value: "126", trend: "Serviceable", tone: "up" },
    ],
  },
};

const fallbackModule: ModuleConfig = {
  title: "Admin Module",
  action: "Add New",
  columns: ["Title", "Type", "Owner", "Updated", "Status"],
  rows: [
    ["Homepage hero", "Content", "Content Manager", "Today", "ACTIVE"],
    ["Bulk order enquiry", "Lead", "Order Manager", "Yesterday", "NEW"],
    ["Shipping rule", "Setting", "Super Admin", "22 Sep", "ACTIVE"],
  ],
  metrics: [
    { label: "Active Records", value: "42", trend: "Synced", tone: "up" },
    { label: "Drafts", value: "5", trend: "Review", tone: "warn" },
    { label: "Pending", value: "8", trend: "Needs action", tone: "warn" },
    { label: "Archived", value: "12", trend: "Hidden", tone: "neutral" },
  ],
};

const kpis = [
  { label: "Today's Sales", value: "Rs.24,850", trend: "+12.4%", tone: "up" },
  { label: "Total Sales", value: "Rs.8.42L", trend: "+8.1%", tone: "up" },
  { label: "Today's Orders", value: "38", trend: "+6", tone: "up" },
  { label: "Total Orders", value: "1,284", trend: "+4.8%", tone: "up" },
  { label: "Total Customers", value: "4,912", trend: "+128", tone: "up" },
  { label: "Total Products", value: "3", trend: "All active", tone: "up" },
  { label: "Pending Orders", value: "17", trend: "Needs action", tone: "warn" },
  { label: "Low Stock", value: "9", trend: "3 critical", tone: "warn" },
  { label: "Out of Stock", value: "4", trend: "Restock", tone: "danger" },
  { label: "Pending Reviews", value: "11", trend: "Moderate", tone: "warn" },
  { label: "New Enquiries", value: "14", trend: "+5 today", tone: "up" },
  { label: "Popup Leads", value: "22", trend: "7 new", tone: "up" },
];

const revenue = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 49 },
  { label: "Thu", value: 72 },
  { label: "Fri", value: 64 },
  { label: "Sat", value: 91 },
  { label: "Sun", value: 76 },
];

const orders = [
  ["SR-1048", "Aarohi Jain", "20 Count Pack", "Rs.329", "UPI", "PROCESSING", "23 Sep"],
  ["SR-1047", "Nisha Patel", "9 Count Pack", "Rs.149", "COD", "NEW", "23 Sep"],
  ["SR-1046", "Meera Shah", "7 Count Pack", "Rs.119", "Card", "PACKED", "22 Sep"],
  ["SR-1045", "Tara Sinha", "7 Count Pack", "Rs.119", "Wallet", "SHIPPED", "22 Sep"],
];

const lowStock = [
  { product: "SheRise 20 Count Organic Sanitary Pads", sku: "SR-ANION-20", variant: "20 Count", stock: 12, min: 5 },
  { product: "SheRise 9 Count Organic Sanitary Pads", sku: "SR-ANION-09", variant: "9 Count Medium", stock: 14, min: 5 },
  { product: "SheRise 7 Count Organic Sanitary Pads", sku: "SR-ANION-07", variant: "7 Count Medium", stock: 15, min: 5 },
];

const enquiries = [
  { name: "Riya Sharma", type: "Popup Lead", status: "NEW", time: "10:12 AM" },
  { name: "Wellness Mart", type: "Wholesale", status: "CONTACTED", time: "09:40 AM" },
  { name: "Kavya Nair", type: "Product Enquiry", status: "NEW", time: "Yesterday" },
];

const reviews = [
  { customer: "Anika Rao", product: "20 Count Pack", rating: 5 },
  { customer: "Pooja Menon", product: "9 Count Pack", rating: 4 },
  { customer: "Simran Kaur", product: "7 Count Pack", rating: 5 },
];

export function AdminConsole() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<AdminBadgeCounts>({
    orders: 0,
    customers: 0,
    reviews: 0,
    popupLeads: 0,
  });
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeSection = pathname === "/admin" ? "dashboard" : pathname.replace("/admin/", "");
  const isKnownSection = activeSection === "dashboard" || Boolean(moduleConfig[activeSection]);
  const pageTitle =
    activeSection === "dashboard"
      ? "Dashboard"
      : navGroups.flatMap((group) => group.items).find((item) => item.to === pathname)?.label ??
        titleFromSlug(activeSection);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setAuthChecked(true);
      return;
    }
    const ok = isAdminAuthenticated();
    setAuthenticated(ok);
    setAuthChecked(true);
    if (!ok) void navigate({ to: "/admin/login", replace: true });
  }, [navigate, pathname]);

  useEffect(() => {
    if (!authenticated || pathname === "/admin/login") return;
    if (!isKnownSection) {
      void navigate({ to: "/admin", replace: true });
      return;
    }

    let cancelled = false;
    const fetchModule = async (module: string) => {
      const response = await fetch(`/api/admin/${module}`);
      const payload = (await response.json()) as ModuleConfig & { error?: string };
      if (!response.ok) throw new Error(payload.error || `${module} could not be loaded.`);
      return payload;
    };
    const refreshBadges = () => {
      Promise.all([
        fetchModule("orders"),
        fetchModule("customers"),
        fetchModule("reviews"),
        fetchModule("popup-leads"),
      ])
        .then(([ordersPayload, customersPayload, reviewsPayload, leadsPayload]) => {
          const orders = ordersPayload.rows.filter((row) => {
            const status = (row[5] || "").toUpperCase();
            return row[0] !== "No frontend orders yet" && !["DELIVERED", "CANCELLED"].includes(status);
          });
          const customers = customersPayload.rows.filter((row) => row[0] !== "No frontend customers yet");
          const pendingReviews = Number(
            reviewsPayload.metrics.find((metric) => metric.label === "Pending")?.value || 0,
          );
          const persistedLeads = Number(
            leadsPayload.metrics.find((metric) => metric.label === "Persisted Leads")?.value || 0,
          );
          if (!cancelled) {
            setBadgeCounts({
              orders: orders.length,
              customers: customers.length,
              reviews: Number.isFinite(pendingReviews) ? pendingReviews : 0,
              popupLeads: Number.isFinite(persistedLeads) ? persistedLeads : 0,
            });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setBadgeCounts({
              orders: 0,
              customers: 0,
              reviews: 0,
              popupLeads: 0,
            });
          }
        });
    };

    refreshBadges();
    const interval = window.setInterval(refreshBadges, 20000);
    window.addEventListener("sherise-admin-orders-updated", refreshBadges);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("sherise-admin-orders-updated", refreshBadges);
    };
  }, [authenticated, isKnownSection, navigate, pathname]);

  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  if (!authChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f4f0] text-brand-navy">
        <p className="font-display text-2xl">Loading admin...</p>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f4f0] text-brand-navy">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[#eadbd2] bg-[#fffaf6] lg:block">
          <AdminSidebar activePath={pathname} badgeCounts={badgeCounts} />
        </aside>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[315px] bg-[#fffaf6] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin navigation</SheetTitle>
              <SheetDescription>SheRise admin modules</SheetDescription>
            </SheetHeader>
            <AdminSidebar
              activePath={pathname}
              badgeCounts={badgeCounts}
              onNavigate={() => setMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <AdminHeader title={pageTitle} onMenuClick={() => setMenuOpen(true)} />
          <main className="space-y-6 px-4 py-6 sm:px-6">
            {activeSection === "dashboard" ? (
              <DashboardView />
            ) : (
              <ModuleView section={activeSection} config={moduleConfig[activeSection] ?? fallbackModule} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminHeader({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    toast.success("Admin logged out.");
    void navigate({ to: "/admin/login", replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#eadbd2] bg-[#fffaf6]/95 backdrop-blur">
        <div className="flex min-h-18 items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open admin menu"
            onClick={onMenuClick}
          >
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-brand-burgundy">Admin</p>
            <h1 className="truncate font-display text-2xl leading-tight sm:text-3xl">{title}</h1>
          </div>
          <div className="ml-auto hidden min-w-[220px] max-w-md flex-1 items-center gap-2 border border-[#e4d5cc] bg-white px-3 py-2 md:flex">
            <Search className="size-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search orders, products, customers"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Notifications"
            className="relative bg-white"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-brand-coral" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 border border-[#e4d5cc] bg-white px-3 py-2 text-left">
                <span className="grid size-9 place-items-center rounded-full bg-brand-blush font-display text-lg">
                  S
                </span>
                <span className="hidden text-sm sm:block">
                  Super Admin
                  <span className="block text-xs text-muted-foreground">Owner</span>
                </span>
                <ChevronDown className="hidden size-4 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-[#eadbd2] bg-white">
              <DropdownMenuLabel>
                Super Admin
                <span className="block text-xs font-normal text-muted-foreground">
                  {adminDemoCredentials.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/business-settings">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/business-settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleLogout}
              >
                <LogOut />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <NotificationsDialog open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </>
  );
}

function NotificationsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const notifications = [
    ["New order received", "Order SR-1048 is waiting for processing."],
    ["Stock update", "SheRise 7, 9 and 20 Count packs are available."],
    ["Review pending", "3 product reviews need moderation."],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#eadbd2] bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">Notifications</DialogTitle>
          <DialogDescription>Latest admin alerts from orders, stock and reviews.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {notifications.map(([title, message]) => (
            <div key={title} className="border border-[#eadbd2] bg-[#fffaf6] p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="bg-white"
            onClick={() => {
              onOpenChange(false);
              toast.success("Notifications marked as read.");
            }}
          >
            Mark as Read
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardView() {
  const maxRevenue = useMemo(() => Math.max(...revenue.map((item) => item.value)), []);

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Panel title="Sales Analytics" action="Last 7 Days">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="flex h-72 items-end gap-3 border-b border-l border-[#eadbd2] px-3 pt-8">
              {revenue.map((item) => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-56 w-full items-end">
                    <div
                      className="w-full bg-brand-coral/80"
                      style={{ height: `${(item.value / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="grid content-start gap-3">
              <MetricLine label="Revenue" value="Rs.1.62L" color="bg-brand-coral" />
              <MetricLine label="Orders" value="248" color="bg-brand-navy" />
              <MetricLine label="AOV" value="Rs.653" color="bg-brand-burgundy" />
              <div className="mt-2 border border-[#eadbd2] bg-[#fffaf6] p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Payment Split</p>
                <div className="mt-4 space-y-3">
                  <Progress label="UPI" value={52} />
                  <Progress label="COD" value={28} />
                  <Progress label="Cards" value={20} />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Low Stock Alert" action="View Inventory" to="/admin/inventory">
          <div className="space-y-3">
            {lowStock.map((item) => (
              <div
                key={item.sku}
                className="grid gap-3 border border-[#eadbd2] bg-white p-4 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.product}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.sku} | {item.variant}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <StatusBadge tone={item.stock === 0 ? "danger" : "warn"}>
                    {item.stock === 0 ? "OUT OF STOCK" : "LOW STOCK"}
                  </StatusBadge>
                  <p className="mt-2 text-xs">
                    {item.stock} in stock | min {item.min}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Panel title="Recent Orders" action="View Orders" to="/admin/orders">
          <DataTable
            columns={["Order ID", "Customer", "Products", "Amount", "Payment", "Status", "Date"]}
            rows={orders}
          />
        </Panel>

        <div className="grid gap-6">
          <Panel title="Recent Enquiries" action="Open Leads" to="/admin/popup-leads">
            <div className="space-y-3">
              {enquiries.map((item) => (
                <CompactRow
                  key={`${item.name}-${item.type}`}
                  title={item.name}
                  meta={`${item.type} | ${item.time}`}
                  badge={item.status}
                  tone={item.status === "NEW" ? "warn" : "ok"}
                />
              ))}
            </div>
          </Panel>
          <Panel title="Pending Reviews" action="Moderate" to="/admin/reviews">
            <div className="space-y-3">
              {reviews.map((item) => (
                <CompactRow
                  key={`${item.customer}-${item.product}`}
                  title={item.customer}
                  meta={`${item.product} | ${item.rating}/5`}
                  badge="PENDING"
                  tone="warn"
                />
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}

function ModuleView({ section, config }: { section: string; config: ModuleConfig }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ActionFormData | null>(null);
  const [editingRow, setEditingRow] = useState<{ row: string[]; data: ActionFormData } | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [liveConfig, setLiveConfig] = useState<ModuleConfig | null>(null);
  const [loadingLiveData, setLoadingLiveData] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<string[] | null>(null);
  const [selectedReview, setSelectedReview] = useState<string[] | null>(null);
  const [selectedLead, setSelectedLead] = useState<string[] | null>(null);
  const [selectedSubscriber, setSelectedSubscriber] = useState<string[] | null>(null);
  const displayConfig = liveConfig ?? config;
  const apiSections = [
    "products",
    "categories",
    "inventory",
    "orders",
    "customers",
    "coupons",
    "reviews",
    "homepage",
    "banners",
    "popup-leads",
    "newsletter",
    "blogs",
    "faqs",
    "business-settings",
    "shipping-settings",
  ];
  const hasApiData = apiSections.includes(section);
  const canSaveSection = ["products", "categories", "banners"].includes(section);
  const isProductSection = section === "products";
  const isPopupLeadSection = section === "popup-leads";
  const isNewsletterSection = section === "newsletter";
  const isContentSection = section === "blogs" || section === "faqs";
  const isInventorySection = section === "inventory";
  const hasLocalRowActions = section === "homepage" || section === "faqs" || section === "blogs";

  useEffect(() => {
    let cancelled = false;
    if (!hasApiData) {
      setLiveConfig(null);
      setConnectionError("");
      setLoadingLiveData(false);
      return;
    }

    setLoadingLiveData(true);
    setConnectionError("");
    fetch(`/api/admin/${section}`)
      .then(async (response) => {
        const payload = (await response.json()) as ModuleConfig & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Admin data could not be loaded.");
        if (!cancelled) setLiveConfig(payload);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLiveConfig(null);
          setConnectionError(error instanceof Error ? error.message : "Admin data could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLiveData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasApiData, reloadKey, section]);

  const handleExport = () => {
    downloadCsv(displayConfig.title, displayConfig.columns, displayConfig.rows);
    setSavedMessage(`${displayConfig.title} CSV exported.`);
  };

  const updateProductRowLocally = (formData: ActionFormData) => {
    const nextRow = productFormToRow(formData, editingProduct);
    setLiveConfig((current) => {
      const base = current ?? displayConfig;
      return {
        ...base,
        rows: base.rows.map((row) => (row[2] === editingProduct?.originalSku ? nextRow : row)),
      };
    });
    setDialogOpen(false);
    setEditingProduct(null);
    setSavedMessage(`${formData.title || "Product"} updated.`);
    toast.success("Product updated.");
  };

  const saveLocalRow = (formData: ActionFormData) => {
    const nextRow = localFormDataToRow(section, formData, editingRow?.row);
    setLiveConfig((current) => {
      const base = current ?? displayConfig;
      return {
        ...base,
        rows: editingRow
          ? base.rows.map((row) => (row === editingRow.row ? nextRow : row))
          : [nextRow, ...base.rows],
      };
    });
    setDialogOpen(false);
    setEditingRow(null);
    setSavedMessage(`${formData.title || displayConfig.title} ${editingRow ? "updated" : "added"}.`);
    toast.success(`${displayConfig.title} ${editingRow ? "updated" : "added"}.`);
  };

  const handleSave = async (formData: ActionFormData) => {
    if (hasLocalRowActions && !isContentSection) {
      saveLocalRow(formData);
      return;
    }

    if (isProductSection && editingProduct) {
      const payloadData = {
        ...formData,
        adminAction: "update" as const,
        originalSku: editingProduct.originalSku,
      };
      if (displayConfig.source !== "mysql") {
        updateProductRowLocally(payloadData);
        return;
      }
      const response = await fetch(`/api/admin/${section}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadData),
      });
      const payload = (await response.json()) as ModuleConfig & { error?: string };
      if (!response.ok) {
        toast.error(payload.error || "Could not update product.");
        return;
      }
      setLiveConfig(payload);
      setReloadKey((value) => value + 1);
      setDialogOpen(false);
      setEditingProduct(null);
      setSavedMessage(`${formData.title || "Product"} updated in MySQL.`);
      toast.success("Product updated.");
      return;
    }

    if (isContentSection) {
      const response = await fetch(`/api/admin/${section}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...formData,
          adminAction: editingRow ? "update" : "create",
          originalKey: editingRow?.data.originalKey,
        }),
      });
      const payload = (await response.json()) as ModuleConfig & { error?: string };
      if (!response.ok) {
        toast.error(payload.error || `Could not save ${displayConfig.title.toLowerCase()}.`);
        return;
      }
      setLiveConfig(payload);
      setReloadKey((value) => value + 1);
      setDialogOpen(false);
      setEditingRow(null);
      setSavedMessage(`${formData.title || displayConfig.title} ${editingRow ? "updated" : "saved"} to database.`);
      toast.success(`${displayConfig.title} ${editingRow ? "updated" : "saved"}.`);
      return;
    }

    if (isInventorySection) {
      const response = await fetch(`/api/admin/${section}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...formData,
          adminAction: editingRow ? "update" : "create",
          originalKey: editingRow?.data.originalKey,
        }),
      });
      const payload = (await response.json()) as ModuleConfig & { error?: string };
      if (!response.ok) {
        toast.error(payload.error || "Could not update stock.");
        return;
      }
      setLiveConfig(payload);
      setReloadKey((value) => value + 1);
      setDialogOpen(false);
      setEditingRow(null);
      setSavedMessage(`${formData.sku || formData.code || formData.title} stock updated.`);
      toast.success("Stock updated.");
      return;
    }

    if (!canSaveSection) {
      setDialogOpen(false);
      setSavedMessage(`${displayConfig.action} form submitted. This module is currently a frontend mirror.`);
      return;
    }

    const response = await fetch(`/api/admin/${section}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formData),
    });
    const payload = (await response.json()) as ModuleConfig & { error?: string };
    if (!response.ok) {
      toast.error(payload.error || "Could not save admin record.");
      return;
    }
    setLiveConfig(payload);
    setReloadKey((value) => value + 1);
    setDialogOpen(false);
    setSavedMessage(`${displayConfig.action} saved to MySQL.`);
    toast.success(`${displayConfig.action} saved.`);
  };

  const handleEditProduct = (row: string[]) => {
    setEditingProduct(productRowToFormData(row));
    setDialogOpen(true);
  };

  const handleDeleteProduct = async (row: string[]) => {
    const productName = row[0] || "this product";
    const sku = row[2] || "";
    if (!window.confirm(`Delete ${productName}?`)) return;

    if (displayConfig.source !== "mysql") {
      setLiveConfig((current) => {
        const base = current ?? displayConfig;
        return { ...base, rows: base.rows.filter((item) => item[2] !== sku) };
      });
      setSavedMessage(`${productName} deleted from this admin view.`);
      toast.success("Product deleted.");
      return;
    }

    const response = await fetch(`/api/admin/${section}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminAction: "delete", originalSku: sku }),
    });
    const payload = (await response.json()) as ModuleConfig & { error?: string };
    if (!response.ok) {
      toast.error(payload.error || "Could not delete product.");
      return;
    }
    setLiveConfig(payload);
    setReloadKey((value) => value + 1);
    setSavedMessage(`${productName} deleted from MySQL.`);
    toast.success("Product deleted.");
  };

  const handleEditLocalRow = (row: string[]) => {
    setEditingRow({ row, data: localRowToFormData(section, row) });
    setDialogOpen(true);
  };

  const handleDeleteLocalRow = async (row: string[]) => {
    const title = row[0] || "this item";
    if (!window.confirm(`Delete ${title}?`)) return;
    if (isContentSection) {
      const data = localRowToFormData(section, row);
      const response = await fetch(`/api/admin/${section}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminAction: "delete", originalKey: data.originalKey, title: data.title, slug: data.slug, code: data.code }),
      });
      const payload = (await response.json()) as ModuleConfig & { error?: string };
      if (!response.ok) {
        toast.error(payload.error || `Could not delete ${displayConfig.title.toLowerCase()}.`);
        return;
      }
      setLiveConfig(payload);
      setReloadKey((value) => value + 1);
      setSavedMessage(`${title} deleted from database.`);
      toast.success(`${title} deleted.`);
      return;
    }
    setLiveConfig((current) => {
      const base = current ?? displayConfig;
      return { ...base, rows: base.rows.filter((item) => item !== row) };
    });
    setSavedMessage(`${title} deleted.`);
    toast.success(`${title} deleted.`);
  };

  const handleOrderStatus = async (status: "preview" | "packed" | "shipped" | "delivered" | "cancelled") => {
    if (!selectedOrder) return;
    const response = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: selectedOrder[0], status }),
    });
    const payload = (await response.json()) as ModuleConfig & { error?: string };
    if (!response.ok) {
      toast.error(payload.error || "Could not update order status.");
      return;
    }
    setLiveConfig(payload);
    const updated = payload.rows.find((row) => row[0] === selectedOrder[0]) ?? null;
    setSelectedOrder(updated);
    setReloadKey((value) => value + 1);
    window.dispatchEvent(new Event("sherise-admin-orders-updated"));
    setSavedMessage(`Order ${selectedOrder[0]} updated to ${orderStatusLabel(status)}.`);
    toast.success("Order status updated.");
  };

  const handleReviewStatus = async (status: "PENDING" | "APPROVED" | "REJECTED") => {
    if (!selectedReview) return;
    const response = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: selectedReview[4],
        productName: selectedReview[1],
        status,
      }),
    });
    const payload = (await response.json()) as ModuleConfig & { error?: string };
    if (!response.ok) {
      toast.error(payload.error || "Could not update review.");
      return;
    }
    setLiveConfig(payload);
    const updated = payload.rows.find((row) => row[4] === selectedReview[4] && row[1] === selectedReview[1]) ?? null;
    setSelectedReview(updated);
    setReloadKey((value) => value + 1);
    window.dispatchEvent(new Event("sherise-admin-orders-updated"));
    setSavedMessage(
      status === "APPROVED"
        ? "Review approved and visible on website."
        : status === "REJECTED"
          ? "Review rejected and hidden from website."
          : "Review moved back to pending.",
    );
    toast.success(status === "APPROVED" ? "Review approved." : "Review updated.");
  };

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {displayConfig.metrics.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>
      <Panel
        title={`${displayConfig.title} Management`}
        action={displayConfig.action}
        icon={<Plus className="size-4" />}
        onAction={() => {
          setEditingProduct(null);
          setEditingRow(null);
          setDialogOpen(true);
        }}
      >
        {loadingLiveData ? (
          <div className="mb-4 border border-[#eadbd2] bg-[#fffaf6] px-3 py-2 text-sm font-medium text-brand-navy">
            Connecting to MySQL data...
          </div>
        ) : null}
        {displayConfig.source === "mysql" ? (
          <div className="mb-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-4" />
            Live MySQL data connected.
          </div>
        ) : null}
        {displayConfig.source === "frontend" ? (
          <div className="mb-4 border border-[#eadbd2] bg-[#fffaf6] px-3 py-2 text-sm font-medium text-brand-navy">
            Showing current frontend content for this module.
            {section === "reviews"
              ? " Click a review to approve it for the website or reject it."
              : canSaveSection
                ? " New records save to MySQL."
                : hasLocalRowActions
                  ? " You can add, edit, and delete rows in this admin view."
                  : " This view is read-only until write APIs are added."}
          </div>
        ) : null}
        {displayConfig.source === "sqlite" ? (
          <div className="mb-4 border border-[#eadbd2] bg-[#fffaf6] px-3 py-2 text-sm font-medium text-brand-navy">
            {isContentSection
              ? "Showing website content saved in the local database."
              : isInventorySection
                ? "Showing inventory saved in the local database while MySQL is unavailable."
              : "Showing frontend account database records from the local preview app."}
          </div>
        ) : null}
        {connectionError ? (
          <div className="mb-4 border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            {connectionError} Showing demo data until MySQL is available.
          </div>
        ) : null}
        {savedMessage ? (
          <div className="mb-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="size-4" />
            {savedMessage}
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder={`Search ${displayConfig.title.toLowerCase()}`}
            />
          </div>
          <Button variant="outline" className="gap-2 bg-white" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
        <DataTable
          columns={displayConfig.columns}
          rows={displayConfig.rows}
          onRowClick={section === "orders" ? setSelectedOrder : section === "reviews" ? setSelectedReview : undefined}
          renderActions={
            isProductSection
              ? (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 bg-white"
                      title="Edit product"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditProduct(row);
                      }}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit product</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 bg-white text-red-700 hover:text-red-800"
                      title="Delete product"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteProduct(row);
                      }}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete product</span>
                    </Button>
                  </div>
                )
              : isInventorySection
                ? (row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 bg-white"
                        title="Edit stock"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditLocalRow(row);
                        }}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit stock</span>
                      </Button>
                    </div>
                  )
              : hasLocalRowActions
                ? (row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 bg-white"
                        title={`Edit ${displayConfig.title.toLowerCase()}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditLocalRow(row);
                        }}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 bg-white text-red-700 hover:text-red-800"
                        title={`Delete ${displayConfig.title.toLowerCase()}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteLocalRow(row);
                        }}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  )
              : isPopupLeadSection || isNewsletterSection
                ? (row) => (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 gap-2 bg-white px-3 text-xs font-semibold"
                      title={isNewsletterSection ? "View subscriber" : "View enquiry"}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isNewsletterSection) setSelectedSubscriber(row);
                        else setSelectedLead(row);
                      }}
                    >
                      <Eye className="size-4" />
                      View
                    </Button>
                  )
              : undefined
          }
        />
      </Panel>
      <OrderPreviewDialog
        order={selectedOrder}
        open={section === "orders" && Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
        onStatusChange={handleOrderStatus}
      />
      <ReviewModerationDialog
        review={selectedReview}
        open={section === "reviews" && Boolean(selectedReview)}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null);
        }}
        onStatusChange={handleReviewStatus}
      />
      <PopupLeadDialog
        lead={selectedLead}
        open={isPopupLeadSection && Boolean(selectedLead)}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
      />
      <NewsletterSubscriberDialog
        subscriber={selectedSubscriber}
        open={isNewsletterSection && Boolean(selectedSubscriber)}
        onOpenChange={(open) => {
          if (!open) setSelectedSubscriber(null);
        }}
      />
      <ActionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProduct(null);
          if (!open) setEditingRow(null);
        }}
        title={editingProduct ? "Edit Product" : editingRow ? `Edit ${displayConfig.title}` : displayConfig.action}
        moduleTitle={displayConfig.title}
        section={section}
        initialData={editingProduct ?? editingRow?.data ?? null}
        onSave={handleSave}
      />
    </>
  );
}

function AdminSidebar({
  activePath,
  badgeCounts,
  onNavigate,
}: {
  activePath: string;
  badgeCounts: AdminBadgeCounts;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[#eadbd2] px-6 py-5">
        <Link to="/admin" className="font-display text-3xl leading-none">
          She<span className="text-brand-coral">Rise</span>
        </Link>
        <p className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">
          Commerce Admin
        </p>
      </div>
      <nav className="flex-1 overflow-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activePath === item.to;
                const badgeCount = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={onNavigate}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${
                      active
                        ? "bg-brand-blush font-bold text-brand-navy"
                        : "hover:bg-brand-cream"
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand-coral px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

function productRowToFormData(row: string[]): ActionFormData {
  const price = row[4]?.replace(/[^\d.]/g, "") || "";
  return {
    originalSku: row[2] || "",
    title: row[0] || "",
    code: row[2] || "",
    status: row[7] || "ACTIVE",
    notes: "",
    slug: slugFromTitle(row[0] || ""),
    sku: row[2] || "",
    category: row[3] || "Sanitary Pads",
    mrp: "",
    sellingPrice: price,
    stock: row[5] || "0",
    flow: normalizeFlowValues(row[6] || ""),
    imageUrl: row[1] && row[1] !== "Frontend asset" && row[1] !== "No Image" ? productImagePath(row[1]) : "",
  };
}

function productFormToRow(formData: ActionFormData, fallback: ActionFormData | null): string[] {
  const status = formData.status || fallback?.status || "ACTIVE";
  const stock =
    status === "OUT OF STOCK" ? 0 : Number.parseInt(formData.stock || fallback?.stock || "0", 10);
  return [
    formData.title || fallback?.title || "Product",
    formData.imageUrl || fallback?.imageUrl || "Frontend asset",
    (formData.sku || fallback?.sku || fallback?.originalSku || "").toUpperCase(),
    formData.category || fallback?.category || "Sanitary Pads",
    `Rs.${Number(formData.sellingPrice || formData.mrp || fallback?.sellingPrice || 0).toLocaleString("en-IN")}`,
    String(Number.isFinite(stock) ? Math.max(0, stock) : 0),
    displayFlowValues(formData.flow || fallback?.flow || "MEDIUM"),
    stock === 0 ? "OUT OF STOCK" : status,
  ];
}

function localRowToFormData(section: string, row: string[]): ActionFormData {
  if (section === "homepage") {
    return {
      title: row[0] || "",
      code: row[1] || "",
      notes: row[3] || "",
      status: row[4] || "ACTIVE",
      shortDescription: row[2] || "",
    };
  }
  if (section === "faqs") {
    return {
      title: row[0] || "",
      notes: row[1] || "",
      status: row.at(-1) || "ACTIVE",
      originalKey: row[0] || "",
    };
  }
  if (section === "blogs") {
    return {
      title: row[0] || "",
      code: row[1] || "",
      slug: row[1] || "",
      category: row[2] || "",
      publishedDate: row[3] || "",
      author: row[4] || "SheRise Team",
      imageUrl: row[5] || "",
      notes: row[6] || "",
      shortDescription: row[6] || "",
      description: row[7] && !isStatus(row[7]) ? row[7] : "",
      status: row.at(-1) || "ACTIVE",
      originalKey: row[1] || row[0] || "",
    };
  }
  if (section === "inventory") {
    return {
      title: row[0] || "",
      code: row[1] || "",
      sku: row[1] || "",
      packQuantity: row[2] || "",
      stock: row[3] || "0",
      status: row[4] || "ACTIVE",
      lowStockThreshold: row[4] === "LOW STOCK" ? row[3] || "5" : "5",
      originalKey: row[1] || "",
      notes: "",
    };
  }
  return {
    title: row[0] || "",
    code: row[1] || "",
    notes: row.slice(2, -1).join(" | "),
    status: row.at(-1) || "ACTIVE",
  };
}

function localFormDataToRow(section: string, formData: ActionFormData, fallback?: string[]): string[] {
  if (section === "homepage") {
    return [
      formData.title || fallback?.[0] || "New Section",
      (formData.code || fallback?.[1] || "CUSTOM").toUpperCase(),
      formData.shortDescription || fallback?.[2] || "-",
      formData.notes || fallback?.[3] || "-",
      formData.status || fallback?.[4] || "ACTIVE",
    ];
  }
  if (section === "faqs") {
    return [
      formData.title || fallback?.[0] || "New FAQ question",
      formData.notes || fallback?.[1] || "-",
      formData.status || fallback?.at(-1) || "ACTIVE",
    ];
  }
  if (section === "blogs") {
    const slug = formData.slug || formData.code || fallback?.[1] || slugFromTitle(formData.title || fallback?.[0] || "new-blog-post");
    return [
      formData.title || fallback?.[0] || "New Blog Post",
      slug,
      formData.category || fallback?.[2] || "Period Care",
      formData.publishedDate || fallback?.[3] || "Draft",
      formData.author || fallback?.[4] || "SheRise Team",
      formData.imageUrl || fallback?.[5] || "-",
      formData.notes || formData.shortDescription || fallback?.[6] || "-",
      formData.status || fallback?.at(-1) || "ACTIVE",
    ];
  }
  return [
    formData.title || fallback?.[0] || "New Item",
    formData.code || fallback?.[1] || "-",
    formData.notes || fallback?.[2] || "-",
    formData.status || fallback?.at(-1) || "ACTIVE",
  ];
}

function normalizeFlowValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

function displayFlowValues(value: string) {
  return normalizeFlowValues(value)
    .split(",")
    .filter(Boolean)
    .map((item) => item.charAt(0) + item.slice(1).toLowerCase())
    .join(",");
}

function slugFromTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateInputValue(value?: string) {
  if (!value || value.toLowerCase() === "draft") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function safeUploadFileName(value: string) {
  const [name = "product", extension = "jpg"] = value.split(/\.(?=[^.]+$)/);
  const safeName =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${safeName}.${safeExtension}`;
}

function productImagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  return `/uploads/products/${safeUploadFileName(trimmed)}`;
}

function basenameFromPath(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1) || value;
}

function KpiCard({
  label,
  value,
  trend,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  tone: string;
}) {
  return (
    <article className="grid min-h-[124px] grid-rows-[auto_1fr_auto] border border-[#eadbd2] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <div className="flex items-center">
        <strong className="block text-3xl font-bold leading-none tracking-normal tabular-nums text-brand-navy">
          {value}
        </strong>
      </div>
      <p
        className={`text-xs font-semibold ${
          tone === "danger"
            ? "text-red-700"
            : tone === "warn"
              ? "text-amber-700"
              : tone === "up"
                ? "text-emerald-700"
                : "text-muted-foreground"
        }`}
      >
        {trend}
      </p>
    </article>
  );
}

function Panel({
  title,
  action,
  children,
  to,
  icon,
  onAction,
}: {
  title: string;
  action: string;
  children: ReactNode;
  to?: string;
  icon?: ReactNode;
  onAction?: () => void;
}) {
  const actionContent = (
    <>
      {icon}
      {action}
    </>
  );

  return (
    <section className="border border-[#eadbd2] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {to ? (
          <Button variant="outline" size="sm" className="gap-2 bg-white" asChild>
            <Link to={to}>{actionContent}</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={onAction}>
            {actionContent}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function ActionDialog({
  open,
  onOpenChange,
  title,
  moduleTitle,
  section,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  moduleTitle: string;
  section: string;
  initialData?: ActionFormData | null;
  onSave: (formData: ActionFormData) => void | Promise<void>;
}) {
  const [imagePreview, setImagePreview] = useState("");
  const isProduct = section === "products";
  const isBlog = section === "blogs";

  useEffect(() => {
    if (!open) return;
    setImagePreview(initialData?.imageUrl || "");
  }, [initialData, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto border-[#eadbd2] bg-white ${isProduct ? "sm:max-w-6xl" : isBlog ? "sm:max-w-4xl" : "sm:max-w-xl"}`}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">{title}</DialogTitle>
          <DialogDescription>
            {isProduct
              ? initialData
                ? "Update product information used by the admin product table."
                : "Add the same product information used by the storefront product cards and detail pages."
              : `Add or update ${moduleTitle.toLowerCase()} details. This UI is ready for API connection.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void onSave({
              title: String(formData.get("title") ?? ""),
              code: String(formData.get("code") ?? ""),
              status: String(formData.get("status") ?? "ACTIVE"),
              notes: String(formData.get("notes") ?? ""),
              author: String(formData.get("author") ?? ""),
              publishedDate: String(formData.get("publishedDate") ?? ""),
              slug: String(formData.get("slug") ?? ""),
              sku: String(formData.get("sku") ?? ""),
              category: String(formData.get("category") ?? ""),
              shortDescription: String(formData.get("shortDescription") ?? ""),
              description: String(formData.get("description") ?? ""),
              mrp: String(formData.get("mrp") ?? ""),
              sellingPrice: String(formData.get("sellingPrice") ?? ""),
              gstPercent: String(formData.get("gstPercent") ?? ""),
              stock: String(formData.get("stock") ?? ""),
              lowStockThreshold: String(formData.get("lowStockThreshold") ?? ""),
              packQuantity: String(formData.get("packQuantity") ?? ""),
              sizes: String(formData.get("sizes") ?? ""),
              productDimensions: String(formData.get("productDimensions") ?? ""),
              padLength: String(formData.get("padLength") ?? ""),
              frontPackContent: String(formData.get("frontPackContent") ?? ""),
              flow: formData.getAll("flow").map(String).join(","),
              imageUrl: String(formData.get("imageUrl") ?? ""),
              imageUrls: String(formData.get("imageUrls") ?? ""),
              anionStripNotes: String(formData.get("anionStripNotes") ?? ""),
              brandMessage: String(formData.get("brandMessage") ?? ""),
              features: String(formData.get("features") ?? ""),
              materials: String(formData.get("materials") ?? ""),
              usageInstructions: String(formData.get("usageInstructions") ?? ""),
              disposalInstructions: String(formData.get("disposalInstructions") ?? ""),
              safetyInformation: String(formData.get("safetyInformation") ?? ""),
              storageInstruction: String(formData.get("storageInstruction") ?? ""),
              manufacturerDetails: String(formData.get("manufacturerDetails") ?? ""),
              marketerDetails: String(formData.get("marketerDetails") ?? ""),
              productContact: String(formData.get("productContact") ?? ""),
              productEmail: String(formData.get("productEmail") ?? ""),
              productWebsite: String(formData.get("productWebsite") ?? ""),
              shelfLife: String(formData.get("shelfLife") ?? ""),
              metaTitle: String(formData.get("metaTitle") ?? ""),
              metaDescription: String(formData.get("metaDescription") ?? ""),
              metaKeywords: String(formData.get("metaKeywords") ?? ""),
              isFeatured: String(formData.get("isFeatured") ?? ""),
              isBestseller: String(formData.get("isBestseller") ?? ""),
            });
          }}
        >
          {isProduct ? (
            <ProductFormFields initialData={initialData} imagePreview={imagePreview} setImagePreview={setImagePreview} />
          ) : (
            <BasicFormFields moduleTitle={moduleTitle} section={section} initialData={initialData} />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="bg-white" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initialData ? "Update" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BasicFormFields({
  moduleTitle,
  section,
  initialData,
}: {
  moduleTitle: string;
  section: string;
  initialData?: ActionFormData | null;
}) {
  const isHomepage = section === "homepage";
  const isFaq = section === "faqs";
  const isBlog = section === "blogs";
  const isInventory = section === "inventory";

  if (isFaq) {
    return (
      <>
        <label className="grid gap-1 text-sm font-medium">
          Question
          <input
            name="title"
            required
            defaultValue={initialData?.title || ""}
            className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="How often should I change my sanitary pad?"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatusField defaultValue={initialData?.status} />
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Answer
          <textarea
            name="notes"
            required
            defaultValue={initialData?.notes || ""}
            className="min-h-32 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="Write the FAQ answer shown to customers."
          />
        </label>
      </>
    );
  }

  if (isBlog) {
    return <BlogFormFields initialData={initialData} />;
  }

  if (isInventory) {
    return (
      <>
        <label className="grid gap-1 text-sm font-medium">
          Item
          <input
            name="title"
            defaultValue={initialData?.title || ""}
            className="admin-input"
            placeholder="SheRise 20 Count Organic Sanitary Pads"
            readOnly={Boolean(initialData?.title)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            SKU
            <input
              name="sku"
              required
              defaultValue={initialData?.sku || initialData?.code || ""}
              className="admin-input uppercase"
              placeholder="SR-ANION-20"
              readOnly={Boolean(initialData?.sku || initialData?.code)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pack
            <input
              name="packQuantity"
              defaultValue={initialData?.packQuantity || ""}
              className="admin-input"
              placeholder="20 Count"
              readOnly={Boolean(initialData?.packQuantity)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Current Stock
            <input
              name="stock"
              type="number"
              min="0"
              required
              defaultValue={initialData?.stock || "0"}
              className="admin-input"
              placeholder="12"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Low Stock Alert
            <input
              name="lowStockThreshold"
              type="number"
              min="0"
              defaultValue={initialData?.lowStockThreshold || "5"}
              className="admin-input"
              placeholder="5"
            />
          </label>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Stock update SKU à¤µà¤° save à¤¹à¥‹à¤ˆà¤². MySQL connected à¤…à¤¸à¥‡à¤² à¤¤à¤° product inventory live update à¤¹à¥‹à¤ˆà¤².
        </p>
      </>
    );
  }

  return (
    <>
      <label className="grid gap-1 text-sm font-medium">
        {isHomepage ? "Section" : "Name / Title"}
        <input
          name="title"
          required
          defaultValue={initialData?.title || ""}
          className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
          placeholder={`${moduleTitle} name`}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          {isHomepage ? "Type" : "Code / SKU"}
          <input
            name="code"
            defaultValue={initialData?.code || ""}
            className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder={isHomepage ? "HERO, CUSTOM, CTA" : "Slug, SKU or CTA text"}
          />
        </label>
        <StatusField defaultValue={initialData?.status} />
      </div>
      {isHomepage ? (
        <label className="grid gap-1 text-sm font-medium">
          CTA
          <input
            name="shortDescription"
            defaultValue={initialData?.shortDescription || ""}
            className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="SHOP NOW"
          />
        </label>
      ) : null}
      <label className="grid gap-1 text-sm font-medium">
        {isHomepage ? "Frontend Content" : "Notes"}
        <textarea
          name="notes"
          defaultValue={initialData?.notes || ""}
          className="min-h-24 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
          placeholder={isHomepage ? "Section text or content source" : "Description, subtitle or image URL"}
        />
      </label>
    </>
  );
}

function BlogFormFields({ initialData }: { initialData?: ActionFormData | null }) {
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [imagePreview, setImagePreview] = useState(initialData?.imageUrl || "");
  const [uploadedFileName, setUploadedFileName] = useState("");

  useEffect(() => {
    setImageUrl(initialData?.imageUrl || "");
    setImagePreview(initialData?.imageUrl || "");
    setUploadedFileName("");
  }, [initialData]);

  const uploadBlogImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    const uploadData = new FormData();
    uploadData.append("images", file);
    const response = await fetch("/api/admin/upload-product-image", {
      method: "POST",
      body: uploadData,
    });
    const payload = (await response.json()) as { urls?: string[]; error?: string };
    if (!response.ok || !payload.urls?.[0]) {
      toast.error(payload.error || "Could not upload blog image.");
      return;
    }
    setImageUrl(payload.urls[0]);
    setImagePreview(localPreview);
    setUploadedFileName(file.name);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
          Blog Title
          <input
            name="title"
            required
            defaultValue={initialData?.title || ""}
            className="admin-input"
            placeholder="Understanding Your Menstrual Cycle"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Slug
          <input
            name="slug"
            defaultValue={initialData?.slug || initialData?.code || ""}
            className="admin-input"
            placeholder="understanding-your-menstrual-cycle"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Category
          <input
            name="category"
            defaultValue={initialData?.category || ""}
            className="admin-input"
            placeholder="Period Guide"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Author
          <input
            name="author"
            defaultValue={initialData?.author || "SheRise Team"}
            className="admin-input"
            placeholder="SheRise Team"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Published Date
          <input
            name="publishedDate"
            type="date"
            defaultValue={dateInputValue(initialData?.publishedDate)}
            className="admin-input"
          />
        </label>
        <StatusField defaultValue={initialData?.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="border border-[#eadbd2] bg-[#fffaf6] p-4">
          <p className="text-sm font-bold">Blog Image</p>
          <div className="mt-3 grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-[#d8c7bd] bg-white">
            {imagePreview ? (
              <img src={imagePreview} alt="Blog preview" className="h-full w-full object-cover" />
            ) : (
              <div className="grid justify-items-center gap-2 text-muted-foreground">
                <ImagePlus className="size-9" />
                <span className="text-xs">Preview</span>
              </div>
            )}
          </div>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Image URL
            <input
              name="imageUrl"
              value={imageUrl}
              className="admin-input"
              placeholder="/uploads/products/blog-image.jpg"
              onChange={(event) => {
                setImageUrl(event.target.value);
                setImagePreview(event.target.value);
              }}
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-medium">
            Upload Image
            <span className="inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-[#d8c7bd] bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-cream">
              <Upload className="size-4" />
              Choose image
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                void uploadBlogImage(event.target.files);
              }}
            />
            <span className="text-xs font-normal text-muted-foreground">
              {uploadedFileName || "No file chosen"}
            </span>
          </label>
        </div>

        <div className="grid content-start gap-4">
          <label className="grid gap-1 text-sm font-medium">
            Short Excerpt
            <textarea
              name="notes"
              defaultValue={initialData?.notes || initialData?.shortDescription || ""}
              className="min-h-24 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
              placeholder="A short preview shown on the blog card."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Blog Content
            <textarea
              name="description"
              defaultValue={initialData?.description || ""}
              className="min-h-40 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
              placeholder="Write full blog content here."
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Meta Title
          <input name="metaTitle" defaultValue={initialData?.metaTitle || ""} className="admin-input" placeholder="SEO title" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Meta Keywords
          <input name="metaKeywords" defaultValue={initialData?.metaKeywords || ""} className="admin-input" placeholder="period care, hygiene" />
        </label>
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
          Meta Description
          <textarea
            name="metaDescription"
            defaultValue={initialData?.metaDescription || ""}
            className="min-h-20 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="SEO description for this blog."
          />
        </label>
      </div>
    </div>
  );
}

function ProductFormFields({
  initialData,
  imagePreview,
  setImagePreview,
}: {
  initialData?: ActionFormData | null;
  imagePreview: string;
  setImagePreview: (value: string) => void;
}) {
  const selectedFlow = new Set((initialData?.flow || "").split(",").map((item) => item.trim().toUpperCase()));
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; preview: string; name: string }>>([]);
  const orderedGalleryImages = [
    ...galleryImages.filter((item) => item.url === imageUrl),
    ...galleryImages.filter((item) => item.url !== imageUrl),
  ];

  useEffect(() => {
    const nextImageUrl = productImagePath(initialData?.imageUrl || "");
    setImageUrl(nextImageUrl);
    setImagePreview(nextImageUrl);
    setGalleryImages(nextImageUrl ? [{ url: nextImageUrl, preview: nextImageUrl, name: basenameFromPath(nextImageUrl) }] : []);
    setUploadedFileName("");
  }, [initialData, setImagePreview]);

  const setPrimaryImage = (url: string, preview = url) => {
    const normalizedUrl = productImagePath(url);
    setImageUrl(normalizedUrl);
    setImagePreview(preview || normalizedUrl);
  };

  const addGalleryFiles = async (files: FileList | null, options: { makePrimary?: boolean } = {}) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    const localPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    const uploadData = new FormData();
    selectedFiles.forEach((file) => uploadData.append("images", file));
    const response = await fetch("/api/admin/upload-product-image", {
      method: "POST",
      body: uploadData,
    });
    const payload = (await response.json()) as { urls?: string[]; error?: string };
    if (!response.ok || !payload.urls?.length) {
      toast.error(payload.error || "Could not upload image.");
      return;
    }
    const nextImages = payload.urls.map((url, index) => ({
      url,
      preview: localPreviews[index] || url,
      name: selectedFiles[index]?.name || basenameFromPath(url),
    }));
    setGalleryImages((current) => {
      const merged = [...current, ...nextImages];
      const unique = merged.filter((item, index, items) => items.findIndex((entry) => entry.url === item.url) === index);
      return unique;
    });
    setUploadedFileName(nextImages.length === 1 ? nextImages[0]!.name : `${nextImages.length} images selected`);
    if (options.makePrimary || !imageUrl) setPrimaryImage(nextImages[0]!.url, nextImages[0]!.preview);
  };

  const removeGalleryImage = (url: string) => {
    setGalleryImages((current) => {
      const next = current.filter((item) => item.url !== url);
      if (imageUrl === url) {
        const replacement = next[0];
        setPrimaryImage(replacement?.url || "", replacement?.preview || "");
      }
      return next;
    });
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Product Name
            <input
              name="title"
              required
              defaultValue={initialData?.title || ""}
              className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
              placeholder="SheRise 20 Count Organic Sanitary Pads"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Slug
            <input
              name="slug"
              defaultValue={initialData?.slug || ""}
              className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
              placeholder="sherise-20-count-organic-sanitary-pads"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            SKU
            <input
              name="sku"
              defaultValue={initialData?.sku || ""}
              className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 uppercase outline-none focus:border-brand-coral"
              placeholder="SR-ANION-20"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Category
            <select
              name="category"
              defaultValue={initialData?.category || "Sanitary Pads"}
              className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            >
              <option>Sanitary Pads</option>
              <option>Period Care</option>
              <option>Day Pads</option>
              <option>Night / Overnight Pads</option>
              <option>Combo Packs</option>
            </select>
          </label>
          <StatusField defaultValue={initialData?.status} includeOutOfStock />
        </div>

        <label className="grid gap-1 text-sm font-medium">
          Short Description
          <input
            name="shortDescription"
            defaultValue={initialData?.shortDescription || ""}
            className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="Extended coverage for night-time comfort."
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Full Description
          <textarea
            name="description"
            defaultValue={initialData?.description || ""}
            className="min-h-28 border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
            placeholder="Product overview shown on the product detail page."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-medium">
            MRP
            <input name="mrp" type="number" min="0" step="0.01" defaultValue={initialData?.mrp || ""} className="admin-input" placeholder="270" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Selling Price
            <input name="sellingPrice" type="number" min="0" step="0.01" defaultValue={initialData?.sellingPrice || ""} className="admin-input" placeholder="219" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            GST %
            <input name="gstPercent" type="number" min="0" step="0.01" defaultValue="0" className="admin-input" placeholder="0" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Stock
            <input name="stock" type="number" min="0" defaultValue={initialData?.stock || ""} className="admin-input" placeholder="25" />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Pack Quantity
            <input name="packQuantity" defaultValue={initialData?.packQuantity || ""} className="admin-input" placeholder="Pack of 14" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Sizes
            <input name="sizes" defaultValue={initialData?.sizes || ""} className="admin-input" placeholder="XL, XXL, XXXL" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Product Dimensions
            <input name="productDimensions" defaultValue={initialData?.productDimensions || ""} className="admin-input" placeholder="12 Regular + 8 XXL, total 20 count" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Pad Length
            <input name="padLength" defaultValue={initialData?.padLength || ""} className="admin-input" placeholder="Regular 290 mm, XXL 320 mm" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Low Stock Alert
            <input name="lowStockThreshold" type="number" min="1" defaultValue={initialData?.lowStockThreshold || ""} className="admin-input" placeholder="5" />
          </label>
        </div>

        <fieldset className="border border-[#eadbd2] bg-[#fffaf6] p-4">
          <legend className="px-1 text-sm font-bold">Flow Type</legend>
          <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {["LIGHT", "MEDIUM", "HEAVY", "OVERNIGHT"].map((flow) => (
              <label key={flow} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <input name="flow" type="checkbox" value={flow} defaultChecked={selectedFlow.has(flow)} />
                {flow}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Front Pack Content
            <textarea
              name="frontPackContent"
              defaultValue={initialData?.frontPackContent || ""}
              className="admin-textarea"
              placeholder="Organic Sanitary Pads With Anion Strip&#10;12 COUNT Regular - 290 mm&#10;8 COUNT XXL - 320 mm&#10;TOTAL 20 COUNT&#10;With Disposable Bag"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Brand Message
            <textarea
              name="brandMessage"
              defaultValue={initialData?.brandMessage || ""}
              className="admin-textarea"
              placeholder="With every cycle, She Releases, Renews, and Rises..."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Anion Strip Packaging Notes
            <textarea
              name="anionStripNotes"
              defaultValue={initialData?.anionStripNotes || ""}
              className="admin-textarea"
              placeholder="Packaging text only. Avoid publishing health claims unless legally verified."
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Features
            <textarea name="features" defaultValue={initialData?.features || ""} className="admin-textarea" placeholder="One feature per line or comma separated" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Materials
            <textarea name="materials" defaultValue={initialData?.materials || ""} className="admin-textarea" placeholder="Cotton soft top sheet, leak guard..." />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Usage Instructions
            <textarea name="usageInstructions" defaultValue={initialData?.usageInstructions || ""} className="admin-textarea" placeholder="Remove wrapper, place securely..." />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Disposal Instructions
            <textarea name="disposalInstructions" defaultValue={initialData?.disposalInstructions || ""} className="admin-textarea" placeholder="Wrap and dispose responsibly..." />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium">
          Safety Information
          <textarea name="safetyInformation" defaultValue={initialData?.safetyInformation || ""} className="admin-textarea" placeholder="Safety notes shown on product page" />
        </label>

        <fieldset className="grid gap-4 border border-[#eadbd2] bg-[#fffaf6] p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold">Manufacturer, Storage & Pack Details</legend>
          <label className="grid gap-1 text-sm font-medium">
            Storage Instruction
            <input name="storageInstruction" defaultValue={initialData?.storageInstruction || ""} className="admin-input" placeholder="Store in a clean, dry and sealed place." />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Best Before / Shelf Life
            <input name="shelfLife" defaultValue={initialData?.shelfLife || ""} className="admin-input" placeholder="36 Months from DOM" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Manufactured By
            <input name="manufacturerDetails" defaultValue={initialData?.manufacturerDetails || ""} className="admin-input" placeholder="Kollisto Hygiene Pvt Ltd" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Marketed By
            <input name="marketerDetails" defaultValue={initialData?.marketerDetails || ""} className="admin-input" placeholder="S3 Enterprises, Prabhadevi, Mumbai 400 013" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Contact
            <input name="productContact" defaultValue={initialData?.productContact || ""} className="admin-input" placeholder="95942 41666" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Product Email
            <input name="productEmail" type="email" defaultValue={initialData?.productEmail || ""} className="admin-input" placeholder="hellosherise.in@gmail.com" />
          </label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Product Website
            <input name="productWebsite" defaultValue={initialData?.productWebsite || ""} className="admin-input" placeholder="hellosherise.com" />
          </label>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            SEO Title
            <input name="metaTitle" defaultValue={initialData?.metaTitle || ""} className="admin-input" placeholder="Buy SheRise 20 Count Organic Sanitary Pads" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            SEO Keywords
            <input name="metaKeywords" defaultValue={initialData?.metaKeywords || ""} className="admin-input" placeholder="sanitary pads, overnight pads" />
          </label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            SEO Description
            <input name="metaDescription" defaultValue={initialData?.metaDescription || ""} className="admin-input" placeholder="Short search result description" />
          </label>
        </div>
      </div>

      <aside className="grid content-start gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <div className="border border-[#eadbd2] bg-[#fffaf6] p-4">
          <p className="text-sm font-bold">Product Image</p>
          <div className="mt-3 grid aspect-square place-items-center overflow-hidden border border-dashed border-[#d8c7bd] bg-white">
            {imagePreview ? (
              <img src={imagePreview} alt="Product preview" className="h-full w-full object-cover" />
            ) : (
              <div className="grid justify-items-center gap-2 text-muted-foreground">
                <ImagePlus className="size-9" />
                <span className="text-xs">Preview</span>
              </div>
            )}
          </div>
          <label className="mt-3 grid gap-1 text-sm font-medium">
            Image URL
            <input
              name="imageUrl"
              value={imageUrl}
              className="admin-input"
              placeholder="/uploads/products/pad.jpg"
              onChange={(event) => {
                const nextValue = productImagePath(event.target.value);
                setPrimaryImage(nextValue);
                setGalleryImages((current) =>
                  nextValue && !current.some((item) => item.url === nextValue)
                    ? [{ url: nextValue, preview: nextValue, name: basenameFromPath(nextValue) }, ...current]
                    : current,
                );
              }}
            />
          </label>
          <label className="mt-3 grid gap-2 text-sm font-medium">
            Upload Image
            <span className="inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-[#d8c7bd] bg-white px-3 py-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-cream">
              <Upload className="size-4" />
              Choose image
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addGalleryFiles(event.target.files, { makePrimary: true });
              }}
            />
            <span className="text-xs font-normal text-muted-foreground">
              {uploadedFileName || "No file chosen"}
            </span>
          </label>
          <input type="hidden" name="imageUrls" value={orderedGalleryImages.map((item) => item.url).join("\n")} />
        </div>

        <div className="grid content-start gap-4">
          <div className="border border-[#eadbd2] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold">More Product Images</p>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 border border-[#d8c7bd] bg-[#fffaf6] px-3 py-2 text-xs font-semibold text-brand-navy transition-colors hover:bg-brand-cream">
                <Upload className="size-4" />
                Choose images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addGalleryFiles(event.target.files);
                  }}
                />
              </label>
            </div>
            <div className="mt-3 grid min-h-[180px] grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {orderedGalleryImages.length ? (
                orderedGalleryImages.map((item, index) => (
                  <button
                    key={item.url}
                    type="button"
                    className={`group relative aspect-square overflow-hidden border bg-[#fffaf6] ${
                      item.url === imageUrl ? "border-brand-navy" : "border-[#eadbd2]"
                    }`}
                    onClick={() => setPrimaryImage(item.url, item.preview)}
                  >
                    <img src={item.preview} alt={`${item.name} preview`} className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-brand-navy">
                      {item.url === imageUrl ? "Main" : index + 1}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="absolute right-1 top-1 grid size-7 place-items-center bg-white/90 text-red-700 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeGalleryImage(item.url);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        event.stopPropagation();
                        removeGalleryImage(item.url);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </span>
                  </button>
                ))
              ) : (
                <label className="col-span-full grid min-h-[180px] cursor-pointer place-items-center border border-dashed border-[#d8c7bd] bg-[#fffaf6] text-sm text-muted-foreground transition-colors hover:bg-brand-cream">
                  <span className="grid justify-items-center gap-2">
                    <ImagePlus className="size-9" />
                    <span>Choose multiple images</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      void addGalleryFiles(event.target.files);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="border border-[#eadbd2] bg-white p-4">
            <p className="text-sm font-bold">Store Visibility</p>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input name="isFeatured" type="checkbox" defaultChecked={initialData?.isFeatured === "true" || initialData?.isFeatured === "1"} />
              Featured product
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input name="isBestseller" type="checkbox" defaultChecked={initialData?.isBestseller === "true" || initialData?.isBestseller === "1"} />
              Bestseller
            </label>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StatusField({
  defaultValue = "ACTIVE",
  includeOutOfStock = false,
}: {
  defaultValue?: string;
  includeOutOfStock?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      Status
      <select
        name="status"
        defaultValue={defaultValue}
        className="border border-[#e4d5cc] bg-[#fffaf6] px-3 py-2 outline-none focus:border-brand-coral"
      >
        <option>ACTIVE</option>
        <option>DRAFT</option>
        {includeOutOfStock ? <option>OUT OF STOCK</option> : null}
        <option>INACTIVE</option>
      </select>
    </label>
  );
}

function DataTable({
  columns,
  rows,
  onRowClick,
  renderActions,
}: {
  columns: string[];
  rows: string[][];
  onRowClick?: (row: string[]) => void;
  renderActions?: (row: string[]) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-[#eadbd2] text-xs uppercase text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column} className="py-3 pr-4">
                {column}
              </th>
            ))}
            {renderActions ? (
              <th className="sticky right-0 bg-white py-3 pr-4 text-right shadow-[-12px_0_16px_-18px_rgba(34,20,12,0.65)]">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadbd2]">
          {rows.map((row) => (
            <tr
              key={row.join("-")}
              className={onRowClick ? "cursor-pointer transition-colors hover:bg-brand-cream/70" : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`} className="py-4 pr-4">
                  {isStatus(cell) ? (
                    <StatusBadge tone={statusTone(cell)}>{cell}</StatusBadge>
                  ) : index === 0 ? (
                    <span className={onRowClick ? "font-semibold text-brand-navy underline-offset-4 hover:underline" : "font-semibold"}>
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
              {renderActions ? (
                <td className="sticky right-0 bg-white py-4 pr-4 shadow-[-12px_0_16px_-18px_rgba(34,20,12,0.65)]">
                  {renderActions(row)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewModerationDialog({
  review,
  open,
  onOpenChange,
  onStatusChange,
}: {
  review: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: "PENDING" | "APPROVED" | "REJECTED") => void;
}) {
  if (!review) return null;
  const [customer, product, text, status, orderId] = review;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#eadbd2] bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">Moderate Review</DialogTitle>
          <DialogDescription>
            Approve reviews to show them on the website homepage. Rejected reviews stay hidden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-[#eadbd2] bg-[#fffaf6] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Order {orderId}</p>
              <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
            </div>
            <p className="font-semibold text-brand-navy">{product}</p>
            <p className="mt-1 text-xs text-muted-foreground">Customer {customer}</p>
            <p className="mt-4 leading-6">{text}</p>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <Button variant="outline" className="bg-white" onClick={() => onStatusChange("PENDING")}>
            Keep Pending
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-white text-red-700" onClick={() => onStatusChange("REJECTED")}>
              Reject
            </Button>
            <Button onClick={() => onStatusChange("APPROVED")}>Approve & Show on Website</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PopupLeadDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!lead) return null;
  const [name, mobile, email, interestedIn, message, date, status] = lead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#eadbd2] bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">
            Enquiry Details
          </DialogTitle>
          <DialogDescription>
            Lead submitted from the website pop-up form.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 border border-[#eadbd2] bg-[#fffaf6] p-4 text-sm sm:grid-cols-2">
          <PreviewField label="Name" value={name} />
          <PreviewField label="Mobile" value={mobile} />
          <PreviewField label="Email" value={email} />
          <PreviewField label="Interested In" value={interestedIn} />
          <PreviewField label="Date" value={date} />
          <PreviewField label="Status" value={status} />
        </div>
        <div className="border border-[#eadbd2] bg-white p-4">
          <p className="text-xs font-bold uppercase text-muted-foreground">Message</p>
          <p className="mt-2 min-h-16 whitespace-pre-wrap leading-6 text-brand-navy">
            {message && message !== "-" ? message : "No message added."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-white" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewsletterSubscriberDialog({
  subscriber,
  open,
  onOpenChange,
}: {
  subscriber: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!subscriber) return null;
  const [email, source, subscribed, updated, status] = subscriber;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#eadbd2] bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">
            Newsletter Subscriber
          </DialogTitle>
          <DialogDescription>
            Email collected from the website JOIN US form.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 border border-[#eadbd2] bg-[#fffaf6] p-4 text-sm sm:grid-cols-2">
          <PreviewField label="Email" value={email} />
          <PreviewField label="Source" value={source} />
          <PreviewField label="Subscribed" value={subscribed} />
          <PreviewField label="Updated" value={updated} />
          <PreviewField label="Status" value={status} />
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-white" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderPreviewDialog({
  order,
  open,
  onOpenChange,
  onStatusChange,
}: {
  order: string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: "preview" | "packed" | "shipped" | "delivered" | "cancelled") => void;
}) {
  if (!order) return null;
  const status = order[5] || "PREVIEW";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#eadbd2] bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brand-navy">
            Order Preview
          </DialogTitle>
          <DialogDescription>
            Update this frontend account order status. Customer tracking will reflect this change.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 border border-[#eadbd2] bg-[#fffaf6] p-4 text-sm sm:grid-cols-2">
          <PreviewField label="Order" value={order[0]} />
          <PreviewField label="Customer" value={order[1]} />
          <PreviewField label="Products" value={order[2]} />
          <PreviewField label="Amount" value={order[3]} />
          <PreviewField label="Payment" value={order[4]} />
          <PreviewField label="Current Status" value={status} />
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">
            Tracking Status
          </p>
          <div className="grid gap-2 sm:grid-cols-5">
            {(["preview", "packed", "shipped", "delivered", "cancelled"] as const).map((item) => (
              <Button
                key={item}
                type="button"
                variant={status.toLowerCase() === item ? "default" : "outline"}
                className={status.toLowerCase() === item ? "" : "bg-white"}
                onClick={() => onStatusChange(item)}
              >
                {orderStatusLabel(item)}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="bg-white" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-brand-navy">{value || "-"}</p>
    </div>
  );
}

function orderStatusLabel(status: "preview" | "packed" | "shipped" | "delivered" | "cancelled") {
  switch (status) {
    case "preview":
      return "Order placed";
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

function MetricLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between border border-[#eadbd2] bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`size-3 ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-[#eadbd2]">
        <div className="h-full bg-brand-coral" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap px-2.5 py-1 text-[10px] font-bold uppercase ${
        tone === "danger"
          ? "bg-red-100 text-red-800"
          : tone === "warn"
            ? "bg-amber-100 text-amber-800"
            : "bg-emerald-100 text-emerald-800"
      }`}
    >
      {children}
    </span>
  );
}

function CompactRow({
  title,
  meta,
  badge,
  tone,
}: {
  title: string;
  meta: string;
  badge: string;
  tone: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border border-[#eadbd2] bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold">{title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <StatusBadge tone={tone}>{badge}</StatusBadge>
    </div>
  );
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isStatus(value: string) {
  return [
    "ACTIVE",
    "NEW",
    "LOW STOCK",
    "OUT OF STOCK",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "PREVIEW",
    "CANCELLED",
    "PENDING",
    "APPROVED",
    "REJECTED",
    "INACTIVE",
    "CONTACTED",
  ].includes(value);
}

function statusTone(value: string): Tone {
  if (["OUT OF STOCK", "REJECTED"].includes(value)) return "danger";
  if (["NEW", "LOW STOCK", "PENDING", "PROCESSING", "INACTIVE"].includes(value)) return "warn";
  return "ok";
}

function downloadCsv(title: string, columns: string[], rows: string[][]) {
  const csv = [columns, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replaceAll(" ", "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
