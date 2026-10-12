// ==========================================================================
// VANYA HANDLOOMS - CLIENT JAVASCRIPT & SUPABASE INTEGRATION
// ==========================================================================

// Global State
let productsCache = [];
let cart = JSON.parse(localStorage.getItem("vanya_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("vanya_wishlist") || "[]");
let activeSearchCategory = "all";
let currentCatalogCategory = "all";
let currentCatalogSort = "featured";

// Preset Gradient Fallbacks for Sarees
const GRADIENT_PRESETS = [
    "linear-gradient(150deg, #c5b5a1 0%, #ddd0be 40%, #eee4d7 70%, #d8c8b4 100%)",
    "linear-gradient(150deg, #a98d82 0%, #c4a89c 40%, #eadbd4 70%, #c0a498 100%)",
    "linear-gradient(150deg, #b9a078 0%, #d0b890 40%, #eee1c9 70%, #c8b080 100%)",
    "linear-gradient(150deg, #8f6470 0%, #b08090 40%, #dfc5c7 70%, #a07080 100%)"
];

// Fallback Mock Sarees (displayed when database is empty or during offline fallback)
const DEMO_PRODUCTS = [
    {
        id: "demo-1",
        name: "Kasavu Handloom Saree",
        description: "Traditional authentic Kerala Kasavu saree with pure gold zari border, handwoven with premium unbleached cotton.",
        price: 4999,
        category: "Kerala Handloom",
        image_url: "",
        stock: 12,
        is_active: true,
        created_at: new Date(Date.now() - 100000).toISOString()
    },
    {
        id: "demo-2",
        name: "Heritage Silk Saree",
        description: "Rich heritage handwoven pure silk saree featuring timeless temple motifs and rich dual-tone pallu.",
        price: 6999,
        category: "Silk Collection",
        image_url: "",
        stock: 8,
        is_active: true,
        created_at: new Date(Date.now() - 200000).toISOString()
    },
    {
        id: "demo-3",
        name: "Golden Zari Saree",
        description: "Intricately woven golden zari work on fine fabric tailored for festive celebrations and special occasions.",
        price: 7499,
        category: "Zari Collection",
        image_url: "",
        stock: 5,
        is_active: true,
        created_at: new Date(Date.now() - 300000).toISOString()
    },
    {
        id: "demo-4",
        name: "Bridal Silk Saree",
        description: "Grand ceremonial bridal silk saree with dense handcrafted golden embellishments and royal finish.",
        price: 9999,
        category: "Bridal Collection",
        image_url: "",
        stock: 3,
        is_active: true,
        created_at: new Date(Date.now() - 400000).toISOString()
    }];

// ===== CURRENCY FORMATTER =====
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

// ===== TOAST NOTIFICATION =====
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
}

// ===== RENDER SKELETON LOADING STATE =====
function renderSkeletons() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = Array(4).fill(0).map(() => `
        <article class="skeleton-card">
            <div class="skeleton-image skeleton-shimmer"></div>
            <div class="skeleton-details">
                <div class="skeleton-line short skeleton-shimmer"></div>
                <div class="skeleton-line medium skeleton-shimmer"></div>
                <div class="skeleton-line price skeleton-shimmer"></div>
                <div class="skeleton-line btn skeleton-shimmer"></div>
            </div>
        </article>
    `).join("");
}

// ===== FETCH PRODUCTS FROM SUPABASE =====
async function loadProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    renderSkeletons();

    // Check if Supabase client is initialized
    const client = window.supabaseClient || (typeof supabaseClient !== "undefined" ? supabaseClient : null);

    if (!client) {
        console.warn("Supabase client is not ready. Using fallback sample sarees.");
        setTimeout(() => {
            productsCache = DEMO_PRODUCTS;
            applyCatalogFilterAndSort();
            renderWishlist();
            renderSearchResults();
        }, 300);
        return;
    }

    try {
        // Fetch only active products ordered by newest first
        const { data, error } = await client
            .from("products")
            .select("id, name, description, price, category, image_url, stock, is_active, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            productsCache = DEMO_PRODUCTS;
            applyCatalogFilterAndSort();
            renderWishlist();
            renderSearchResults();
            return;
        }

        productsCache = data;
        applyCatalogFilterAndSort();
        renderWishlist();
        renderSearchResults();
    } catch (err) {
        console.error("Error fetching products from Supabase:", err);
        productsCache = DEMO_PRODUCTS;
        applyCatalogFilterAndSort();
        renderWishlist();
        renderSearchResults();
        showToast("Connected with offline demo collection ✦");
    }
}

// ===== CATALOG FILTER & SORT (FOR COLLECTION.HTML) =====
function applyCatalogFilterAndSort() {
    let items = [...productsCache];

    // Filter by Category
    if (currentCatalogCategory !== "all") {
        items = items.filter(p => p.category && p.category.toLowerCase() === currentCatalogCategory.toLowerCase());
    }

    // Sort items
    if (currentCatalogSort === "price-low") {
        items.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (currentCatalogSort === "price-high") {
        items.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (currentCatalogSort === "newest") {
        items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    renderProducts(items);

    // Update catalog count if present
    const catalogCount = document.getElementById("catalogCount");
    if (catalogCount) {
        catalogCount.textContent = `Showing ${items.length} ${items.length === 1 ? 'saree' : 'authentic sarees'}`;
    }
}

// ===== RENDER PRODUCTS =====
function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (products.length === 0) {
        renderEmptyState("No sarees found matching this category.");
        return;
    }

    products.forEach((product, index) => {
        const isWishlisted = wishlist.includes(String(product.id));
        const isOutOfStock = product.stock <= 0;
        const isLowStock = product.stock > 0 && product.stock <= 3;
        const gradientBg = GRADIENT_PRESETS[index % GRADIENT_PRESETS.length];

        const card = document.createElement("article");
        card.className = `product-card reveal ${isOutOfStock ? "out-of-stock" : ""}`;
        card.style.transitionDelay = `${(index % 4) * 0.1}s`;

        // Image container with custom image_url or gradient fallback
        let imageContent = "";
        if (product.image_url && product.image_url.trim() !== "") {
            imageContent = `
                <img src="${escapeHtml(product.image_url)}" 
                     alt="${escapeHtml(product.name)}" 
                     class="product-img" 
                     loading="lazy"
                     onerror="this.style.display='none'; this.parentElement.style.background='${gradientBg}'">
            `;
        }

        // Stock and label tags
        let labelHtml = "";
        if (index === 0 && currentCatalogSort === "featured") {
            labelHtml = `<span class="product-label">NEW</span>`;
        } else if (index === 3 && currentCatalogSort === "featured") {
            labelHtml = `<span class="product-label">BESTSELLER</span>`;
        }

        let stockBadgeHtml = "";
        if (isOutOfStock) {
            stockBadgeHtml = `<span class="stock-badge out">Sold Out</span>`;
        } else if (isLowStock) {
            stockBadgeHtml = `<span class="stock-badge low">Only ${product.stock} left</span>`;
        }

        card.innerHTML = `
            <div class="product-image" style="background: ${gradientBg}; cursor: pointer;" data-action="quick-view" data-id="${product.id}">
                <button class="wishlist ${isWishlisted ? "liked" : ""}" 
                        data-action="wishlist" 
                        data-id="${product.id}" 
                        aria-label="Add to wishlist"
                        title="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
                    ${isWishlisted ? "♥" : "♡"}
                </button>
                ${labelHtml}
                ${stockBadgeHtml}
                ${imageContent}
            </div>
            <div class="product-details">
                <p class="product-category">${escapeHtml(product.category || "Handloom")}</p>
                <h3 style="cursor: pointer;" data-action="quick-view" data-id="${product.id}">
                    ${escapeHtml(product.name)}
                </h3>
                <strong>${formatCurrency(product.price)}</strong>
                <button class="view-product" data-action="add-to-cart" data-id="${product.id}" ${isOutOfStock ? "disabled" : ""}>
                    ${isOutOfStock ? "Out of Stock" : "Add to Bag"}
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    // Update dynamic JSON-LD structured data for SEO rich snippets
    updateProductStructuredData(products);

    observeReveals();
}

// ===== DYNAMIC SEO STRUCTURED DATA (JSON-LD) =====
function updateProductStructuredData(products) {
    let schemaEl = document.getElementById("dynamicProductSchema");
    if (!schemaEl) {
        schemaEl = document.createElement("script");
        schemaEl.id = "dynamicProductSchema";
        schemaEl.type = "application/ld+json";
        document.head.appendChild(schemaEl);
    }

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Handloom Sarees Collection",
        "itemListElement": products.map((p, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "item": {
                "@type": "Product",
                "name": p.name,
                "description": p.description || "Authentic handcrafted saree from VANYA Handlooms.",
                "image": p.image_url || "https://vanyahandlooms.com/og-image.jpg",
                "category": p.category || "Handloom Sarees",
                "brand": {
                    "@type": "Brand",
                    "name": "VANYA Handlooms"
                },
                "offers": {
                    "@type": "Offer",
                    "priceCurrency": "INR",
                    "price": Number(p.price),
                    "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "itemCondition": "https://schema.org/NewCondition"
                }
            }
        }))
    };

    schemaEl.textContent = JSON.stringify(schemaData);
}

// ===== ERROR & EMPTY STATES =====
function renderEmptyState(message) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = `
        <div class="product-grid-message">
            <span class="message-icon">✦</span>
            <h3>No Sarees Found</h3>
            <p>${escapeHtml(message)}</p>
            <button class="retry-btn" onclick="currentCatalogCategory='all'; applyCatalogFilterAndSort();">View All Sarees</button>
        </div>
    `;
}

// ===== WISHLIST FUNCTIONALITY =====
function toggleWishlist(productId) {
    const idStr = String(productId);
    const index = wishlist.indexOf(idStr);
    let isAdded = false;

    if (index === -1) {
        wishlist.push(idStr);
        isAdded = true;
    } else {
        wishlist.splice(index, 1);
        isAdded = false;
    }

    localStorage.setItem("vanya_wishlist", JSON.stringify(wishlist));
    updateWishlistBadge();
    renderWishlist();

    document.querySelectorAll(`button[data-action="wishlist"][data-id="${productId}"]`).forEach(btn => {
        btn.classList.toggle("liked", isAdded);
        btn.textContent = isAdded ? "♥" : "♡";
    });

    showToast(isAdded ? "Saved to wishlist ♥" : "Removed from wishlist");
}

function updateWishlistBadge() {
    const badge = document.getElementById("wishlistBadge");
    const countHeader = document.getElementById("wishlistCountHeader");
    const count = wishlist.length;

    if (badge) {
        badge.textContent = count;
        badge.classList.add("bump");
        setTimeout(() => badge.classList.remove("bump"), 250);
    }
    if (countHeader) {
        countHeader.textContent = count;
    }
}

function renderWishlist() {
    const container = document.getElementById("wishlistItems");
    if (!container) return;

    const wishlistedProducts = productsCache.filter(p => wishlist.includes(String(p.id)));

    if (wishlistedProducts.length === 0) {
        container.innerHTML = `
            <div class="wishlist-empty">
                <span>♡</span>
                <p>Your wishlist is currently empty.</p>
                <p style="font-size: 12px; margin-top: 8px;">Explore our collection and click the heart icon on any saree to save it here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlistedProducts.map((item, idx) => {
        const gradientBg = GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length];
        const imgHtml = item.image_url && item.image_url.trim() !== ""
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
            : "";

        return `
            <div class="wishlist-item">
                <div class="wishlist-item-img" style="background: ${gradientBg};">
                    ${imgHtml}
                </div>
                <div class="wishlist-item-info">
                    <div>
                        <span class="wishlist-item-category">${escapeHtml(item.category || "Handloom")}</span>
                        <h4 class="wishlist-item-title">${escapeHtml(item.name)}</h4>
                        <div class="wishlist-item-price">${formatCurrency(item.price)}</div>
                    </div>
                    <div class="wishlist-item-actions">
                        <button class="wishlist-add-btn" onclick="addToCart('${item.id}');">Add to Bag</button>
                        <button class="wishlist-item-remove" onclick="toggleWishlist('${item.id}');">Remove</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function toggleWishlistDrawer(open = null) {
    const drawer = document.getElementById("wishlistDrawer");
    const overlay = document.getElementById("wishlistOverlay");
    if (!drawer || !overlay) return;

    const isActive = open !== null ? open : !drawer.classList.contains("active");
    drawer.classList.toggle("active", isActive);
    overlay.classList.toggle("active", isActive);
    document.body.style.overflow = isActive ? "hidden" : "";
}

function moveAllWishlistToCart() {
    if (wishlist.length === 0) {
        showToast("Your wishlist is empty!");
        return;
    }

    const wishlistedProducts = productsCache.filter(p => wishlist.includes(String(p.id)));
    let addedCount = 0;

    wishlistedProducts.forEach(product => {
        if (product.stock > 0) {
            const existing = cart.find(item => String(item.id) === String(product.id));
            if (existing) {
                if (existing.quantity < product.stock) {
                    existing.quantity += 1;
                    addedCount++;
                }
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    category: product.category,
                    image_url: product.image_url,
                    stock: product.stock,
                    quantity: 1
                });
                addedCount++;
            }
        }
    });

    saveCart();
    renderCart();
    toggleWishlistDrawer(false);
    toggleCartDrawer(true);
    showToast(`Added ${addedCount} sarees to your bag ✨`);
}

// ===== SEARCH MODAL & REALTIME FILTERING =====
function toggleSearchModal(open = null) {
    const overlay = document.getElementById("searchOverlay");
    const input = document.getElementById("searchInput");
    if (!overlay) return;

    const isActive = open !== null ? open : !overlay.classList.contains("active");
    overlay.classList.toggle("active", isActive);
    document.body.style.overflow = isActive ? "hidden" : "";

    if (isActive && input) {
        setTimeout(() => input.focus(), 100);
        renderSearchResults();
    }
}

function renderSearchResults() {
    const grid = document.getElementById("searchResultsGrid");
    const info = document.getElementById("searchResultsInfo");
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClearBtn");
    if (!grid) return;

    const query = (input ? input.value : "").trim().toLowerCase();

    if (clearBtn) {
        clearBtn.classList.toggle("visible", query.length > 0);
    }

    let filtered = productsCache.filter(item => {
        const matchesCategory = activeSearchCategory === "all" ||
            (item.category && item.category.toLowerCase() === activeSearchCategory.toLowerCase());

        const matchesQuery = query === "" ||
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query));

        return matchesCategory && matchesQuery;
    });

    if (info) {
        info.textContent = `Found ${filtered.length} ${filtered.length === 1 ? 'saree' : 'sarees'}${query ? ` for "${query}"` : ''}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--muted);">
                <p>No sarees match your search.</p>
                <p style="font-size: 12px; margin-top: 6px;">Try searching for "Silk", "Kasavu", "Zari", or "Bridal".</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map((item, idx) => {
        const gradientBg = GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length];
        const imgHtml = item.image_url && item.image_url.trim() !== ""
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
            : "";

        return `
            <div class="search-result-card" onclick="toggleSearchModal(false); openQuickView('${item.id}');">
                <div class="search-result-img" style="background: ${gradientBg};">
                    ${imgHtml}
                </div>
                <div class="search-result-info">
                    <span class="search-result-category">${escapeHtml(item.category || "Handloom")}</span>
                    <h4 class="search-result-name">${escapeHtml(item.name)}</h4>
                    <div class="search-result-price">${formatCurrency(item.price)}</div>
                </div>
            </div>
        `;
    }).join("");
}

// ===== SHOPPING CART LOGIC =====
function addToCart(productId) {
    const product = productsCache.find(p => String(p.id) === String(productId));
    if (!product) return;

    if (product.stock <= 0) {
        showToast("Sorry, this saree is currently out of stock.");
        return;
    }

    const existingItem = cart.find(item => String(item.id) === String(productId));

    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showToast(`Maximum available stock (${product.stock}) reached.`);
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            category: product.category,
            image_url: product.image_url,
            stock: product.stock,
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    showToast(`Added "${product.name}" to your bag ✨`);

    const badge = document.getElementById("cartBadge");
    if (badge) {
        badge.classList.add("bump");
        setTimeout(() => badge.classList.remove("bump"), 250);
    }
}

function updateCartQuantity(productId, delta) {
    const item = cart.find(i => String(i.id) === String(productId));
    if (!item) return;

    // Check against latest product cache stock
    const cachedProd = productsCache.find(p => String(p.id) === String(productId));
    const availableStock = cachedProd ? cachedProd.stock : item.stock;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (newQty > availableStock) {
        showToast(`Only ${availableStock} items available in stock.`);
        return;
    }

    item.quantity = newQty;
    item.stock = availableStock;
    saveCart();
    renderCart();
    if (document.getElementById("checkoutOverlay")?.classList.contains("active")) {
        renderCheckoutSummary();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    saveCart();
    renderCart();
    if (document.getElementById("checkoutOverlay")?.classList.contains("active")) {
        renderCheckoutSummary();
    }
    showToast("Item removed from bag");
}

function saveCart() {
    localStorage.setItem("vanya_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    const countHeader = document.getElementById("cartCountHeader");
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (badge) badge.textContent = totalCount;
    if (countHeader) countHeader.textContent = totalCount;
}

function renderCart() {
    const cartItemsContainer = document.getElementById("cartItems");
    const cartSubtotalEl = document.getElementById("cartSubtotal");
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <span>🛍</span>
                <p>Your shopping bag is empty.</p>
            </div>
        `;
        if (cartSubtotalEl) cartSubtotalEl.textContent = formatCurrency(0);
        return;
    }

    let subtotal = 0;
    cartItemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const imgHtml = item.image_url && item.image_url.trim() !== ""
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">`
            : "";

        return `
            <div class="cart-item">
                <div class="cart-item-img" style="background: linear-gradient(135deg, #c5b5a1, #dfc5c7);">
                    ${imgHtml}
                </div>
                <div class="cart-item-info">
                    <div>
                        <span class="cart-item-category">${escapeHtml(item.category || "Handloom")}</span>
                        <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
                        <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-qty-control">
                            <button class="cart-qty-btn" onclick="updateCartQuantity('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                            <span class="cart-qty-num">${item.quantity}</span>
                            <button class="cart-qty-btn" onclick="updateCartQuantity('${item.id}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (cartSubtotalEl) {
        cartSubtotalEl.textContent = formatCurrency(subtotal);
    }
}

function toggleCartDrawer(open = null) {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartOverlay");
    if (!drawer || !overlay) return;

    const isActive = open !== null ? open : !drawer.classList.contains("active");
    drawer.classList.toggle("active", isActive);
    overlay.classList.toggle("active", isActive);
    document.body.style.overflow = isActive ? "hidden" : "";
}

// ===== QUICK VIEW MODAL =====
function openQuickView(productId) {
    const product = productsCache.find(p => String(p.id) === String(productId));
    if (!product) return;

    const overlay = document.getElementById("quickViewOverlay");
    const content = document.getElementById("quickViewContent");
    if (!overlay || !content) return;

    const isOutOfStock = product.stock <= 0;
    const isWishlisted = wishlist.includes(String(product.id));

    let mediaHtml = "";
    if (product.image_url && product.image_url.trim() !== "") {
        mediaHtml = `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">`;
    }

    content.innerHTML = `
        <div class="quick-view-media" style="background: linear-gradient(150deg, #c5b5a1, #b08090);">
            ${mediaHtml}
        </div>
        <div class="quick-view-info">
            <span class="quick-view-category">${escapeHtml(product.category || "Handloom")}</span>
            <h2>${escapeHtml(product.name)}</h2>
            <div class="quick-view-price">${formatCurrency(product.price)}</div>
            <p class="quick-view-desc">${escapeHtml(product.description || "Authentic handcrafted handloom saree woven with tradition and passion.")}</p>
            <div class="quick-view-stock-info">
                <span>✦</span>
                <span>${isOutOfStock ? "Currently out of stock" : `${product.stock} pieces in stock & ready to ship`}</span>
            </div>
            <div class="quick-view-btn-row">
                <button class="quick-view-add-btn" 
                        onclick="addToCart('${product.id}'); closeQuickView();" 
                        ${isOutOfStock ? "disabled" : ""}>
                    ${isOutOfStock ? "Out of Stock" : "Add to Bag"}
                </button>
            </div>
        </div>
    `;

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeQuickView() {
    const overlay = document.getElementById("quickViewOverlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
}

// ===== CHECKOUT & WHATSAPP ORDERING SYSTEM =====
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast("Your shopping bag is empty! Add sarees before checking out.");
        return;
    }

    // Validate and cap stock quantities against cached product inventory
    let adjusted = false;
    cart.forEach(item => {
        const prod = productsCache.find(p => String(p.id) === String(item.id));
        if (prod) {
            if (prod.stock <= 0) {
                removeFromCart(item.id);
                showToast(`"${item.name}" was removed as it is now sold out.`);
                adjusted = true;
            } else if (item.quantity > prod.stock) {
                item.quantity = prod.stock;
                item.stock = prod.stock;
                adjusted = true;
            }
        }
    });

    if (adjusted) {
        saveCart();
        renderCart();
        showToast("Cart quantities adjusted based on current live stock limits.");
    }

    if (cart.length === 0) return;

    // Close bag drawer first
    toggleCartDrawer(false);

    // Render Order Summary inside Checkout
    renderCheckoutSummary();
    clearCheckoutErrors();

    const overlay = document.getElementById("checkoutOverlay");
    if (overlay) {
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeCheckoutModal() {
    const overlay = document.getElementById("checkoutOverlay");
    if (overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
}

function renderCheckoutSummary() {
    const listEl = document.getElementById("checkoutItemsList");
    const subtotalEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutGrandTotal");
    if (!listEl) return;

    let subtotal = 0;
    listEl.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="checkout-item-row">
                <div class="checkout-item-name">${escapeHtml(item.name)}</div>
                <div class="checkout-item-meta">${item.quantity} × ${formatCurrency(item.price)}</div>
                <div class="checkout-item-total">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }).join("");

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (totalEl) totalEl.textContent = formatCurrency(subtotal);
}

function clearCheckoutErrors() {
    document.querySelectorAll(".field-error").forEach(el => {
        el.textContent = "";
        el.classList.remove("visible");
    });
    document.querySelectorAll(".checkout-form input").forEach(el => {
        el.classList.remove("error");
    });
}

function validateCheckoutForm() {
    clearCheckoutErrors();
    let isValid = true;

    const nameInput = document.getElementById("custName");
    const phoneInput = document.getElementById("custPhone");
    const addressInput = document.getElementById("custAddress");
    const cityInput = document.getElementById("custCity");
    const stateInput = document.getElementById("custState");
    const pincodeInput = document.getElementById("custPincode");
    const notesInput = document.getElementById("custNotes");

    // Full Name
    const name = nameInput ? nameInput.value.trim() : "";
    if (name.length < 2) {
        setFieldError(nameInput, "custNameError", "Please enter your full name");
        isValid = false;
    }

    // Phone / WhatsApp (10 digits)
    const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, "") : "";
    if (!phone || phone.length !== 10) {
        setFieldError(phoneInput, "custPhoneError", "Please enter a valid 10-digit mobile number");
        isValid = false;
    }

    // Address
    const address = addressInput ? addressInput.value.trim() : "";
    if (address.length < 5) {
        setFieldError(addressInput, "custAddressError", "Please enter your house/flat & street address");
        isValid = false;
    }

    // City
    const city = cityInput ? cityInput.value.trim() : "";
    if (city.length < 2) {
        setFieldError(cityInput, "custCityError", "Please enter your city");
        isValid = false;
    }

    // State
    const state = stateInput ? stateInput.value.trim() : "";
    if (state.length < 2) {
        setFieldError(stateInput, "custStateError", "Please enter your state");
        isValid = false;
    }

    // PIN Code (6 digits)
    const pincode = pincodeInput ? pincodeInput.value.trim() : "";
    if (!/^\d{6}$/.test(pincode)) {
        setFieldError(pincodeInput, "custPincodeError", "Please enter a valid 6-digit PIN code");
        isValid = false;
    }

    if (!isValid) return null;

    return {
        name,
        phone,
        address,
        city,
        state,
        pincode,
        notes: notesInput ? notesInput.value.trim() : ""
    };
}

function setFieldError(inputEl, errorId, message) {
    if (inputEl) inputEl.classList.add("error");
    const errorEl = document.getElementById(errorId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add("visible");
    }
}

// ===== HANDLE ORDER VIA WHATSAPP =====
function handleWhatsAppOrder() {
    if (cart.length === 0) {
        showToast("Your shopping bag is empty.");
        return;
    }

    const formData = validateCheckoutForm();
    if (!formData) {
        showToast("Please fill in all required delivery details.");
        return;
    }

    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = `VNY-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // Build Itemized WhatsApp Message
    const itemsText = cart.map((item, idx) => {
        return `${idx + 1}. *${item.name}*\n   • Qty: ${item.quantity} × ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}`;
    }).join("\n\n");

    const message =
        `🌸 *NEW ORDER - VANYA HANDLOOMS* 🌸
*Order Ref:* #${orderId}
*Date:* ${orderDate}

🛍 *ORDERED SAREES:*
${itemsText}

───────────────────
💰 *GRAND TOTAL:* ${formatCurrency(subtotal)}
🚚 *SHIPPING:* Complimentary Free Delivery

📍 *DELIVERY DETAILS:*
• *Customer:* ${formData.name}
• *WhatsApp / Phone:* ${formData.phone}
• *Address:* ${formData.address}
• *City / State:* ${formData.city}, ${formData.state} - ${formData.pincode}
${formData.notes ? `• *Special Notes:* ${formData.notes}\n` : ""}
───────────────────
_Please confirm availability & share payment/dispatch updates. Thank you! ✨_`;

    // Retrieve configured boutique number
    const targetNumber = String(window.BOUTIQUE_WHATSAPP_NUMBER || "919876543210").replace(/\D/g, "");
    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp in a new tab/window
    window.open(waUrl, "_blank");

    // Show Confirmation Modal and reset cart
    showOrderSuccess(orderId, formData, subtotal, "WhatsApp Direct Order");

    // Clear cart after dispatch
    cart = [];
    saveCart();
    renderCart();
    closeCheckoutModal();
}

// ===== HANDLE DIRECT PLACE ORDER (COD / DIRECT CONFIRMATION) =====
function handlePlaceOrderDirect() {
    if (cart.length === 0) {
        showToast("Your shopping bag is empty.");
        return;
    }

    const formData = validateCheckoutForm();
    if (!formData) {
        showToast("Please fill in all required delivery details.");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = `VNY-${Math.floor(10000 + Math.random() * 90000)}`;

    // Show confirmation modal
    showOrderSuccess(orderId, formData, subtotal, "Direct Boutique Booking");

    // Clear cart
    cart = [];
    saveCart();
    renderCart();
    closeCheckoutModal();
    showToast("Order booked successfully! ✨");
}

function showOrderSuccess(orderId, formData, total, method) {
    const overlay = document.getElementById("orderSuccessOverlay");
    const idTag = document.getElementById("successOrderId");
    const detailsEl = document.getElementById("orderSuccessDetails");

    if (idTag) idTag.textContent = `#${orderId}`;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <p><strong>Customer:</strong> ${escapeHtml(formData.name)} (${escapeHtml(formData.phone)})</p>
            <p><strong>Delivery:</strong> ${escapeHtml(formData.address)}, ${escapeHtml(formData.city)}, ${escapeHtml(formData.state)} - ${escapeHtml(formData.pincode)}</p>
            <p><strong>Total Payable:</strong> ${formatCurrency(total)} (Free Shipping)</p>
            <p><strong>Order Type:</strong> ${escapeHtml(method)}</p>
        `;
    }

    if (overlay) {
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeOrderSuccessModal() {
    const overlay = document.getElementById("orderSuccessOverlay");
    if (overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// ===== GLOBAL EVENT DELEGATION =====
document.addEventListener("click", (e) => {
    // Wishlist button on product card
    const wishlistBtn = e.target.closest('[data-action="wishlist"]');
    if (wishlistBtn) {
        e.stopPropagation();
        const id = wishlistBtn.getAttribute("data-id");
        if (id) toggleWishlist(id);
        return;
    }

    // Add to cart button
    const addToCartBtn = e.target.closest('[data-action="add-to-cart"]');
    if (addToCartBtn) {
        e.stopPropagation();
        const id = addToCartBtn.getAttribute("data-id");
        if (id) addToCart(id);
        return;
    }

    // Quick view trigger
    const quickViewTrigger = e.target.closest('[data-action="quick-view"]');
    if (quickViewTrigger) {
        const id = quickViewTrigger.getAttribute("data-id");
        if (id) openQuickView(id);
        return;
    }
});

// ===== EVENT LISTENERS SETUP =====
function initEvents() {
    // Header Buttons
    const searchBtn = document.getElementById("searchBtn");
    const wishlistHeaderBtn = document.getElementById("wishlistHeaderBtn");
    const cartBtn = document.getElementById("cartBtn");

    // Drawer Closers and Overlays
    const cartCloseBtn = document.getElementById("cartCloseBtn");
    const cartOverlay = document.getElementById("cartOverlay");
    const wishlistCloseBtn = document.getElementById("wishlistCloseBtn");
    const wishlistOverlay = document.getElementById("wishlistOverlay");
    const searchCloseBtn = document.getElementById("searchCloseBtn");
    const searchOverlay = document.getElementById("searchOverlay");
    const searchClearBtn = document.getElementById("searchClearBtn");
    const searchInput = document.getElementById("searchInput");

    // Checkout & Order Modal Elements
    const checkoutBtn = document.getElementById("checkoutBtn");
    const checkoutCloseBtn = document.getElementById("checkoutCloseBtn");
    const checkoutOverlay = document.getElementById("checkoutOverlay");
    const btnWhatsappOrder = document.getElementById("btnWhatsappOrder");
    const btnPlaceOrder = document.getElementById("btnPlaceOrder");
    const orderSuccessCloseBtn = document.getElementById("orderSuccessCloseBtn");
    const orderSuccessOverlay = document.getElementById("orderSuccessOverlay");

    // Action Buttons
    const moveAllToCartBtn = document.getElementById("moveAllToCartBtn");
    const refreshBtn = document.getElementById("refreshProductsBtn");
    const quickViewClose = document.getElementById("quickViewClose");
    const quickViewOverlay = document.getElementById("quickViewOverlay");
    const sortSelect = document.getElementById("sortSelect");

    // Collection Page Filter Tabs
    document.querySelectorAll("#collectionFilters .filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#collectionFilters .filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCatalogCategory = btn.getAttribute("data-filter") || "all";
            applyCatalogFilterAndSort();
        });
    });

    // Collection Page Sorting
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentCatalogSort = e.target.value;
            applyCatalogFilterAndSort();
        });
    }

    // Checkout Triggers
    if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckoutModal);
    if (checkoutCloseBtn) checkoutCloseBtn.addEventListener("click", closeCheckoutModal);
    if (checkoutOverlay) {
        checkoutOverlay.addEventListener("click", (e) => {
            if (e.target === checkoutOverlay) closeCheckoutModal();
        });
    }

    if (btnWhatsappOrder) btnWhatsappOrder.addEventListener("click", handleWhatsAppOrder);
    if (btnPlaceOrder) btnPlaceOrder.addEventListener("click", handlePlaceOrderDirect);

    if (orderSuccessCloseBtn) orderSuccessCloseBtn.addEventListener("click", closeOrderSuccessModal);
    if (orderSuccessOverlay) {
        orderSuccessOverlay.addEventListener("click", (e) => {
            if (e.target === orderSuccessOverlay) closeOrderSuccessModal();
        });
    }

    // Clear field errors when typing
    document.querySelectorAll(".checkout-form input").forEach(input => {
        input.addEventListener("input", () => {
            input.classList.remove("error");
            const errEl = document.getElementById(`${input.id}Error`);
            if (errEl) errEl.classList.remove("visible");
        });
    });

    // Search events
    if (searchBtn) searchBtn.addEventListener("click", () => toggleSearchModal(true));
    if (searchCloseBtn) searchCloseBtn.addEventListener("click", () => toggleSearchModal(false));
    if (searchOverlay) {
        searchOverlay.addEventListener("click", (e) => {
            if (e.target === searchOverlay) toggleSearchModal(false);
        });
    }
    if (searchInput) {
        searchInput.addEventListener("input", renderSearchResults);
    }
    if (searchClearBtn && searchInput) {
        searchClearBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchInput.focus();
            renderSearchResults();
        });
    }

    // Search Category Filter Pills
    document.querySelectorAll("#searchCategories .category-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll("#searchCategories .category-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activeSearchCategory = pill.getAttribute("data-category") || "all";
            renderSearchResults();
        });
    });

    // Wishlist events
    if (wishlistHeaderBtn) wishlistHeaderBtn.addEventListener("click", () => toggleWishlistDrawer(true));
    if (wishlistCloseBtn) wishlistCloseBtn.addEventListener("click", () => toggleWishlistDrawer(false));
    if (wishlistOverlay) wishlistOverlay.addEventListener("click", () => toggleWishlistDrawer(false));
    if (moveAllToCartBtn) moveAllToCartBtn.addEventListener("click", moveAllWishlistToCart);

    // Cart events
    if (cartBtn) cartBtn.addEventListener("click", () => toggleCartDrawer(true));
    if (cartCloseBtn) cartCloseBtn.addEventListener("click", () => toggleCartDrawer(false));
    if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCartDrawer(false));

    if (refreshBtn) {
        refreshBtn.addEventListener("click", (e) => {
            e.preventDefault();
            loadProducts();
            showToast("Refreshing saree collection... ✦");
        });
    }

    if (quickViewClose) quickViewClose.addEventListener("click", closeQuickView);
    if (quickViewOverlay) {
        quickViewOverlay.addEventListener("click", (e) => {
            if (e.target === quickViewOverlay) closeQuickView();
        });
    }

    // Newsletter form
    const newsletterForm = document.getElementById("newsletterForm");
    if (newsletterForm) {
        newsletterForm.addEventListener("submit", (e) => {
            e.preventDefault();
            showToast("Welcome to VANYA Handlooms! ✨");
            newsletterForm.reset();
        });
    }

    // Header scroll shadow
    const header = document.querySelector(".header");
    if (header) {
        window.addEventListener("scroll", () => {
            header.classList.toggle("scrolled", window.scrollY > 60);
        }, { passive: true });
    }

    // Back to top button
    const backToTop = document.getElementById("backToTop");
    if (backToTop) {
        window.addEventListener("scroll", () => {
            backToTop.classList.toggle("visible", window.scrollY > 500);
        }, { passive: true });

        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Escape key closes open drawers and modals
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeQuickView();
            toggleCartDrawer(false);
            toggleWishlistDrawer(false);
            toggleSearchModal(false);
            closeCheckoutModal();
            closeOrderSuccessModal();
        }
    });
}

// ===== SCROLL REVEAL OBSERVER =====
let revealObserver = null;

function observeReveals() {
    if (!revealObserver) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
    }

    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
        revealObserver.observe(el);
    });
}

// Helper utility to escape HTML against XSS
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
    // Read category query parameter from URL (e.g. collection.html?category=Silk+Collection)
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category");
    if (categoryParam) {
        currentCatalogCategory = categoryParam;
        document.querySelectorAll("#collectionFilters .filter-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-filter").toLowerCase() === categoryParam.toLowerCase());
        });
    }

    initEvents();
    updateCartBadge();
    updateWishlistBadge();
    renderCart();
    observeReveals();
    loadProducts();
});
