
// ==========================================
// TECHSTORE — SUPABASE CONFIG
// ==========================================

const SUPABASE_URL = "https://ibvwbvidcpkrmqrwmsmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_NHFXT55gi90ZqFfzZrJZHg_Gldyzbht";

if (!window.supabase) {
  throw new Error("Supabase library не подключена. Проверь CDN в index.html");
}

if (
  SUPABASE_KEY.includes("ВСТАВЬ") ||
  !SUPABASE_KEY.startsWith("sb_publishable_") ||
  !/^[\x00-\x7F]+$/.test(SUPABASE_KEY)
) {
  throw new Error("Вставь правильный Publishable Key в script.js");
}

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// HELPERS
// ==========================================

const $ = (id) => document.getElementById(id);

const money = (price) =>
  Number(price || 0).toLocaleString("ru-RU") + " сум";

const safe = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

function showModal(id) {
  const modal = $(id);
  if (modal) modal.style.display = "flex";
}

function hideModal(id) {
  const modal = $(id);
  if (modal) modal.style.display = "none";
}

function notify(message) {
  alert(message);
}

// ==========================================
// STATE
// ==========================================

let currentUser = null;
let isAdmin = false;
let products = [];
let cart = JSON.parse(localStorage.getItem("techstore_cart") || "[]");
let favorites = [];

function saveCart() {
  localStorage.setItem("techstore_cart", JSON.stringify(cart));
  renderCart();
}

// ==========================================
// AUTH
// ==========================================

async function register(email, password, name) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }
    }
  });

  if (error) throw error;

  if (data.session) {
    await updateUser();
    return "Регистрация успешна!";
  }

  return "Проверь почту для подтверждения регистрации.";
}

async function login(email, password) {
  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  await updateUser();
  return "Вы успешно вошли!";
}

async function logout() {
  const { error } = await db.auth.signOut();
  if (error) throw error;

  currentUser = null;
  isAdmin = false;
  favorites = [];
  await updateUser();
}

async function updateUser() {
  const { data } = await db.auth.getUser();
  currentUser = data.user || null;

  isAdmin = false;

  if (currentUser) {
    const { data: admin, error } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Ошибка проверки администратора:", error);
    } else {
      isAdmin = Boolean(admin);
    }

    await loadFavorites();
  }

  const loginButton = $("login-btn");
  if (loginButton) {
    loginButton.textContent = currentUser
      ? "Выйти"
      : "Войти";
  }

  const adminButton = $("admin-btn");
  if (adminButton) {
    adminButton.style.display = isAdmin ? "inline-flex" : "none";
  }
}

// ==========================================
// AUTH FORM
// ==========================================

$("auth-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("auth-email")?.value.trim();
  const password = $("auth-password")?.value;
  const name = $("auth-name")?.value.trim();
  const message = $("auth-message");

  try {
    const isRegister = $("auth-title")?.textContent
      ?.toLowerCase().includes("регистрация");

    const result = isRegister
      ? await register(email, password, name)
      : await login(email, password);

    if (message) message.textContent = result;

    await updateUser();
  } catch (error) {
    if (message) message.textContent = error.message;
  }
});

$("auth-switch")?.addEventListener("click", () => {
  const title = $("auth-title");
  const name = $("auth-name");
  const button = $("auth-submit");
  const message = $("auth-message");

  if (!title) return;

  const registerMode = title.textContent
    .toLowerCase().includes("регистрация");

  title.textContent = registerMode ? "Вход" : "Регистрация";

  if (name) name.style.display = registerMode ? "none" : "block";
  if (button) button.textContent = registerMode ? "Войти" : "Зарегистрироваться";
  if (message) message.textContent = "";
});

$("login-btn")?.addEventListener("click", async () => {
  if (currentUser) {
    if (confirm("Выйти из аккаунта?")) {
      try {
        await logout();
        notify("Вы вышли из аккаунта");
      } catch (error) {
        notify(error.message);
      }
    }
  } else if ($("auth-modal")) {
    showModal("auth-modal");
  } else {
    location.href = "index.html";
  }
});

// ==========================================
// PRODUCTS
// ==========================================

async function loadProducts() {
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Ошибка загрузки товаров:", error);
    const container = $("products");
    if (container) {
      container.innerHTML = "<p>Не удалось загрузить товары.</p>";
    }
    return;
  }

  products = data || [];
  renderProducts();
}

function renderProducts() {
  const container = $("products");
  if (!container) return;

  const search = $("search")?.value.toLowerCase() || "";
  const category = $("category-filter")?.value || "";

  const filtered = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search);
    const matchesCategory = !category || product.category === category;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    container.innerHTML = "<p>Товары не найдены.</p>";
    return;
  }

  container.innerHTML = filtered.map((product) => `
    <div class="product-card">
      <img src="${safe(product.image)}" alt="${safe(product.name)}">
      <h3>${safe(product.name)}</h3>
      <p>${money(product.price)}</p>

      <button onclick="addToCart('${safe(product.id)}')">
        В корзину
      </button>

      <button onclick="toggleFavorite('${safe(product.id)}')">
        ${favorites.includes(product.id) ? "★" : "☆"}
      </button>

      <a href="product.html?id=${encodeURIComponent(product.id)}">
        Подробнее
      </a>
    </div>
  `).join("");
}

$("search")?.addEventListener("input", renderProducts);
$("category-filter")?.addEventListener("change", renderProducts);

// ==========================================
// CART
// ==========================================

function addToCart(id) {
  const product = products.find((item) => item.id === id);

  if (!product) return;

  const existing = cart.find((item) => item.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity: 1
    });
  }

  saveCart();
  notify("Товар добавлен в корзину!");
}

function changeQuantity(id, amount) {
  const item = cart.find((product) => product.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter((product) => product.id !== id);
  }

  saveCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
}

function renderCart() {
  const container = $("cart-items");
  const totalElement = $("cart-total");

  if (!container) return;

  container.innerHTML = cart.length
    ? cart.map((item) => `
      <div class="cart-item">
        <span>${safe(item.name)}</span>
        <button onclick="changeQuantity('${safe(item.id)}', -1)">−</button>
        <span>${item.quantity}</span>
        <button onclick="changeQuantity('${safe(item.id)}', 1)">+</button>
        <span>${money(item.price * item.quantity)}</span>
        <button onclick="removeFromCart('${safe(item.id)}')">×</button>
      </div>
    `).join("")
    : "<p>Корзина пуста.</p>";

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (totalElement) totalElement.textContent = money(total);

  const count = $("cart-count");
  if (count) {
    count.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

$("cart-btn")?.addEventListener("click", () => {
  if ($("cart-modal")) showModal("cart-modal");
  else location.href = "index.html#catalog";
});

// ==========================================
// FAVORITES
// ==========================================

async function loadFavorites() {
  if (!currentUser) {
    favorites = [];
    renderProducts();
    return;
  }

  const { data, error } = await db
    .from("favorites")
    .select("product_id")
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Ошибка избранного:", error);
    return;
  }

  favorites = (data || []).map((item) => item.product_id);
  renderProducts();
}

async function toggleFavorite(id) {
  if (!currentUser) {
    notify("Сначала войдите в аккаунт.");
    return;
  }

  if (favorites.includes(id)) {
    const { error } = await db
      .from("favorites")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("product_id", id);

    if (error) return notify(error.message);

    favorites = favorites.filter((item) => item !== id);
  } else {
    const { error } = await db
      .from("favorites")
      .insert({
        user_id: currentUser.id,
        product_id: id
      });

    if (error) return notify(error.message);

    favorites.push(id);
  }

  renderProducts();
}

$("favorites-btn")?.addEventListener("click", async () => {
  if (!currentUser) return notify("Сначала войдите в аккаунт.");

  const container = $("favorites-items");
  if (container) {
    const items = products.filter((item) => favorites.includes(item.id));

    container.innerHTML = items.length
      ? items.map((item) => `
        <p>${safe(item.name)} — ${money(item.price)}</p>
      `).join("")
      : "<p>Избранное пусто.</p>";

    showModal("favorites-modal");
  }
});

// ==========================================
// CHECKOUT / ORDERS
// ==========================================

$("checkout-btn")?.addEventListener("click", () => {
  if (!currentUser) {
    notify("Войдите в аккаунт, чтобы оформить заказ.");
    return;
  }

  if (!cart.length) {
    notify("Корзина пуста.");
    return;
  }

  showModal("checkout-modal");
});

$("checkout-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || !cart.length) return;

  const customerName = $("customer-name")?.value.trim();
  const phone = $("customer-phone")?.value.trim();
  const address = $("customer-address")?.value.trim();

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const { error } = await db.from("orders").insert({
    user_id: currentUser.id,
    customer_name: customerName,
    phone,
    address,
    items: cart,
    total,
    status: "new"
  });

  if (error) {
    const message = $("checkout-message");
    if (message) message.textContent = error.message;
    return;
  }

  const message = [
    "Новый заказ TECHSTORE",
    `Имя: ${customerName}`,
    `Телефон: ${phone}`,
    `Адрес: ${address || "Не указан"}`,
    "",
    ...cart.map((item) =>
      `${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`
    ),
    "",
    `Итого: ${money(total)}`
  ].join("\n");

  cart = [];
  saveCart();
  hideModal("checkout-modal");

  window.open(
    "https://t.me/ww1nterc?text=" + encodeURIComponent(message),
    "_blank"
  );

  notify("Заказ сохранён! Отправь сообщение в Telegram.");
});

// ==========================================
// ADMIN
// ==========================================

$("admin-btn")?.addEventListener("click", () => {
  if (!currentUser) return notify("Сначала войдите.");
  if (!isAdmin) return notify("У вас нет прав администратора.");

  showModal("admin-modal");
  renderAdminProducts();
});

$("product-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isAdmin) return notify("Нет доступа.");

  const product = {
    id: crypto.randomUUID(),
    name: $("new-name")?.value.trim(),
    price: Number($("new-price")?.value),
    category: $("new-category")?.value,
    image: $("new-image")?.value.trim(),
    description: $("new-description")?.value.trim()
  };

  if (!product.name || !product.price || !product.image) {
    return notify("Заполни название, цену и изображение.");
  }

  const { error } = await db.from("products").insert(product);

  if (error) {
    const message = $("admin-message");
    if (message) message.textContent = error.message;
    return;
  }

  event.target.reset();
  await loadProducts();
  renderAdminProducts();
  notify("Товар добавлен!");
});

function renderAdminProducts() {
  const container = $("admin-products");
  if (!container) return;

  container.innerHTML = products.map((product) => `
    <div>
      ${safe(product.name)} — ${money(product.price)}
      <button onclick="deleteProduct('${safe(product.id)}')">
        Удалить
      </button>
    </div>
  `).join("");
}

async function deleteProduct(id) {
  if (!isAdmin) return notify("Нет доступа.");
  if (!confirm("Удалить этот товар?")) return;

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id);

  if (error) return notify(error.message);

  await loadProducts();
  renderAdminProducts();
}

// ==========================================
// PRODUCT DETAILS
// ==========================================

async function loadProductDetail() {
  const container = $("product-detail");
  if (!container) return;

  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    container.innerHTML = "<p>Товар не указан.</p>";
    return;
  }

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    container.innerHTML = "<p>Товар не найден.</p>";
    return;
  }

  container.innerHTML = `
    <img src="${safe(data.image)}" alt="${safe(data.name)}">
    <h1>${safe(data.name)}</h1>
    <h2>${money(data.price)}</h2>
    <p>${safe(data.description || "")}</p>
    <button id="detail-add-cart">В корзину</button>
  `;

  $("detail-add-cart")?.addEventListener("click", () => {
    const existing = cart.find((item) => item.id === data.id);

    if (existing) existing.quantity++;
    else cart.push({
      id: data.id,
      name: data.name,
      price: Number(data.price),
      image: data.image,
      quantity: 1
    });

    saveCart();
    notify("Добавлено в корзину!");
  });
}

// ==========================================
// CLOSE MODALS
// ==========================================

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal");
    if (modal) modal.style.display = "none";
  });
});

// ==========================================
// START
// ==========================================

async function startApp() {
  await updateUser();
  await loadProducts();
  await loadProductDetail();
  renderCart();
}

startApp().catch((error) => {
  console.error("Ошибка запуска TECHSTORE:", error);
});
