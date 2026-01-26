const API_URL = "http://localhost:8080/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };

document.addEventListener("DOMContentLoaded", () => {
    myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    loadProducts();
    loadSales();
    const inputs = ["p-packCost", "p-units", "p-margin"];
    inputs.forEach(id => document.getElementById(id).addEventListener("input", liveCalc));
    document.getElementById("btnConfirmDelete").addEventListener("click", executeDelete);
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(`link-${id}`).classList.add('active');
}

// --- FILTROS Y BUSCADORES ---
function filterSaleSelect() {
    const text = document.getElementById("saleSearchProduct").value.toLowerCase();
    const select = document.getElementById("productSelect");
    const options = select.options;
    for (let i = 0; i < options.length; i++) {
        options[i].style.display = options[i].text.toLowerCase().includes(text) ? "" : "none";
    }
}

function filterInventory() {
    const text = document.getElementById("searchInventory").value.toLowerCase();
    const rows = document.querySelectorAll("#inventoryTableBody tr");
    rows.forEach(row => {
        row.style.display = row.cells[0].innerText.toLowerCase().includes(text) ? "" : "none";
    });
}

function filterSales() {
    const text = document.getElementById("searchSales").value.toLowerCase();
    const rows = document.querySelectorAll("#salesTableBody tr");
    rows.forEach(row => {
        row.style.display = row.cells[1].innerText.toLowerCase().includes(text) ? "" : "none";
    });
}

function clearSalesFilters() {
    document.getElementById("filterDate").value = "";
    document.getElementById("searchSales").value = "";
    loadSales();
}

// --- PRODUCTOS ---
function liveCalc() {
    const costPack = parseFloat(document.getElementById("p-packCost").value) || 0;
    const units = parseInt(document.getElementById("p-units").value) || 0;
    const margin = parseFloat(document.getElementById("p-margin").value) || 0;
    let unitCost = units > 0 ? costPack / units : 0;
    let salePrice = unitCost * (1 + (margin / 100));
    document.getElementById("live-unit-cost").innerText = `$${unitCost.toFixed(2)}`;
    document.getElementById("live-sale-price").innerText = `$${salePrice.toFixed(2)}`;
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        const select = document.getElementById("productSelect");
        const table = document.getElementById("inventoryTableBody");

        select.innerHTML = '';
        table.innerHTML = "";

        products.forEach(p => {
            // Llenar select venta
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.text = `${p.name} (Venta: $${p.finalSalesPrice} - Stock: ${p.currentStock})`;
            select.add(opt);

            // Determinar colores de stock
            let rowClass = "";
            let badgeClass = "bg-light text-dark";
            if (p.currentStock <= 2) { rowClass = "fila-critica"; badgeClass = "stock-critical"; }
            else if (p.currentStock <= 5) { rowClass = "fila-advertencia"; badgeClass = "stock-warning"; }

            // Tabla con TODOS los atributos
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
        filterInventory();
    } catch (e) { console.error(e); }
}

async function executeDelete() {
    if (!deleteTarget.id) return;
    const endpoint = deleteTarget.type === 'product' ? 'products' : 'sales';
    try {
        const res = await fetch(`${API_URL}/${endpoint}/${deleteTarget.id}`, { method: 'DELETE' });
        if(res.ok) {
            confirmModal.hide();
            Swal.fire({ icon: 'success', title: 'Operación Exitosa', showConfirmButton: false, timer: 1500 });
            loadProducts(); loadSales();
        }
    } catch (e) { console.error(e); }
}

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
        filterSales();
    } catch (e) { console.error(e); }
}

document.getElementById("saleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productId = document.getElementById("productSelect").value;
    const quantity = parseInt(document.getElementById("quantity").value);
    if(!productId) return Swal.fire('Error', 'Selecciona un producto', 'warning');

    const data = { product: { id: parseInt(productId) }, quantity: quantity };
    try {
        const res = await fetch(`${API_URL}/sales`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        if (res.ok) {
            loadProducts(); loadSales(); e.target.reset();
            document.getElementById("saleSearchProduct").value = "";
            Swal.fire({ icon: 'success', title: 'Venta Realizada', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        } else {
            const prodRes = await fetch(`${API_URL}/products/${productId}`);
            const p = await prodRes.json();
            Swal.fire({ icon: 'error', title: 'Stock Insuficiente', html: `Solo quedan <b>${p.currentStock}</b> unidades.` });
        }
    } catch (e) { console.error(e); }
});

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

document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("p-id").value;
    const data = {
        name: document.getElementById("p-name").value,
        packCost: parseFloat(document.getElementById("p-packCost").value),
        unitsPerPack: parseInt(document.getElementById("p-units").value),
        profitMarginPercentage: parseFloat(document.getElementById("p-margin").value),
        currentStock: parseInt(document.getElementById("p-stock").value),
        useManualPrice: false
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
    const res = await fetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
    if(res.ok) { myModal.hide(); loadProducts(); Swal.fire({ icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500 }); }
});