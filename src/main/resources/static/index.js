const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    initApp();

    // Buscadores
    document.getElementById("saleSearchProduct").addEventListener("input", (e) => filterResults(e.target.value, "productResults", selectProduct));
    document.getElementById("purchaseSearchProduct").addEventListener("input", (e) => filterResults(e.target.value, "purchaseProductResults", selectProductForPurchase));

    // Cálculos y eventos
    document.getElementById("quantity").addEventListener("input", checkWholesalePriceInSale);
    ["p-packCost", "p-units", "p-margin"].forEach(id => document.getElementById(id).addEventListener("input", liveCalc));
    document.getElementById("btnConfirmDelete").addEventListener("click", executeDelete);

    // Forms
    document.getElementById("saleForm").addEventListener("submit", handleSale);
    document.getElementById("purchaseForm").addEventListener("submit", handlePurchase);

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group") && !e.target.closest("#purchaseForm")) {
            document.querySelectorAll(".list-group").forEach(el => el.classList.add("d-none"));
        }
    });
});

async function initApp() {
    await loadProducts();
    await updateBalance();
}

// --- BALANCE MENSUAL (PROFESIONAL) ---
async function updateBalance() {
    try {
        const res = await fetch(`${API_URL}/balance/current`);
        const data = await res.json();
        document.getElementById("month-name").innerText = data.monthName.toUpperCase();
        document.getElementById("net-balance").innerText = `$${data.netBalance.toLocaleString()}`;
        document.getElementById("total-recap").innerText = `$${data.totalSales.toLocaleString()}`;
        document.getElementById("total-expenses").innerText = `$${data.totalExpenses.toLocaleString()}`;
        document.getElementById("sales-count").innerText = data.salesCount;
    } catch (e) { console.error("Error balance:", e); }
}

// --- LÓGICA DE VENTAS ---
function filterResults(query, divId, selectFn) {
    const resultsDiv = document.getElementById(divId);
    if (query.length < 1) { resultsDiv.classList.add("d-none"); return; }
    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    resultsDiv.innerHTML = "";
    matches.forEach(p => {
        const btn = document.createElement("button");
        btn.className = "list-group-item list-group-item-action d-flex justify-content-between";
        btn.innerHTML = `<b>${p.name}</b> <span class="badge bg-secondary">Stock: ${p.currentStock}</span>`;
        btn.onclick = () => selectFn(p);
        resultsDiv.appendChild(btn);
    });
    resultsDiv.classList.remove("d-none");
}

function selectProduct(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");
    document.getElementById("selectedProductLabel").classList.remove("d-none");
    checkWholesalePriceInSale();
}

async function handleSale(e) {
    e.preventDefault();
    const data = { product: { id: parseInt(document.getElementById("productSelect").value) }, quantity: parseInt(document.getElementById("quantity").value) };
    const res = await fetch(`${API_URL}/sales`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(res.ok) {
        Swal.fire("Venta Exitosa", "", "success");
        e.target.reset();
        initApp();
    } else { Swal.fire("Error", "Sin stock o problema de conexión", "error"); }
}

// --- LÓGICA DE COMPRAS (EGRESOS) ---
function selectProductForPurchase(p) {
    document.getElementById("purchaseProductSelect").value = p.id;
    document.getElementById("purchaseSearchProduct").value = p.name;
    document.getElementById("purchaseProductResults").classList.add("d-none");
}

async function handlePurchase(e) {
    e.preventDefault();
    const data = {
        product: { id: parseInt(document.getElementById("purchaseProductSelect").value) },
        quantityPacks: parseInt(document.getElementById("purchasePacks").value),
        totalCost: parseFloat(document.getElementById("purchaseTotalCost").value)
    };
    const res = await fetch(`${API_URL}/supply-orders`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(res.ok) {
        Swal.fire("Compra Registrada", "Stock actualizado y egreso anotado", "success");
        e.target.reset();
        initApp();
    }
}

// --- INVENTARIO Y OTROS ---
async function loadProducts() {
    const res = await fetch(`${API_URL}/products`);
    allProducts = await res.json();
    const table = document.getElementById("inventoryTableBody");
    table.innerHTML = "";
    allProducts.forEach(p => {
        const rowClass = p.currentStock <= 2 ? "fila-critica" : (p.currentStock <= 5 ? "fila-advertencia" : "");
        table.innerHTML += `<tr class="${rowClass}">
            <td>${p.name}</td>
            <td><span class="badge ${p.currentStock <= 2 ? 'bg-danger' : 'bg-dark'}">${p.currentStock}</span></td>
            <td class="txt-minorista">$${p.finalSalesPrice.toFixed(2)}</td>
            <td class="txt-mayorista">$${p.wholesalePrice ? p.wholesalePrice.toFixed(2) : '-'}</td>
            <td>
                <button class="btn-action btn-edit" onclick='editProduct(${JSON.stringify(p)})'><i class="bi bi-pencil"></i></button>
            </td>
        </tr>`;
    });
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

// (Mantenemos las funciones liveCalc, openCreateModal y editProduct que ya tenías)

function liveCalc() {
    const cost = parseFloat(document.getElementById("p-packCost").value) || 0;
    const units = parseInt(document.getElementById("p-units").value) || 0;
    const margin = parseFloat(document.getElementById("p-margin").value) || 0;
    const unitCost = units > 0 ? cost / units : 0;
    const price = unitCost * (1 + (margin / 100));
    document.getElementById("live-sale-price").innerText = `$${price.toFixed(2)}`;
}

function openCreateModal() {
    document.getElementById("productForm").reset();
    document.getElementById("p-id").value = "";
    document.getElementById("modalTitle").innerText = "Nuevo Producto";
    liveCalc();
    myModal.show();
}

function editProduct(p) {
    document.getElementById("p-id").value = p.id;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-packCost").value = p.packCost;
    document.getElementById("p-units").value = p.unitsPerPack;
    document.getElementById("p-margin").value = p.profitMarginPercentage;
    document.getElementById("p-stock").value = p.currentStock;

    // Seteo correcto de campos mayoristas
    document.getElementById("p-wholesalePrice").value = p.wholesalePrice || "";
    document.getElementById("p-wholesaleThreshold").value = p.wholesaleQuantityThreshold || "";

    document.getElementById("modalTitle").innerText = "Editar Producto";
    liveCalc();
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
        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if(res.ok) {
            myModal.hide();
            await loadProducts();
            Swal.fire("Guardado", "Cambios aplicados correctamente", "success");
        } else {
            Swal.fire("Error", "No se pudo guardar el producto", "error");
        }
    } catch (error) { console.error("Error al guardar:", error); }
});

// --- UTILIDADES ---

function filterInventory() {
    const q = document.getElementById("searchInventory").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTableBody tr");
    rows.forEach(r => r.style.display = r.cells[0].innerText.toLowerCase().includes(q) ? "" : "none");
}

function filterSalesHistory() {
    const q = document.getElementById("searchSales").value.toLowerCase();
    const rows = document.querySelectorAll("#salesTableBody tr");
    rows.forEach(r => r.style.display = r.cells[1].innerText.toLowerCase().includes(q) ? "" : "none");
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

function askDelete(id, type) {
    deleteTarget = { id, type };
    document.getElementById("confirmText").innerText = type === 'product' ? 'Eliminarás este producto para siempre.' : 'La venta se anulará y el stock volverá.';
    confirmModal.show();
}

async function executeDelete() {
    const path = deleteTarget.type === 'product' ? 'products' : 'sales';
    await fetch(`${API_URL}/${path}/${deleteTarget.id}`, { method: 'DELETE' });
    confirmModal.hide();
    loadProducts();
    loadSales();
}