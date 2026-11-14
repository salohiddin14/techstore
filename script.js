
const TELEGRAM_USERNAME = "ww1nterc";

// Товары магазина
const products = [
  {
    id: 1,
    name: "iPhone 15 Pro",
    category: "smartphones",
    categoryName: "Смартфоны",
    price: 11500000,
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=700"
  },
  {
    id: 2,
    name: "Samsung Galaxy S24",
    category: "smartphones",
    categoryName: "Смартфоны",
    price: 9200000,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700"
  },
  {
    id: 3,
    name: "Gaming Laptop",
    category: "computers",
    categoryName: "Компьютеры",
    price: 12500000,
    image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=700"
  },
  {
    id: 4,
    name: "Wireless Headphones",
    category: "accessories",
    categoryName: "Аксессуары",
    price: 450000,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700"
  },
  {
    id: 5,
    name: "Smart Watch",
    category: "accessories",
    categoryName: "Аксессуары",
    price: 650000,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700"
  },
  {
    id: 6,
    name: "Wireless Mouse",
    category: "accessories",
    categoryName: "Аксессуары",
    price: 180000,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=700"
  }
];

// Элементы страницы
const productList = document.getElementById("product-list");
const searchInput = document.getElementById("search-input");
const categoryFilters = document.getElementById("category-filters");
const emptyProducts = document.getElementById("empty-products");

const cartOverlay = document.getElementById("cart-overlay");
const checkoutOverlay = document.getElementById("checkout-overlay");

const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const checkoutTotal = document.getElementById("checkout-total");

let selectedCategory = "all";
let cart = loadCart();

// Форматирование цены
function formatPrice(price) {
  return new Intl.NumberFormat("ru-RU").format(price) + " сум";
}

// Безопасное отображение текста
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const symbols = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return symbols[character];
  });
}

// Сохранение корзины
function saveCart() {
  localStorage.setItem("techstore-cart", JSON.stringify(cart));
}

// Загрузка корзины
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("techstore-cart"));

    if (!Array.isArray(saved)) return [];

    return saved.filter(item =>
      products.some(product => product.id === item.id) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    );
  } catch {
    return [];
  }
}

// Отображение товаров
function renderProducts() {
  const searchText = searchInput.value.toLowerCase().trim();

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchText);

    const matchesCategory =
      selectedCategory === "all" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  productList.innerHTML = filteredProducts.map(product => `
    <article class="product-card">
      <div class="product-image">
        <img
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy"
        >
      </div>

      <div class="product-info">
        <span class="product-category">
          ${escapeHTML(product.categoryName)}
        </span>

        <h3>${escapeHTML(product.name)}</h3>

        <div class="product-price">
          ${formatPrice(product.price)}
        </div>

        <button class="add-button" data-add="${product.id}">
          + Добавить в корзину
        </button>
      </div>
    </article>
  `).join("");

  emptyProducts.hidden = filteredProducts.length !== 0;
}

// Поиск
searchInput.addEventListener("input", renderProducts);

// Фильтры категорий
categoryFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");

  if (!button) return;

  selectedCategory = button.dataset.category;

  document.querySelectorAll(".filter-button").forEach(filter => {
    filter.classList.remove("active");
  });

  button.classList.add("active");

  renderProducts();
});

// Добавление товара
productList.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");

  if (!button) return;

  addToCart(Number(button.dataset.add));
});

function addToCart(id) {
  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      id,
      quantity: 1
    });
  }

  saveCart();
  updateCart();

  const product = products.find(item => item.id === id);
  alert(`${product.name} добавлен в корзину!`);
}

// Подсчёт общей суммы
function getCartTotal() {
  return cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.id);

    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

// Обновление корзины
function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  cartCount.textContent = count;
  cartTotal.textContent = formatPrice(getCartTotal());
  checkoutTotal.textContent = formatPrice(getCartTotal());

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <p class="cart-empty">Твоя корзина пока пуста.</p>
    `;

    return;
  }

  cartItems.innerHTML = cart.map(item => {
    const product = products.find(p => p.id === item.id);

    if (!product) return "";

    return `
      <div class="cart-item">
        <img src="${escapeHTML(product.image)}" alt="">

        <div>
          <h3>${escapeHTML(product.name)}</h3>

          <div class="cart-item-price">
            ${formatPrice(product.price * item.quantity)}
          </div>

          <div class="quantity-controls">
            <button data-decrease="${product.id}">−</button>
            <span>${item.quantity}</span>
            <button data-increase="${product.id}">+</button>
          </div>
        </div>

        <button
          class="remove-button"
          data-remove="${product.id}"
        >
          Удалить
        </button>
      </div>
    `;
  }).join("");
}

// Изменение количества и удаление
cartItems.addEventListener("click", event => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const remove = event.target.closest("[data-remove]");

  if (increase) {
    changeQuantity(Number(increase.dataset.increase), 1);
  }

  if (decrease) {
    changeQuantity(Number(decrease.dataset.decrease), -1);
  }

  if (remove) {
    const id = Number(remove.dataset.remove);
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCart();
  }
});

function changeQuantity(id, amount) {
  const item = cart.find(product => product.id === id);

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(product => product.id !== id);
  }

  saveCart();
  updateCart();
}

// Открытие и закрытие корзины
document.getElementById("open-cart").addEventListener("click", () => {
  cartOverlay.classList.add("active");
});

document.getElementById("close-cart").addEventListener("click", () => {
  cartOverlay.classList.remove("active");
});

// Переход к оформлению заказа
document.getElementById("checkout-button").addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Сначала добавь товары в корзину.");
    return;
  }

  cartOverlay.classList.remove("active");
  checkoutOverlay.classList.add("active");
  checkoutTotal.textContent = formatPrice(getCartTotal());
});

document.getElementById("close-checkout").addEventListener("click", () => {
  checkoutOverlay.classList.remove("active");
});

// Закрытие окон при клике за пределами
[cartOverlay, checkoutOverlay].forEach(overlay => {
  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.classList.remove("active");
    }
  });
});

// Закрытие клавишей Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    cartOverlay.classList.remove("active");
    checkoutOverlay.classList.remove("active");
  }
});

// Оформление заказа
document.getElementById("checkout-form").addEventListener("submit", event => {
  event.preventDefault();

  if (cart.length === 0) {
    alert("Корзина пуста.");
    checkoutOverlay.classList.remove("active");
    return;
  }

  const form = event.currentTarget;

  if (!form.reportValidity()) return;

  const name = form.elements.name.value.trim();
  const phone = form.elements.phone.value.trim();
  const address = form.elements.address.value.trim();
  const comment = form.elements.comment.value.trim();

  const orderLines = cart.map(item => {
    const product = products.find(p => p.id === item.id);

    return `${product.name} x ${item.quantity} — ${
      formatPrice(product.price * item.quantity)
    }`;
  });

  const message = [
    "🛒 НОВЫЙ ЗАКАЗ — TECHSTORE",
    "",
    `👤 Имя: ${name}`,
    `📞 Телефон: ${phone}`,
    `📍 Адрес: ${address}`,
    "",
    "📦 ТОВАРЫ:",
    ...orderLines,
    "",
    `💰 ИТОГО: ${formatPrice(getCartTotal())}`,
    "",
    `💬 Комментарий: ${comment || "Нет"}`
  ].join("\n");

  const telegramURL =
    `https://t.me/${TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`;

  window.open(telegramURL, "_blank", "noopener,noreferrer");
});

// Первый запуск
renderProducts();
updateCart();
