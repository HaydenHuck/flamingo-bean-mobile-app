import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  ApiError,
  createAdminProduct,
  fetchAdminOrder,
  fetchAdminOrders,
  fetchAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminProductActive,
} from "./api";
import { useAuth } from "./auth";
import { API_BASE_URL } from "./config";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  Product,
  ProductPayload,
  StaffOrderStatus,
} from "./types";

const STAFF_ORDER_STATUSES: StaffOrderStatus[] = ["received", "preparing", "ready", "completed", "canceled"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function App() {
  const auth = useAuth();
  const route = useHashRoute();

  if (auth.isLoading) {
    return <FullPageState title="Checking staff session" message="Connecting to Flamingo Bean admin..." />;
  }

  if (!auth.isAuthenticated || !auth.csrfToken) {
    return <LoginPage />;
  }

  return (
    <AdminLayout route={route}>
      <RouteContent route={route} csrfToken={auth.csrfToken} />
    </AdminLayout>
  );
}

function RouteContent({ route, csrfToken }: { route: AdminRoute; csrfToken: string }) {
  if (route.name === "orders") {
    return <OrdersPage />;
  }

  if (route.name === "order-detail") {
    return <OrderDetailPage csrfToken={csrfToken} orderId={route.orderId} />;
  }

  if (route.name === "products") {
    return <ProductsPage csrfToken={csrfToken} />;
  }

  if (route.name === "product-new") {
    return <ProductFormPage csrfToken={csrfToken} />;
  }

  if (route.name === "product-edit") {
    return <ProductFormPage csrfToken={csrfToken} productId={route.productId} />;
  }

  return <DashboardPage />;
}

type AdminRoute =
  | { name: "dashboard" }
  | { name: "orders" }
  | { name: "order-detail"; orderId: string }
  | { name: "products" }
  | { name: "product-new" }
  | { name: "product-edit"; productId: number };

function useHashRoute(): AdminRoute {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return parseRoute(hash);
}

function parseRoute(hash: string): AdminRoute {
  const path = hash.replace(/^#\/?/, "");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "orders" && parts[1]) {
    return { name: "order-detail", orderId: parts[1] };
  }

  if (parts[0] === "orders") {
    return { name: "orders" };
  }

  if (parts[0] === "products" && parts[1] === "new") {
    return { name: "product-new" };
  }

  if (parts[0] === "products" && parts[1] && Number.isFinite(Number(parts[1]))) {
    return { name: "product-edit", productId: Number(parts[1]) };
  }

  if (parts[0] === "products") {
    return { name: "products" };
  }

  return { name: "dashboard" };
}

function navigate(path: string) {
  window.location.hash = path;
}

function AdminLayout({ children, route }: { children: ReactNode; route: AdminRoute }) {
  const { adminUser, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">FB</div>
          <div>
            <p className="eyebrow">Flamingo Bean</p>
            <h1>Staff Dashboard</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Admin navigation">
          <NavLink active={route.name === "dashboard"} href="#/">
            Dashboard
          </NavLink>
          <NavLink active={route.name === "orders" || route.name === "order-detail"} href="#/orders">
            Orders
          </NavLink>
          <NavLink active={route.name.startsWith("product")} href="#/products">
            Products
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p className="muted">Signed in as</p>
          <strong>{adminUser?.email}</strong>
          <button className="button secondary full-width" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-panel">{children}</main>
    </div>
  );
}

function NavLink({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <a className={`nav-link ${active ? "active" : ""}`} href={href}>
      {children}
    </a>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      await login(email, password);
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? `Unable to sign in: ${loginError.message}`
          : "Unable to sign in. Check your admin email and password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark large">FB</div>
        <p className="eyebrow">Flamingo Bean</p>
        <h1>Admin Login</h1>
        <p className="muted">Sign in to manage orders, products, and cafe operations.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="notice error">{error}</div> : null}

          <button className="button primary full-width" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

function DashboardPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      setIsLoading(true);
      setError(null);
      const [orderList, productList] = await Promise.all([fetchAdminOrders(), fetchAdminProducts()]);
      setOrders(orderList);
      setProducts(productList);
    } catch {
      setError("Unable to load dashboard summary.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const pendingOrders = orders.filter((order) => order.payment_status === "pending_payment").length;
  const readyOrders = orders.filter((order) => order.status === "ready").length;
  const activeProducts = products.filter((product) => product.active).length;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`Connected to ${API_BASE_URL}. Review the cafe queue and menu health.`}
      />

      {isLoading ? <StateCard title="Loading dashboard..." /> : null}
      {error ? <StateCard action={loadDashboard} actionLabel="Retry" tone="error" title={error} /> : null}

      {!isLoading && !error ? (
        <>
          <div className="summary-grid">
            <SummaryCard label="Total orders" value={orders.length} />
            <SummaryCard label="Pending payment" value={pendingOrders} tone="warning" />
            <SummaryCard label="Ready orders" value={readyOrders} tone="success" />
            <SummaryCard label="Active products" value={activeProducts} />
          </div>

          <div className="quick-grid">
            <button className="quick-card" type="button" onClick={() => navigate("#/orders")}>
              <span>Orders</span>
              <strong>Manage order queue</strong>
            </button>
            <button className="quick-card" type="button" onClick={() => navigate("#/products")}>
              <span>Products</span>
              <strong>Edit the coffee menu</strong>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      setIsLoading(true);
      setError(null);
      setOrders(await fetchAdminOrders());
    } catch {
      setError("Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Orders" title="Order Queue" description="Review payments, fulfillment, pickup, and shipping status." />

      {isLoading ? <StateCard title="Loading orders..." /> : null}
      {error ? <StateCard action={loadOrders} actionLabel="Retry" tone="error" title={error} /> : null}

      {!isLoading && !error ? (
        <div className="table-card">
          {orders.length === 0 ? (
            <StateCard title="No orders yet." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Fulfillment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} onClick={() => navigate(`#/orders/${encodeURIComponent(order.order_id)}`)}>
                    <td className="strong">{order.order_id}</td>
                    <td>{order.customer_name}</td>
                    <td>
                      <StatusBadge value={order.status} />
                    </td>
                    <td>
                      <StatusBadge value={order.payment_status} />
                    </td>
                    <td>{currencyFormatter.format(order.total)}</td>
                    <td>
                      <StatusBadge value={order.fulfillment_type} />
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  );
}

function OrderDetailPage({ csrfToken, orderId }: { csrfToken: string; orderId: string }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<StaffOrderStatus | null>(null);

  async function loadOrder() {
    try {
      setIsLoading(true);
      setError(null);
      setOrder(await fetchAdminOrder(orderId));
    } catch {
      setError("Unable to load order detail.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusUpdate(status: StaffOrderStatus) {
    if (!order || updatingStatus) {
      return;
    }

    try {
      setUpdatingStatus(status);
      setOrder(await updateAdminOrderStatus(order.order_id, status, csrfToken));
    } catch {
      setError("Unable to update order status.");
    } finally {
      setUpdatingStatus(null);
    }
  }

  useEffect(() => {
    void loadOrder();
  }, [orderId]);

  return (
    <section className="page-stack">
      <PageHeader
        action={<button className="button secondary" type="button" onClick={() => navigate("#/orders")}>Back to orders</button>}
        eyebrow="Order detail"
        title={orderId}
        description="Review customer details, items, payment, and fulfillment status."
      />

      {isLoading ? <StateCard title="Loading order..." /> : null}
      {error ? <StateCard action={loadOrder} actionLabel="Retry" tone="error" title={error} /> : null}

      {!isLoading && !error && order ? (
        <>
          <div className="detail-grid">
            <section className="panel">
              <h2>Customer</h2>
              <DetailRow label="Name" value={order.customer_name} />
              <DetailRow label="Email" value={order.customer_email} />
              {order.customer_account_email ? (
                <DetailRow label="Account email" value={order.customer_account_email} />
              ) : null}
              <DetailRow label="Fulfillment" value={formatLabel(order.fulfillment_type)} />
              <DetailRow label="Created" value={formatDate(order.created_at)} />
            </section>

            <section className="panel">
              <h2>Fulfillment</h2>
              {order.fulfillment_type === "pickup" ? (
                <>
                  <DetailRow label="Type" value="Pickup in store" />
                  <DetailRow label="Pickup time" value={order.pickup_time || "No pickup time requested"} />
                </>
              ) : (
                <>
                  <DetailRow label="Type" value="Shipping" />
                  <DetailRow label="Ship to" value={formatShippingAddress(order)} />
                </>
              )}
            </section>

            <section className="panel">
              <h2>Status</h2>
              <DetailRow label="Order" value={formatLabel(order.status)} />
              <DetailRow label="Payment" value={formatLabel(order.payment_status)} />
              <div className="status-actions">
                {STAFF_ORDER_STATUSES.map((status) => (
                  <button
                    className={`button ${order.status === status ? "primary" : "secondary"}`}
                    disabled={updatingStatus !== null || order.status === status}
                    key={status}
                    type="button"
                    onClick={() => void handleStatusUpdate(status)}
                  >
                    {updatingStatus === status ? "Updating..." : formatLabel(status)}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="panel">
            <h2>Items</h2>
            <div className="item-list">
              {order.items.map((item) => (
                <div className="item-row" key={`${item.product_id}-${item.name}-${item.size}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.size} x {item.quantity} at {currencyFormatter.format(item.price)}
                    </span>
                  </div>
                  <strong>{currencyFormatter.format(item.line_total)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel totals-panel">
            <DetailRow label="Subtotal" value={currencyFormatter.format(order.subtotal)} />
            <DetailRow label="Tax" value={currencyFormatter.format(order.tax)} />
            <DetailRow label="Shipping" value={currencyFormatter.format(order.shipping_fee)} />
            <DetailRow label="Total" value={currencyFormatter.format(order.total)} strong />
          </section>
        </>
      ) : null}
    </section>
  );
}

function ProductsPage({ csrfToken }: { csrfToken: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);

  async function loadProducts() {
    try {
      setIsLoading(true);
      setError(null);
      setProducts(await fetchAdminProducts());
    } catch {
      setError("Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle(product: Product) {
    try {
      setUpdatingProductId(product.id);
      const updatedProduct = await updateAdminProductActive(product.id, !product.active, csrfToken);
      setProducts((current) => current.map((item) => (item.id === updatedProduct.id ? updatedProduct : item)));
    } catch {
      setError("Unable to update product availability.");
    } finally {
      setUpdatingProductId(null);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  return (
    <section className="page-stack">
      <PageHeader
        action={<button className="button primary" type="button" onClick={() => navigate("#/products/new")}>Add product</button>}
        eyebrow="Products"
        title="Menu Management"
        description="Add, edit, enable, or disable customer menu items."
      />

      {isLoading ? <StateCard title="Loading products..." /> : null}
      {error ? <StateCard action={loadProducts} actionLabel="Retry" tone="error" title={error} /> : null}

      {!isLoading && !error ? (
        <div className="product-grid">
          {products.length === 0 ? <StateCard title="No products yet." /> : null}
          {products.map((product) => (
            <article className={`product-card ${product.active ? "" : "inactive"}`} key={product.id}>
              <div className="product-card-header">
                <div>
                  <p className="eyebrow">{product.category}</p>
                  <h2>{product.name}</h2>
                </div>
                <StatusBadge value={product.active ? "active" : "inactive"} />
              </div>
              <p>{product.description}</p>
              <div className="product-meta">
                <span>{product.size}</span>
                <span>{currencyFormatter.format(product.price)}</span>
                <span>{product.roast_level || "No roast set"}</span>
                <span>{product.origin || "No origin set"}</span>
              </div>
              <div className="card-actions">
                <button className="button secondary" type="button" onClick={() => navigate(`#/products/${product.id}`)}>
                  Edit
                </button>
                <button
                  className="button secondary"
                  disabled={updatingProductId === product.id}
                  type="button"
                  onClick={() => void handleToggle(product)}
                >
                  {updatingProductId === product.id ? "Updating..." : product.active ? "Disable" : "Enable"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductFormPage({ csrfToken, productId }: { csrfToken: string; productId?: number }) {
  const isEditing = typeof productId === "number";
  const [isLoading, setIsLoading] = useState(Boolean(productId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>({
    active: true,
    category: "",
    description: "",
    image_url: "",
    name: "",
    origin: "",
    price: "",
    roast_level: "",
    size: "",
  });

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const products = await fetchAdminProducts();
        const product = products.find((item) => item.id === productId);

        if (!product) {
          setError("Product not found.");
          return;
        }

        setForm({
          active: product.active,
          category: product.category,
          description: product.description,
          image_url: product.image_url,
          name: product.name,
          origin: product.origin,
          price: String(product.price),
          roast_level: product.roast_level,
          size: product.size,
        });
      } catch {
        setError("Unable to load product.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProduct();
  }, [productId]);

  const canSave =
    form.name.trim().length > 0 &&
    form.description.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.size.trim().length > 0 &&
    Number.isFinite(Number(form.price)) &&
    Number(form.price) >= 0 &&
    !isSaving;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canSave) {
      setError("Fill out required fields and enter a valid price.");
      return;
    }

    const payload: ProductPayload = {
      active: form.active,
      category: form.category.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim(),
      name: form.name.trim(),
      origin: form.origin.trim(),
      price: Number(form.price),
      roast_level: form.roast_level.trim(),
      size: form.size.trim(),
    };

    try {
      setIsSaving(true);
      setError(null);

      if (productId) {
        await updateAdminProduct(productId, payload, csrfToken);
      } else {
        await createAdminProduct(payload, csrfToken);
      }

      navigate("#/products");
    } catch {
      setError("Unable to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        action={<button className="button secondary" type="button" onClick={() => navigate("#/products")}>Back to products</button>}
        eyebrow={isEditing ? "Edit product" : "New product"}
        title={isEditing ? "Edit Menu Item" : "Add Menu Item"}
        description="Keep customer-facing menu details clear and current."
      />

      {isLoading ? <StateCard title="Loading product..." /> : null}

      {!isLoading ? (
        <form className="panel product-form" onSubmit={handleSubmit}>
          <FormField label="Name" name="name" value={form.name} onChange={setFormValue} />
          <FormField label="Description" name="description" textarea value={form.description} onChange={setFormValue} />
          <div className="form-grid">
            <FormField label="Category" name="category" value={form.category} onChange={setFormValue} />
            <FormField label="Price" name="price" type="number" value={form.price} onChange={setFormValue} />
            <FormField label="Size" name="size" value={form.size} onChange={setFormValue} />
            <FormField label="Roast level" name="roast_level" value={form.roast_level} onChange={setFormValue} />
            <FormField label="Origin" name="origin" value={form.origin} onChange={setFormValue} />
            <FormField label="Image URL" name="image_url" value={form.image_url} onChange={setFormValue} />
          </div>

          <label className="checkbox-row">
            <input
              checked={form.active}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Active in customer menu
          </label>

          {error ? <div className="notice error">{error}</div> : null}

          <div className="form-actions">
            <button className="button primary" disabled={!canSave} type="submit">
              {isSaving ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );

  function setFormValue(name: ProductTextFieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }
}

interface ProductFormState {
  active: boolean;
  category: string;
  description: string;
  image_url: string;
  name: string;
  origin: string;
  price: string;
  roast_level: string;
  size: string;
}

type ProductTextFieldName = Exclude<keyof ProductFormState, "active">;

function FormField({
  label,
  name,
  onChange,
  textarea = false,
  type = "text",
  value,
}: {
  label: string;
  name: ProductTextFieldName;
  onChange: (name: ProductTextFieldName, value: string) => void;
  textarea?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label>
      {label}
      {textarea ? (
        <textarea rows={4} value={value} onChange={(event) => onChange(name, event.target.value)} />
      ) : (
        <input step={type === "number" ? "0.01" : undefined} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} />
      )}
    </label>
  );
}

function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="page-action">{action}</div> : null}
    </header>
  );
}

function SummaryCard({ label, tone, value }: { label: string; tone?: "warning" | "success"; value: number }) {
  return (
    <article className={`summary-card ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${value}`}>{formatLabel(value)}</span>;
}

function DetailRow({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <div className={`detail-row ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StateCard({
  action,
  actionLabel,
  title,
  tone = "neutral",
}: {
  action?: () => void;
  actionLabel?: string;
  title: string;
  tone?: "neutral" | "error";
}) {
  return (
    <div className={`state-card ${tone}`}>
      <p>{title}</p>
      {action ? (
        <button className="button secondary" type="button" onClick={action}>
          {actionLabel ?? "Try again"}
        </button>
      ) : null}
    </div>
  );
}

function FullPageState({ message, title }: { message: string; title: string }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark large">FB</div>
        <h1>{title}</h1>
        <p className="muted">{message}</p>
      </section>
    </main>
  );
}

function formatShippingAddress(order: AdminOrderDetail) {
  const cityLine = [order.shipping_city, order.shipping_state, order.shipping_zip].filter(Boolean).join(", ");
  const addressParts = [
    order.shipping_name,
    order.shipping_address_line1,
    order.shipping_address_line2,
    cityLine,
    order.shipping_country,
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join("\n") : "No shipping address saved";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
