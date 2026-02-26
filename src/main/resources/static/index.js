const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de Modales
    const modalEl = document.getElementById('modalProducto');
    const confirmEl = document.getElementById('confirmModal');
    if (modalEl) myModal = new bootstrap.Modal(modalEl);
    if (confirmEl) confirmModal = new bootstrap.Modal(confirmEl);

    // Carga inicial de datos desde el backend
    loadProducts();
    loadSales();
    updateBalance();

    // --- CONFIGURACIÓN DE BUSCADORES ---
    const searchInput = document.getElementById("saleSearchProduct");
    if(searchInput) searchInput.addEventListener("input", filterSaleResults);

    const inventorySearch = document.getElementById("searchInventory");
    if(inventorySearch) inventorySearch.addEventListener("input", filterInventory);

    const salesSearch = document.getElementById("searchSales"); // Buscador en historial
    if(salesSearch) salesSearch.addEventListener("input", filterSalesHistory);

    const purchaseSearch = document.getElementById("purchaseSearchProduct");
    if(purchaseSearch) purchaseSearch.addEventListener("input", filterPurchaseResults);

    // Filtro de fecha para ventas
    const filterDate = document.getElementById("filterDate");
    if(filterDate) filterDate.addEventListener("change", loadSales);

    // --- ESCUCHADORES DE CÁLCULO DINÁMICO ---
    const productInputs = ["p-packCost", "p-units", "p-margin"];
    productInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", liveCalc);
    });

    const qtyInput = document.getElementById("quantity");
    if(qtyInput) qtyInput.addEventListener("input", checkWholesalePriceInSale);

    const btnConfirmDel = document.getElementById("btnConfirmDelete");
    if(btnConfirmDel) btnConfirmDel.addEventListener("click", executeDelete);

    // --- MANEJO DE FORMULARIOS ---
    const saleForm = document.getElementById("saleForm");
    if(saleForm) saleForm.addEventListener("submit", handleSaleSubmit);

    const purchaseForm = document.getElementById("purchaseForm");
    if(purchaseForm) purchaseForm.addEventListener("submit", handlePurchaseSubmit);

    const productForm = document.getElementById("productForm");
    if(productForm) productForm.addEventListener("submit", handleProductFormSubmit);

    // Cerrar resultados al hacer click fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            const resSale = document.getElementById("productResults");
            const resPur = document.getElementById("purchaseProductResults");
            if(resSale) resSale.classList.add("d-none");
            if(resPur) resPur.classList.add("d-none");
        }
    });
});

// --- LÓGICA DE BALANCE (Mapeo con Java Entity) ---
async function updateBalance() {
    try {
        const res = await fetch(`${API_URL}/balance/current`);
        if(!res.ok) return;
        const data = await res.json();

        const monthEl = document.getElementById("month-name");
        if(monthEl) monthEl.innerText = (data.monthName || "MES").toUpperCase();

        // IDs vinculados al HTML profesional
        if(document.getElementById("net-balance"))
            document.getElementById("net-balance").innerText = `$${(data.netBalance || 0).toLocaleString()}`;

        if(document.getElementById("total-recap"))
            document.getElementById("total-recap").innerText = `$${(data.totalSales || 0).toLocaleString()}`;

        if(document.getElementById("total-expenses"))
            document.getElementById("total-expenses").innerText = `$${(data.totalExpenses || 0).toLocaleString()}`;

        if(document.getElementById("sales-count"))
            document.getElementById("sales-count").innerText = data.salesCount || "0";

    } catch (e) { console.error("Error Balance:", e); }
}

// --- LÓGICA DE VENTAS ---
function filterSaleResults() {
    const query = document.getElementById("saleSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("productResults");
    if (!resultsDiv) return;
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
            <span class="badge bg-primary">$${(p.finalSalesPrice || 0).toFixed(2)}</span>
        `;
        btn.addEventListener("mousedown", () => selectProduct(p));
        resultsDiv.appendChild(btn);
    });
    resultsDiv.classList.toggle("d-none", matches.length === 0);
}

function selectProduct(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");
    document.getElementById("selectedProductLabel").classList.remove("d-none");
    checkWholesalePriceInSale();
}

function checkWholesalePriceInSale() {
    const productId = document.getElementById("productSelect")?.value;
    const qty = parseInt(document.getElementById("quantity")?.value) || 0;
    const label = document.getElementById("currentSelectionName");
    if (!productId || !label) return;

    const p = allProducts.find(prod => prod.id == productId);
    if (p && p.wholesalePrice && qty >= p.wholesaleQuantityThreshold) {
        label.innerHTML = `${p.name} <span class="badge bg-info text-dark">¡MAYORISTA: $${p.wholesalePrice.toFixed(2)}!</span>`;
    } else if (p) {
        label.innerText = `${p.name} ($${(p.finalSalesPrice || 0).toFixed(2)})`;
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
            Swal.fire({ icon: 'success', title: 'Venta exitosa', timer: 1500, showConfirmButton: false });
            e.target.reset();
            document.getElementById("selectedProductLabel").classList.add("d-none");
            await loadProducts();
            await loadSales();
            updateBalance();
        } else {
            const msg = await res.text();
            Swal.fire("Error", msg || "Stock insuficiente", "error");
        }
    } catch (e) { console.error(e); }
}

async function loadSales() {
    const dateFilter = document.getElementById("filterDate")?.value;
    try {
        const res = await fetch(`${API_URL}/sales`);
        if(!res.ok) return;
        let sales = await res.json();

        if(dateFilter) sales = sales.filter(s => s.saleDate.includes(dateFilter));

        const table = document.getElementById("historyTableBody");
        if(!table) return;
        table.innerHTML = "";

        sales.reverse().forEach(s => {
            const badgeMay = s.isWholesale ? `<span class="badge bg-info text-dark ms-1">MAYORISTA</span>` : "";
            // El backend usa totalProfit para el dinero neto
            const monto = s.totalProfit || 0;
            table.innerHTML += `
                <tr>
                    <td class="ps-4">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td><div class="fw-bold">${s.product ? s.product.name : 'Eliminado'}</div>${badgeMay}</td>
                    <td>${s.quantity}</td>
                    <td class="text-success fw-bold">$${monto.toFixed(2)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${s.id}, 'sale')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// --- LÓGICA DE INVENTARIO ---
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) return;
        allProducts = await res.json();
        renderTable();
    } catch (e) { console.error(e); }
}

function renderTable() {
    const table = document.getElementById("inventoryTableBody");
    if(!table) return;
    table.innerHTML = "";

    allProducts.forEach(p => {
        const rowClass = p.currentStock <= 2 ? "fila-critica" : (p.currentStock <= 5 ? "fila-advertencia" : "");
        const badgeClass = p.currentStock <= 2 ? "stock-critical" : (p.currentStock <= 5 ? "stock-warning" : "bg-light text-dark");
        const tieneMay = p.wholesalePrice > 0;

        table.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4 text-start">
                    <div class="fw-bold">${p.name}</div>
                    <small class="text-muted">ID: #${p.id}</small>
                </td>
                <td><span class="badge ${badgeClass}" style="padding: 8px; min-width: 35px;">${p.currentStock}</span></td>
                <td><div class="txt-minorista">$${(p.finalSalesPrice || 0).toFixed(2)}</div></td>
                <td>
                    <div class="${tieneMay ? 'txt-mayorista' : 'text-muted'}">${tieneMay ? '$'+p.wholesalePrice.toFixed(2) : '---'}</div>
                    ${tieneMay ? `<small style="font-size:0.65rem">Desde ${p.wholesaleQuantityThreshold} un.</small>` : ''}
                </td>
                <td class="text-end pe-4">
                    <button class="btn-action me-1" onclick='editProduct(${JSON.stringify(p)})'>
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn-action text-danger" onclick="askDelete(${p.id}, 'product')">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            </tr>`;
    });
}

async function handleProductFormSubmit(e) {
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
        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) {
            myModal.hide();
            await loadProducts();
            updateBalance();
            Swal.fire("Guardado", "Producto actualizado", "success");
        } else {
            Swal.fire("Error", "No se pudo guardar", "error");
        }
    } catch (e) { console.error(e); }
}

function liveCalc() {
    const cost = parseFloat(document.getElementById("p-packCost")?.value) || 0;
    const units = parseInt(document.getElementById("p-units")?.value) || 0;
    const margin = parseFloat(document.getElementById("p-margin")?.value) || 0;

    if (units > 0) {
        const unitCost = cost / units;
        const price = unitCost * (1 + (margin / 100));
        const preview = document.getElementById("live-price-preview");
        if(preview) preview.innerText = `Sugerido: $${price.toFixed(2)}`;
    }
}

function openCreateModal() {
    const form = document.getElementById("productForm");
    if(form) form.reset();
    document.getElementById("p-id").value = "";
    document.getElementById("modalTitle").innerText = "Nuevo Producto";
    if(document.getElementById("live-price-preview")) document.getElementById("live-price-preview").innerText = "Sugerido: $0.00";
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

// --- LÓGICA DE COMPRAS (ABACO) ---
function filterPurchaseResults() {
    const query = document.getElementById("purchaseSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("purchaseProductResults");
    if (!resultsDiv || query.length < 1) { resultsDiv?.classList.add("d-none"); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resultsDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "list-group-item list-group-item-action";
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
            Swal.fire("Éxito", "Compra registrada y stock actualizado", "success");
            e.target.reset();
            await loadProducts();
            updateBalance();
        }
    } catch (e) { console.error(e); }
}

// --- UTILIDADES ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.getElementById(`link-${id}`)?.classList.add('active');
}

function askDelete(id, type) {
    deleteTarget = { id, type };
    const textEl = document.getElementById("confirmText");
    if(textEl) {
        textEl.innerText = type === 'product' ? '¿Eliminar producto permanentemente?' : '¿Anular venta y devolver stock?';
    }
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

function filterInventory() {
    const q = document.getElementById("searchInventory").value.toLowerCase();
    document.querySelectorAll("#inventoryTableBody tr").forEach(r => {
        r.style.display = r.cells[0].innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function filterSalesHistory() {
    const q = document.getElementById("searchSales").value.toLowerCase();
    document.querySelectorAll("#historyTableBody tr").forEach(r => {
        r.style.display = r.cells[1].innerText.toLowerCase().includes(q) ? "" : "none";
    });
}