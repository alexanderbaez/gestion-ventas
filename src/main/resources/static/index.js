const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    // Carga inicial
    loadProducts();
    loadSales();
    updateBalance();

    // Buscadores
    const searchInput = document.getElementById("saleSearchProduct");
    if(searchInput) searchInput.addEventListener("input", filterSaleResults);

    const inventorySearch = document.getElementById("searchInventory");
    if(inventorySearch) inventorySearch.addEventListener("input", filterInventory);

    const purchaseSearch = document.getElementById("purchaseSearchProduct");
    if(purchaseSearch) purchaseSearch.addEventListener("input", filterPurchaseResults);

    // Escuchadores de cálculo y ventas
    const productInputs = ["p-packCost", "p-units", "p-margin"];
    productInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", liveCalc);
    });

    const qtyInput = document.getElementById("quantity");
    if(qtyInput) qtyInput.addEventListener("input", checkWholesalePriceInSale);

    document.getElementById("btnConfirmDelete").addEventListener("click", executeDelete);

    // Formularios
    document.getElementById("saleForm").addEventListener("submit", handleSaleSubmit);
    const pForm = document.getElementById("purchaseForm");
    if(pForm) pForm.addEventListener("submit", handlePurchaseSubmit);

    // Cerrar resultados al hacer click fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            document.getElementById("productResults").classList.add("d-none");
            const pRes = document.getElementById("purchaseProductResults");
            if(pRes) pRes.classList.add("d-none");
        }
    });
});

// --- LÓGICA DE BALANCE MENSUAL (CON IDs CORRECTOS) ---
async function updateBalance() {
    try {
        const res = await fetch(`${API_URL}/balance/current`);
        if(!res.ok) return;
        const data = await res.json();

        // Mapeo exacto a los IDs del nuevo HTML
        const mName = document.getElementById("month-name");
        if(mName) mName.innerText = data.monthName || "Mes";

        const netBal = document.getElementById("net-balance");
        if(netBal) netBal.innerText = `$${data.netBalance.toLocaleString()}`;

        const recap = document.getElementById("total-recap");
        if(recap) recap.innerText = `$${data.totalSales.toLocaleString()}`;

        const exp = document.getElementById("total-expenses");
        if(exp) exp.innerText = `$${data.totalExpenses.toLocaleString()}`;

        const sCount = document.getElementById("sales-count");
        if(sCount) sCount.innerText = data.salesCount || "0";

    } catch (e) { console.error("Error balance:", e); }
}

// --- LÓGICA DE VENTAS ---

function filterSaleResults() {
    const query = document.getElementById("saleSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("productResults");
    if (query.length < 1) { resultsDiv.classList.add("d-none"); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resultsDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        btn.innerHTML = `
            <div class="text-start">
                <div class="fw-bold">${p.name}</div>
                <small class="text-muted">Stock: ${p.currentStock}</small>
            </div>
            <span class="badge bg-primary">$${p.finalSalesPrice.toFixed(2)}</span>
        `;
        btn.addEventListener("mousedown", () => selectProduct(p));
        resultsDiv.appendChild(btn);
    });
    resultsDiv.classList.remove("d-none");
}

function selectProduct(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");
    const label = document.getElementById("selectedProductLabel");
    label.classList.remove("d-none");
    checkWholesalePriceInSale();
}

function checkWholesalePriceInSale() {
    const productId = document.getElementById("productSelect").value;
    const qty = parseInt(document.getElementById("quantity").value) || 0;
    const label = document.getElementById("currentSelectionName");
    if (!productId) return;
    const p = allProducts.find(prod => prod.id == productId);
    if (p && p.wholesalePrice && qty >= p.wholesaleQuantityThreshold) {
        label.innerHTML = `${p.name} <span class="badge bg-info text-dark">¡MAYORISTA: $${p.wholesalePrice.toFixed(2)}!</span>`;
    } else if (p) {
        label.innerText = `${p.name} ($${p.finalSalesPrice.toFixed(2)})`;
    }
}

async function handleSaleSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById("productSelect").value;
    const qty = document.getElementById("quantity").value;
    if(!productId) return Swal.fire("Aviso", "Selecciona un producto", "info");

    try {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ product: { id: parseInt(productId) }, quantity: parseInt(qty) })
        });
        if(res.ok) {
            Swal.fire({ icon: 'success', title: 'Venta realizada', timer: 1500, showConfirmButton: false });
            e.target.reset();
            document.getElementById("selectedProductLabel").classList.add("d-none");
            document.getElementById("productSelect").value = "";
            await loadProducts();
            loadSales();
            updateBalance();
        } else {
            const errorMsg = await res.text();
            Swal.fire("Error", errorMsg || "No hay stock", "error");
        }
    } catch (e) { console.error(e); }
}

async function loadSales() {
    try {
        const res = await fetch(`${API_URL}/sales`);
        const sales = await res.json();
        const table = document.getElementById("historyTableBody");
        if(!table) return;

        table.innerHTML = "";
        sales.forEach(s => {
            const badgeMay = s.isWholesale ? `<span class="badge bg-info text-dark ms-1">MAYORISTA</span>` : "";
            table.innerHTML += `
                <tr>
                    <td class="ps-4">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td><div class="fw-bold">${s.product ? s.product.name : 'Eliminado'}</div>${badgeMay}</td>
                    <td>${s.quantity}</td>
                    <td class="text-success fw-bold">$${s.totalPrice.toFixed(2)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${s.id}, 'sale')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
        updateBalance();
    } catch (e) { console.error(e); }
}

// --- LÓGICA DE COMPRAS ---

function filterPurchaseResults() {
    const query = document.getElementById("purchaseSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("purchaseProductResults");
    if (query.length < 1) { resultsDiv.classList.add("d-none"); return; }
    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resultsDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action";
        btn.innerHTML = `<b>${p.name}</b> <small>(Stock: ${p.currentStock})</small>`;
        btn.onclick = () => {
            document.getElementById("purchaseProductSelect").value = p.id;
            document.getElementById("purchaseSearchProduct").value = p.name;
            resultsDiv.classList.add("d-none");
        };
        resultsDiv.appendChild(btn);
    });
    resultsDiv.classList.remove("d-none");
}

async function handlePurchaseSubmit(e) {
    e.preventDefault();
    const data = {
        product: { id: parseInt(document.getElementById("purchaseProductSelect").value) },
        quantityPacks: parseInt(document.getElementById("purchasePacks").value),
        totalCost: parseFloat(document.getElementById("purchaseTotalCost").value)
    };
    try {
        const res = await fetch(`${API_URL}/supply-orders`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) {
            Swal.fire("Compra Registrada", "Stock actualizado", "success");
            e.target.reset();
            loadProducts();
            updateBalance();
        }
    } catch (e) { console.error(e); }
}

// --- LÓGICA DE INVENTARIO ---

async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        allProducts = await res.json();
        renderTable();
    } catch (e) { console.error("Error cargando productos", e); }
}

function renderTable() {
    const table = document.getElementById("inventoryTableBody");
    if(!table) return;
    table.innerHTML = "";
    allProducts.forEach(p => {
        const rowClass = p.currentStock <= 2 ? "fila-critica" : (p.currentStock <= 5 ? "fila-advertencia" : "");
        const badgeClass = p.currentStock <= 2 ? "stock-critical" : (p.currentStock <= 5 ? "stock-warning" : "bg-light text-dark");
        const precioMin = p.finalSalesPrice ? `$${p.finalSalesPrice.toFixed(2)}` : "$0.00";
        const tieneMay = p.wholesalePrice > 0;

        table.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4 text-start"><div class="fw-bold">${p.name}</div><small class="text-muted">ID: #${p.id}</small></td>
                <td><span class="badge ${badgeClass}" style="padding: 8px;">${p.currentStock}</span></td>
                <td><div class="txt-minorista">${precioMin}</div></td>
                <td><div class="${tieneMay ? 'txt-mayorista' : 'text-muted'}">${tieneMay ? '$'+p.wholesalePrice.toFixed(2) : 'No asignado'}</div></td>
                <td class="text-end pe-4">
                    <button class="btn-action" onclick='editProduct(${JSON.stringify(p)})'><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn-action text-danger" onclick="askDelete(${p.id}, 'product')"><i class="bi bi-trash-fill"></i></button>
                </td>
            </tr>`;
    });
}

function liveCalc() {
    const cost = parseFloat(document.getElementById("p-packCost").value) || 0;
    const units = parseInt(document.getElementById("p-units").value) || 0;
    const margin = parseFloat(document.getElementById("p-margin").value) || 0;
    const unitCost = units > 0 ? cost / units : 0;
    const price = unitCost * (1 + (margin / 100));
    // No hay elemento 'live-sale-price' en este HTML, pero se mantiene la lógica si existiera
}

function openCreateModal() {
    document.getElementById("productForm").reset();
    document.getElementById("p-id").value = "";
    document.getElementById("modalTitle").innerText = "Nuevo Producto";
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
    myModal.show();
}

document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("p-id").value;
    const data = {
        name: document.getElementById("p-name").value,
        packCost: parseFloat(document.getElementById("p-packCost").value),
        unitsPerPack: parseInt(document.getElementById("p-units").value),
        profitMarginPercentage: parseFloat(document.getElementById("p-margin").value),
        currentStock: parseInt(document.getElementById("p-stock").value),
        wholesalePrice: document.getElementById("p-wholesalePrice").value !== "" ? parseFloat(document.getElementById("p-wholesalePrice").value) : null,
        wholesaleQuantityThreshold: document.getElementById("p-wholesaleThreshold").value !== "" ? parseInt(document.getElementById("p-wholesaleThreshold").value) : null
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
    try {
        const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { myModal.hide(); await loadProducts(); updateBalance(); Swal.fire("Éxito", "Producto guardado", "success"); }
    } catch (e) { console.error(e); }
});

// --- UTILIDADES ---

function filterInventory() {
    const q = document.getElementById("searchInventory").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTableBody tr");
    rows.forEach(r => r.style.display = r.cells[0].innerText.toLowerCase().includes(q) ? "" : "none");
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

function askDelete(id, type) {
    deleteTarget = { id, type };
    document.getElementById("confirmText").innerText = type === 'product' ? 'Se eliminará el producto.' : 'Se anulará la venta y volverá el stock.';
    confirmModal.show();
}

async function executeDelete() {
    const path = deleteTarget.type === 'product' ? 'products' : 'sales';
    await fetch(`${API_URL}/${path}/${deleteTarget.id}`, { method: 'DELETE' });
    confirmModal.hide();
    await loadProducts();
    await loadSales();
    updateBalance();
}