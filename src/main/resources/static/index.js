const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    // Inicialización de Modales con validación para evitar errores
    const modalEl = document.getElementById('modalProducto');
    const confirmEl = document.getElementById('confirmModal');

    if (modalEl) myModal = new bootstrap.Modal(modalEl);
    if (confirmEl) confirmModal = new bootstrap.Modal(confirmEl);

    // Carga inicial de datos
    loadProducts();
    loadSales();
    updateBalance();

    // Configuración de Buscadores
    const searchInput = document.getElementById("saleSearchProduct");
    if(searchInput) searchInput.addEventListener("input", filterSaleResults);

    const inventorySearch = document.getElementById("searchInventory");
    if(inventorySearch) inventorySearch.addEventListener("input", filterInventory);

    const purchaseSearch = document.getElementById("purchaseSearchProduct");
    if(purchaseSearch) purchaseSearch.addEventListener("input", filterPurchaseResults);

    // Escuchadores de cálculo dinámico en el modal
    const productInputs = ["p-packCost", "p-units", "p-margin"];
    productInputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", liveCalc);
    });

    const qtyInput = document.getElementById("quantity");
    if(qtyInput) qtyInput.addEventListener("input", checkWholesalePriceInSale);

    const btnConfirmDel = document.getElementById("btnConfirmDelete");
    if(btnConfirmDel) btnConfirmDel.addEventListener("click", executeDelete);

    // Manejo de Formularios
    const saleForm = document.getElementById("saleForm");
    if(saleForm) saleForm.addEventListener("submit", handleSaleSubmit);

    const pForm = document.getElementById("purchaseForm");
    if(pForm) pForm.addEventListener("submit", handlePurchaseSubmit);

    const prodForm = document.getElementById("productForm");
    if(prodForm) prodForm.addEventListener("submit", handleProductFormSubmit);

    // Cerrar listas de resultados al hacer click fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            const resSale = document.getElementById("productResults");
            const resPur = document.getElementById("purchaseProductResults");
            if(resSale) resSale.classList.add("d-none");
            if(resPur) resPur.classList.add("d-none");
        }
    });
});

// --- LÓGICA DE BALANCE MENSUAL ---
async function updateBalance() {
    try {
        const res = await fetch(`${API_URL}/balance/current`);
        if(!res.ok) throw new Error("Error en la respuesta del balance");
        const data = await res.json();

        // Actualización de los indicadores superiores
        const mName = document.getElementById("month-name");
        if(mName) mName.innerText = data.monthName || "Mes Actual";

        const netBal = document.getElementById("net-balance");
        if(netBal) netBal.innerText = `$${(data.netBalance || 0).toLocaleString()}`;

        const recap = document.getElementById("total-recap");
        if(recap) recap.innerText = `$${(data.totalSales || 0).toLocaleString()}`;

        const exp = document.getElementById("total-expenses");
        if(exp) exp.innerText = `$${(data.totalExpenses || 0).toLocaleString()}`;

        const sCount = document.getElementById("sales-count");
        if(sCount) sCount.innerText = data.salesCount || "0";

    } catch (e) {
        console.error("Error al actualizar el balance:", e);
    }
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
        // Usamos mousedown para que se ejecute antes del blur del input
        btn.addEventListener("mousedown", () => selectProduct(p));
        resultsDiv.appendChild(btn);
    });

    if (matches.length > 0) resultsDiv.classList.remove("d-none");
    else resultsDiv.classList.add("d-none");
}

function selectProduct(p) {
    const inputId = document.getElementById("productSelect");
    const inputSearch = document.getElementById("saleSearchProduct");
    const labelDiv = document.getElementById("selectedProductLabel");

    if(inputId) inputId.value = p.id;
    if(inputSearch) inputSearch.value = p.name;

    const resultsDiv = document.getElementById("productResults");
    if(resultsDiv) resultsDiv.classList.add("d-none");

    if(labelDiv) labelDiv.classList.remove("d-none");
    checkWholesalePriceInSale();
}

function checkWholesalePriceInSale() {
    const productId = document.getElementById("productSelect")?.value;
    const qtyInput = document.getElementById("quantity");
    const qty = parseInt(qtyInput?.value) || 0;
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

    if(!productId) return Swal.fire("Aviso", "Selecciona un producto de la lista", "info");

    try {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ product: { id: parseInt(productId) }, quantity: parseInt(qty) })
        });

        if(res.ok) {
            Swal.fire({ icon: 'success', title: 'Venta realizada', timer: 1500, showConfirmButton: false });
            e.target.reset();
            const label = document.getElementById("selectedProductLabel");
            if(label) label.classList.add("d-none");
            document.getElementById("productSelect").value = "";

            await loadProducts();
            await loadSales();
            updateBalance();
        } else {
            const errorMsg = await res.text();
            Swal.fire("Error", errorMsg || "No hay stock suficiente", "error");
        }
    } catch (e) { console.error("Error en handleSaleSubmit:", e); }
}

async function loadSales() {
    try {
        const res = await fetch(`${API_URL}/sales`);
        if(!res.ok) return;
        const sales = await res.json();
        const table = document.getElementById("historyTableBody");
        if(!table) return;

        table.innerHTML = "";
        // Invertimos para ver las últimas primero
        sales.reverse().forEach(s => {
            const badgeMay = s.isWholesale ? `<span class="badge bg-info text-dark ms-1" style="font-size: 0.7rem;">MAYORISTA</span>` : "";
            table.innerHTML += `
                <tr>
                    <td class="ps-4">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td><div class="fw-bold">${s.product ? s.product.name : 'Producto Eliminado'}</div>${badgeMay}</td>
                    <td>${s.quantity}</td>
                    <td class="text-success fw-bold">$${(s.totalPrice || 0).toFixed(2)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${s.id}, 'sale')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error("Error en loadSales:", e); }
}

// --- LÓGICA DE COMPRAS (EGRESOS) ---
function filterPurchaseResults() {
    const query = document.getElementById("purchaseSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("purchaseProductResults");
    if (!resultsDiv) return;

    if (query.length < 1) { resultsDiv.classList.add("d-none"); return; }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));
    resultsDiv.innerHTML = "";

    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action";
        btn.innerHTML = `<b>${p.name}</b> <small>(Stock actual: ${p.currentStock})</small>`;
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
    const prodId = document.getElementById("purchaseProductSelect").value;
    if(!prodId) return Swal.fire("Atención", "Selecciona un producto para la compra", "warning");

    const data = {
        product: { id: parseInt(prodId) },
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
            Swal.fire("Compra Registrada", "El stock ha sido actualizado", "success");
            e.target.reset();
            document.getElementById("purchaseProductSelect").value = "";
            await loadProducts();
            updateBalance();
        }
    } catch (e) { console.error("Error en handlePurchaseSubmit:", e); }
}

// --- LÓGICA DE INVENTARIO ---
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        if(!res.ok) return;
        allProducts = await res.json();
        renderTable();
    } catch (e) { console.error("Error cargando productos:", e); }
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
                <td class="ps-4 text-start">
                    <div class="fw-bold">${p.name}</div>
                    <small class="text-muted">ID: #${p.id}</small>
                </td>
                <td><span class="badge ${badgeClass}" style="padding: 8px; min-width: 35px;">${p.currentStock}</span></td>
                <td><div class="txt-minorista">${precioMin}</div></td>
                <td><div class="${tieneMay ? 'txt-mayorista' : 'text-muted'}">${tieneMay ? '$'+p.wholesalePrice.toFixed(2) : '---'}</div></td>
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
            Swal.fire("Éxito", "Producto guardado correctamente", "success");
        } else {
            Swal.fire("Error", "No se pudo guardar el producto", "error");
        }
    } catch (e) { console.error("Error al guardar producto:", e); }
}

function liveCalc() {
    // Esta función precalcula el precio en el modal para ayudar al usuario
    const cost = parseFloat(document.getElementById("p-packCost")?.value) || 0;
    const units = parseInt(document.getElementById("p-units")?.value) || 0;
    const margin = parseFloat(document.getElementById("p-margin")?.value) || 0;

    const unitCost = units > 0 ? cost / units : 0;
    const price = unitCost * (1 + (margin / 100));

    // Si tienes un pequeño span de previsualización en el modal, se vería aquí
    const preview = document.getElementById("live-price-preview");
    if(preview) preview.innerText = `Sugerido: $${price.toFixed(2)}`;
}

function openCreateModal() {
    const form = document.getElementById("productForm");
    if(form) form.reset();
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

// --- UTILIDADES ---
function filterInventory() {
    const q = document.getElementById("searchInventory").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTableBody tr");
    rows.forEach(r => {
        const text = r.cells[0].innerText.toLowerCase();
        r.style.display = text.includes(q) ? "" : "none";
    });
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

    const targetSection = document.getElementById(id);
    const targetLink = document.getElementById(`link-${id}`);

    if(targetSection) targetSection.classList.add('active');
    if(targetLink) targetLink.classList.add('active');
}

function askDelete(id, type) {
    deleteTarget = { id, type };
    const textEl = document.getElementById("confirmText");
    if(textEl) {
        textEl.innerText = type === 'product'
            ? 'Se eliminará el producto del inventario permanentemente.'
            : 'Se anulará la venta y el stock regresará al inventario.';
    }
    confirmModal.show();
}

async function executeDelete() {
    const path = deleteTarget.type === 'product' ? 'products' : 'sales';
    try {
        const res = await fetch(`${API_URL}/${path}/${deleteTarget.id}`, { method: 'DELETE' });
        if(res.ok) {
            confirmModal.hide();
            await loadProducts();
            await loadSales();
            updateBalance();
        } else {
            Swal.fire("Error", "No se pudo realizar la eliminación", "error");
        }
    } catch (e) { console.error("Error al eliminar:", e); }
}