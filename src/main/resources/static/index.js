/**
 * Bella Afrodita - Sistema de Gestión de Ventas e Inventario
 * Desarrollado para eventos y control de stock con lógica de mayoristas.
 */

const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];
let vistaActualHistorial = 'ventas';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicialización de Modales de Bootstrap
    const modalEl = document.getElementById('modalProducto');
    const confirmEl = document.getElementById('confirmModal');
    if (modalEl) myModal = new bootstrap.Modal(modalEl);
    if (confirmEl) confirmModal = new bootstrap.Modal(confirmEl);

    // 2. Carga Inicial de Datos
    loadProducts();
    updateBalance();
    toggleHistorial('ventas');

    // 3. Event Listeners para Buscadores Dinámicos
    document.getElementById("saleSearchProduct")?.addEventListener("input", filterSaleResults);
    document.getElementById("searchInventory")?.addEventListener("input", filterInventory);
    document.getElementById("searchSales")?.addEventListener("input", filterHistorialSearch);
    document.getElementById("purchaseSearchProduct")?.addEventListener("input", filterPurchaseResults);

    // Filtro de fecha en Historial
    document.getElementById("filterDate")?.addEventListener("change", () => toggleHistorial(vistaActualHistorial));

    // 4. Cálculos en tiempo real (Modal de Producto)
    ["p-packCost", "p-units", "p-margin"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", liveCalc);
    });

    // Validar precio mayorista mientras se escribe la cantidad en Ventas
    document.getElementById("quantity")?.addEventListener("input", checkWholesalePriceInSale);

    // 5. Gestión de Formularios
    document.getElementById("saleForm").addEventListener("submit", handleSaleSubmit);
    document.getElementById("purchaseForm").addEventListener("submit", handlePurchaseSubmit);
    document.getElementById("productForm").addEventListener("submit", handleProductFormSubmit);

    // Botón de confirmación definitiva de borrado
    document.getElementById("btnConfirmDelete")?.addEventListener("click", executeDelete);

    // Cerrar listas de resultados al hacer clic fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            document.getElementById("productResults")?.classList.add("d-none");
            document.getElementById("purchaseProductResults")?.classList.add("d-none");
        }
    });
});

// --- SISTEMA DE BALANCE ---
async function updateBalance() {
    try {
        const res = await fetch(`${API_URL}/balance/current`);
        if(!res.ok) return;
        const data = await res.json();

        // "3 mil" -> Ganancia Neta
        document.getElementById("net-balance").innerText = `$${(data.netBalance || 0).toLocaleString()}`;

        // "2 mil" -> Recaudación (lo que recuperaste para reinvertir)
        document.getElementById("total-recap").innerText = `$${(data.totalSales || 0).toLocaleString()}`;

        document.getElementById("total-expenses").innerText = `$${(data.totalExpenses || 0).toLocaleString()}`;
        document.getElementById("sales-count").innerText = data.salesCount || "0";
    } catch (e) { console.error(e); }
}

// --- HISTORIAL DINÁMICO (VENTAS / COMPRAS) ---
function toggleHistorial(tipo) {
    vistaActualHistorial = tipo;
    const btnVentas = document.getElementById("btnHistorialVentas");
    const btnCompras = document.getElementById("btnHistorialCompras");
    const header = document.getElementById("historialHeader");

    if (tipo === 'ventas') {
        if(btnVentas) { btnVentas.classList.add("active", "btn-primary"); btnVentas.classList.remove("btn-light"); }
        if(btnCompras) { btnCompras.classList.remove("active", "btn-primary"); btnCompras.classList.add("btn-light"); }
        header.innerHTML = `<tr><th class="ps-4">Fecha</th><th>Producto</th><th>Cant.</th><th>Monto</th><th class="text-end pe-4">Acción</th></tr>`;
        loadSales();
    } else {
        if(btnCompras) { btnCompras.classList.add("active", "btn-primary"); btnCompras.classList.remove("btn-light"); }
        if(btnVentas) { btnVentas.classList.remove("active", "btn-primary"); btnVentas.classList.add("btn-light"); }
        header.innerHTML = `<tr><th class="ps-4">Fecha</th><th>Producto</th><th>Packs</th><th>Costo</th><th class="text-end pe-4">Acción</th></tr>`;
        loadPurchases();
    }
}

async function loadSales() {
    const dateFilter = document.getElementById("filterDate").value;
    const res = await fetch(`${API_URL}/sales`);
    if(!res.ok) return;
    let sales = await res.json();

    if(dateFilter) sales = sales.filter(s => s.saleDate.includes(dateFilter));

    const table = document.getElementById("historyTableBody");
    table.innerHTML = "";
    sales.reverse().forEach(s => {
        table.innerHTML += `
            <tr>
                <td class="ps-4">${new Date(s.saleDate).toLocaleDateString()}</td>
                <td><div class="fw-bold">${s.product ? s.product.name : 'Eliminado'}</div></td>
                <td>${s.quantity}</td>
                <td class="text-success fw-bold">$${(s.totalSaleAmount || 0).toFixed(2)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${s.id}, 'sale')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

async function loadPurchases() {
    const dateFilter = document.getElementById("filterDate").value;
    const res = await fetch(`${API_URL}/supply-orders`);
    if(!res.ok) return;
    let purchases = await res.json();

    if(dateFilter) purchases = purchases.filter(p => p.orderDate.includes(dateFilter));

    const table = document.getElementById("historyTableBody");
    table.innerHTML = "";
    purchases.reverse().forEach(p => {
        table.innerHTML += `
            <tr>
                <td class="ps-4">${new Date(p.orderDate).toLocaleDateString()}</td>
                <td><div class="fw-bold">${p.product ? p.product.name : 'Eliminado'}</div></td>
                <td>${p.quantityPacks}</td>
                <td class="text-danger fw-bold">$${(p.totalCost || 0).toFixed(2)}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${p.id}, 'purchase')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// --- LÓGICA DE VENTAS ---
function filterSaleResults() {
    const query = document.getElementById("saleSearchProduct").value.toLowerCase();
    const resDiv = document.getElementById("productResults");
    if (!resDiv || query.length < 1) { resDiv?.classList.add("d-none"); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0";
        btn.innerHTML = `
            <div>
                <div class="fw-bold">${p.name}</div>
                <small class="text-muted">Stock: ${p.currentStock}</small>
            </div>
            <span class="badge rounded-pill bg-light text-dark border">$${(p.finalSalesPrice || 0).toFixed(2)}</span>`;
        btn.addEventListener("mousedown", () => selectProduct(p));
        resDiv.appendChild(btn);
    });
    resDiv.classList.toggle("d-none", matches.length === 0);
}

function selectProduct(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");
    document.getElementById("selectedProductLabel").classList.remove("d-none");
    checkWholesalePriceInSale();
}

function checkWholesalePriceInSale() {
    const id = document.getElementById("productSelect").value;
    const qty = parseInt(document.getElementById("quantity").value) || 0;
    const label = document.getElementById("currentSelectionName");
    if (!id || !label) return;

    const p = allProducts.find(prod => prod.id == id);
    if (p && p.wholesalePrice && qty >= p.wholesaleQuantityThreshold) {
        label.innerHTML = `${p.name} <span class="badge bg-info text-dark ms-2">MAYORISTA: $${p.wholesalePrice.toFixed(2)}</span>`;
    } else if (p) {
        label.innerText = `${p.name} ($${(p.finalSalesPrice || 0).toFixed(2)})`;
    }
}

async function handleSaleSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById("productSelect").value;
    const qty = document.getElementById("quantity").value;

    if(!productId) return Swal.fire("Aviso", "Por favor, busca y selecciona un producto", "info");

    const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ product: { id: parseInt(productId) }, quantity: parseInt(qty) })
    });

    if(res.ok) {
        Swal.fire({icon:'success', title:'Venta Registrada', timer:1500, showConfirmButton:false});
        e.target.reset();
        document.getElementById("selectedProductLabel").classList.add("d-none");
        await loadProducts();
        await updateBalance();
        toggleHistorial('ventas');
    } else {
        const msg = await res.text();
        Swal.fire("Error", msg || "Verifica el stock disponible", "error");
    }
}

// --- INVENTARIO ---
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) return;
        allProducts = await res.json();
        renderTable();
    } catch (e) { console.error("Error cargando inventario:", e); }
}

function renderTable() {
    const table = document.getElementById("inventoryTableBody");
    if(!table) return;
    table.innerHTML = "";
    allProducts.forEach(p => {
        const isCritical = p.currentStock <= 2;
        const isWarning = p.currentStock <= 5;
        const rowClass = isCritical ? "fila-critica" : (isWarning ? "fila-advertencia" : "");
        const badgeClass = isCritical ? "stock-critical" : (isWarning ? "stock-warning" : "bg-light text-dark");

        table.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4 text-start">
                    <div class="fw-bold">${p.name}</div>
                    <small class="text-muted">ID: #${p.id}</small>
                </td>
                <td><span class="badge ${badgeClass}" style="padding: 8px 12px;">${p.currentStock}</span></td>
                <td><div class="txt-minorista">$${(p.finalSalesPrice || 0).toFixed(2)}</div></td>
                <td><div class="txt-mayorista">${p.wholesalePrice ? '$'+p.wholesalePrice.toFixed(2) : '---'}</div></td>
                <td class="text-end pe-4">
                    <button class="btn-action me-1" onclick='editProduct(${JSON.stringify(p)})'>
                        <i class="bi bi-pencil-fill text-primary"></i>
                    </button>
                    <button class="btn-action text-danger" onclick="askDelete(${p.id}, 'product')">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
    });
}

// --- COMPRAS (PROVEEDORES) ---
function filterPurchaseResults() {
    const query = document.getElementById("purchaseSearchProduct").value.toLowerCase();
    const resDiv = document.getElementById("purchaseProductResults");
    if (!resDiv || query.length < 1) { resDiv?.classList.add("d-none"); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action border-0 fw-bold";
        btn.innerText = p.name;
        btn.onclick = () => {
            document.getElementById("purchaseProductSelect").value = p.id;
            document.getElementById("purchaseSearchProduct").value = p.name;
            resDiv.classList.add("d-none");
        };
        resDiv.appendChild(btn);
    });
    resDiv.classList.remove("d-none");
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById("purchaseProductSelect").value;
    if(!productId) return Swal.fire("Aviso", "Selecciona un producto del buscador", "info");

    const data = {
        product: { id: parseInt(productId) },
        quantityPacks: parseInt(document.getElementById("purchasePacks").value),
        totalCost: parseFloat(document.getElementById("purchaseTotalCost").value)
    };

    const res = await fetch(`${API_URL}/supply-orders`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if(res.ok) {
        Swal.fire("Éxito", "Mercadería sumada al stock y egreso registrado", "success");
        e.target.reset();
        await loadProducts();
        await updateBalance();
        if(vistaActualHistorial === 'compras') loadPurchases();
    }
}

// --- FORMULARIO DE PRODUCTO (NUEVO/EDITAR) ---
async function handleProductFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("p-id").value;
    const data = {
        name: document.getElementById("p-name").value,
        packCost: parseFloat(document.getElementById("p-packCost").value),
        unitsPerPack: parseInt(document.getElementById("p-units").value),
        profitMarginPercentage: parseFloat(document.getElementById("p-margin").value),
        currentStock: parseInt(document.getElementById("p-stock").value),
        wholesalePrice: document.getElementById("p-wholesalePrice").value ? parseFloat(document.getElementById("p-wholesalePrice").value) : null,
        wholesaleQuantityThreshold: document.getElementById("p-wholesaleThreshold").value ? parseInt(document.getElementById("p-wholesaleThreshold").value) : null
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;

    const res = await fetch(url, {
        method,
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
    });

    if(res.ok) {
        myModal.hide();
        await loadProducts();
        await updateBalance();
        Swal.fire("Listo", "Producto guardado correctamente", "success");
    }
}

function openCreateModal() {
    document.getElementById("productForm").reset();
    document.getElementById("p-id").value = "";
    document.getElementById("modalTitle").innerText = "Nuevo Producto";
    document.getElementById("live-price-preview").innerText = "Sugerido: $0.00";
    myModal.show();
}

function editProduct(p) {
    document.getElementById("p-id").value = p.id;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-packCost").value = p.packCost;
    document.getElementById("p-units").value = p.unitsPerPack;
    document.getElementById("p-margin").value = p.profitMarginPercentage;
    document.getElementById("p-stock").value = p.currentStock;
    document.getElementById("p-wholesalePrice").value = p.wholesalePrice || "";
    document.getElementById("p-wholesaleThreshold").value = p.wholesaleQuantityThreshold || "";
    document.getElementById("modalTitle").innerText = "Editar Producto";
    liveCalc();
    myModal.show();
}

function liveCalc() {
    const cost = parseFloat(document.getElementById("p-packCost").value) || 0;
    const units = parseInt(document.getElementById("p-units").value) || 0;
    const margin = parseFloat(document.getElementById("p-margin").value) || 0;
    if (units > 0) {
        const price = (cost / units) * (1 + (margin / 100));
        document.getElementById("live-price-preview").innerText = `Sugerido: $${price.toFixed(2)}`;
    }
}

// --- NAVEGACIÓN Y UTILIDADES ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

function askDelete(id, type) {
    deleteTarget = { id, type };
    let texto = "¿Estás seguro de eliminar este producto?";
    if(type === 'sale') texto = "¿Anular esta venta? El stock regresará al inventario.";
    if(type === 'purchase') texto = "¿Anular esta compra? El stock se restará del inventario.";

    document.getElementById("confirmText").innerText = texto;
    confirmModal.show();
}

async function executeDelete() {
    let path = 'products';
    if(deleteTarget.type === 'sale') path = 'sales';
    if(deleteTarget.type === 'purchase') path = 'supply-orders';

    const res = await fetch(`${API_URL}/${path}/${deleteTarget.id}`, { method: 'DELETE' });
    if(res.ok) {
        confirmModal.hide();
        Swal.fire({icon:'success', title:'Eliminado', timer:1000, showConfirmButton:false});
        await loadProducts();
        await updateBalance();
        toggleHistorial(vistaActualHistorial);
    } else {
        Swal.fire("Error", "No se pudo realizar la eliminación", "error");
    }
}

function filterInventory() {
    const q = document.getElementById("searchInventory").value.toLowerCase();
    document.querySelectorAll("#inventoryTableBody tr").forEach(r => {
        r.style.display = r.cells[0].innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function filterHistorialSearch() {
    const q = document.getElementById("searchSales").value.toLowerCase();
    document.querySelectorAll("#historyTableBody tr").forEach(r => {
        r.style.display = r.cells[1].innerText.toLowerCase().includes(q) ? "" : "none";
    });
}