const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    loadProducts();
    loadSales();

    const inputs = ["p-packCost", "p-units", "p-margin"];
    inputs.forEach(id => document.getElementById(id).addEventListener("input", liveCalc));
    document.getElementById("btnConfirmDelete").addEventListener("click", executeDelete);

    // Cerrar buscador al hacer clic fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            document.getElementById("productResults").classList.add("d-none");
        }
    });
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

// --- BUSCADOR DE VENTAS ---
function filterSaleSelect() {
    const text = document.getElementById("saleSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("productResults");

    if (text.length < 1) {
        resultsDiv.classList.add("d-none");
        return;
    }

    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(text));

    resultsDiv.innerHTML = "";
    if (filtered.length > 0) {
        filtered.forEach(p => {
            const item = document.createElement("a");
            item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center bg-white";
            item.innerHTML = `
                <div>
                    <div class="fw-bold text-dark">${p.name}</div>
                    <small class="text-muted">Stock: ${p.currentStock} unid.</small>
                </div>
                <span class="badge bg-primary rounded-pill">$${p.finalSalesPrice.toFixed(2)}</span>
            `;
            item.onclick = () => selectProductForSale(p);
            resultsDiv.appendChild(item);
        });
        resultsDiv.classList.remove("d-none");
    } else {
        resultsDiv.classList.add("d-none");
    }
}

function selectProductForSale(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");
    document.getElementById("selectedProductLabel").classList.remove("d-none");
    document.getElementById("currentSelectionName").innerText = `${p.name} - $${p.finalSalesPrice}`;
}

// --- GESTIÓN DE PRODUCTOS ---
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        allProducts = await response.json();
        renderInventoryTable();
    } catch (e) { console.error(e); }
}

function renderInventoryTable() {
    const table = document.getElementById("inventoryTableBody");
    table.innerHTML = "";
    allProducts.forEach(p => {
        let rowClass = p.currentStock <= 2 ? "fila-critica" : (p.currentStock <= 5 ? "fila-advertencia" : "");
        let badgeClass = p.currentStock <= 2 ? "stock-critical" : (p.currentStock <= 5 ? "stock-warning" : "bg-light text-dark");

        table.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4 text-start fw-bold text-dark">${p.name}</td>
                <td><span class="badge ${badgeClass} p-2 border">${p.currentStock} u.</span></td>
                <td class="text-muted">$${p.packCost.toFixed(2)}</td>
                <td>${p.unitsPerPack}</td>
                <td class="fw-bold text-secondary">$${p.unitCost.toFixed(2)}</td>
                <td class="text-success">${p.profitMarginPercentage}%</td>
                <td class="text-primary fw-bold">$${p.finalSalesPrice.toFixed(2)}</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn-action btn-edit" onclick='editProduct(${JSON.stringify(p)})'><i class="bi bi-pencil-square"></i></button>
                        <button class="btn-action btn-delete" onclick="askDelete(${p.id}, 'product')"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            </tr>`;
    });
}

function liveCalc() {
    const costPack = parseFloat(document.getElementById("p-packCost").value) || 0;
    const units = parseInt(document.getElementById("p-units").value) || 0;
    const margin = parseFloat(document.getElementById("p-margin").value) || 0;
    let unitCost = units > 0 ? costPack / units : 0;
    let salePrice = unitCost * (1 + (margin / 100));
    document.getElementById("live-unit-cost").innerText = `$${unitCost.toFixed(2)}`;
    document.getElementById("live-sale-price").innerText = `$${salePrice.toFixed(2)}`;
}

// --- VENTAS ---
async function loadSales() {
    const filter = document.getElementById("filterDate").value;
    try {
        const res = await fetch(`${API_URL}/sales`);
        let sales = await res.json();
        if(filter) sales = sales.filter(s => s.saleDate.includes(filter));
        const table = document.getElementById("salesTableBody");
        let tProfit = 0, tReinv = 0;
        table.innerHTML = "";
        sales.forEach(s => {
            tProfit += s.totalProfit; tReinv += s.totalReinvestment;
            table.innerHTML += `
                <tr>
                    <td class="ps-4 small text-muted text-start">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td class="fw-bold text-start">${s.product ? s.product.name : 'Eliminado'}</td>
                    <td>${s.quantity} u.</td>
                    <td class="text-success fw-bold">$${s.totalProfit.toFixed(2)}</td>
                    <td class="text-end pe-4">
                        <button class="btn-action btn-delete" onclick="askDelete(${s.id}, 'sale')">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </td>
                </tr>`;
        });
        document.getElementById("total-profit").innerText = `$${tProfit.toLocaleString()}`;
        document.getElementById("total-reinvestment").innerText = `$${tReinv.toLocaleString()}`;
    } catch (e) { console.error(e); }
}

document.getElementById("saleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productId = document.getElementById("productSelect").value;
    const quantity = parseInt(document.getElementById("quantity").value);
    if(!productId) return Swal.fire('Error', 'Selecciona un producto del buscador', 'warning');

    const data = { product: { id: parseInt(productId) }, quantity: quantity };
    try {
        const res = await fetch(`${API_URL}/sales`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        if (res.ok) {
            await loadProducts(); loadSales(); e.target.reset();
            document.getElementById("selectedProductLabel").classList.add("d-none");
            document.getElementById("productSelect").value = "";
            Swal.fire({ icon: 'success', title: 'Venta Realizada', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } else {
            Swal.fire({ icon: 'error', title: 'Stock Insuficiente', text: 'Revisa el inventario antes de vender.' });
        }
    } catch (e) { console.error(e); }
});

// --- OPERACIONES COMUNES ---
function openCreateModal() {
    document.getElementById("productForm").reset();
    document.getElementById("p-id").value = "";
    document.getElementById("modalTitle").innerText = "Nuevo Ingreso";
    liveCalc(); myModal.show();
}

function editProduct(p) {
    document.getElementById("p-id").value = p.id;
    document.getElementById("p-name").value = p.name;
    document.getElementById("p-packCost").value = p.packCost;
    document.getElementById("p-units").value = p.unitsPerPack;
    document.getElementById("p-margin").value = p.profitMarginPercentage;
    document.getElementById("p-stock").value = p.currentStock;
    document.getElementById("modalTitle").innerText = "Editar Producto";
    liveCalc(); myModal.show();
}

function askDelete(id, type) {
    deleteTarget = { id: id, type: type };
    document.getElementById("confirmText").innerText = type === 'product' ? '¿Borrar producto del inventario?' : '¿Anular venta? El stock regresará al inventario.';
    confirmModal.show();
}

async function executeDelete() {
    const endpoint = deleteTarget.type === 'product' ? 'products' : 'sales';
    try {
        const res = await fetch(`${API_URL}/${endpoint}/${deleteTarget.id}`, { method: 'DELETE' });
        if(res.ok) {
            confirmModal.hide();
            Swal.fire({ icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1500 });
            loadProducts(); loadSales();
        }
    } catch (e) { console.error(e); }
}

function filterInventory() {
    const text = document.getElementById("searchInventory").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTableBody tr");
    rows.forEach(row => row.style.display = row.cells[0].innerText.toLowerCase().includes(text) ? "" : "none");
}

function filterSales() {
    const text = document.getElementById("searchSales").value.toLowerCase();
    const rows = document.querySelectorAll("#salesTableBody tr");
    rows.forEach(row => row.style.display = row.cells[1].innerText.toLowerCase().includes(text) ? "" : "none");
}

function clearSalesFilters() {
    document.getElementById("filterDate").value = "";
    document.getElementById("searchSales").value = "";
    loadSales();
}