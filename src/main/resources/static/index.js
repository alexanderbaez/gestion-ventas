const API_URL = "/api";
let myModal, confirmModal;
let deleteTarget = { id: null, type: null };
let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    myModal = new bootstrap.Modal(document.getElementById('modalProducto'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    loadProducts();
    loadSales();

    const searchInput = document.getElementById("saleSearchProduct");
    searchInput.addEventListener("input", filterSaleResults);

    const inventorySearch = document.getElementById("searchInventory");
    inventorySearch.addEventListener("input", filterInventory);

    const salesSearch = document.getElementById("searchSales");
    salesSearch.addEventListener("input", filterSalesHistory);

    document.getElementById("filterDate").addEventListener("change", loadSales);

    const productInputs = ["p-packCost", "p-units", "p-margin"];
    productInputs.forEach(id => document.getElementById(id).addEventListener("input", liveCalc));

    document.getElementById("btnConfirmDelete").addEventListener("click", executeDelete);

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-group")) {
            document.getElementById("productResults").classList.add("d-none");
        }
    });
});

function filterSaleResults() {
    const query = document.getElementById("saleSearchProduct").value.toLowerCase();
    const resultsDiv = document.getElementById("productResults");

    if (query.length < 1) {
        resultsDiv.classList.add("d-none");
        return;
    }

    const matches = allProducts.filter(p => p.name.toLowerCase().includes(query));

    resultsDiv.innerHTML = "";
    if (matches.length > 0) {
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
    } else {
        resultsDiv.classList.add("d-none");
    }
}

function selectProduct(p) {
    document.getElementById("productSelect").value = p.id;
    document.getElementById("saleSearchProduct").value = p.name;
    document.getElementById("productResults").classList.add("d-none");

    const label = document.getElementById("selectedProductLabel");
    label.classList.remove("d-none");
    document.getElementById("currentSelectionName").innerText = `${p.name} ($${p.finalSalesPrice})`;
}

async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        allProducts = await res.json();
        renderTable();
    } catch (e) { console.error("Error cargando productos", e); }
}

// CORRECCIÓN VISUAL DE LA TABLA
function renderTable() {
    const table = document.getElementById("inventoryTableBody");
    table.innerHTML = "";
    allProducts.forEach(p => {
        // Definimos las alertas de stock
        const rowClass = p.currentStock <= 2 ? "fila-critica" : (p.currentStock <= 5 ? "fila-advertencia" : "");
        const badgeClass = p.currentStock <= 2 ? "stock-critical" : (p.currentStock <= 5 ? "stock-warning" : "bg-light text-dark");

        // LÓGICA DE PRECIO MAYORISTA:
        // Si el precio existe y es mayor a 0, lo mostramos en AZUL. Si no, avisamos que no tiene.
        const tieneMayorista = p.wholesalePrice && p.wholesalePrice > 0;
        const wholesaleHTML = tieneMayorista
            ? `<div class="fw-bold" style="color: #0ea5e9;">$${p.wholesalePrice.toFixed(2)}</div>
               <small class="text-muted" style="font-size: 0.7rem;">Llevando ${p.wholesaleQuantityThreshold}+ u.</small>`
            : `<span class="text-muted" style="font-size: 0.8rem;">Sin precio x mayor</span>`;

        table.innerHTML += `
            <tr class="${rowClass}">
                <td class="ps-4 text-start">
                    <div class="fw-bold" style="color: #334155;">${p.name}</div>
                    <small class="text-muted">Ref: #${p.id}</small>
                </td>
                <td>
                    <span class="badge ${badgeClass}" style="padding: 8px 12px; border-radius: 8px;">
                        ${p.currentStock}
                    </span>
                </td>
                <td>
                    <div class="fw-bold" style="color: #db2777;">$${p.finalSalesPrice.toFixed(2)}</div>
                    <small class="text-muted" style="font-size: 0.7rem;">Minorista</small>
                </td>
                <td>
                    ${wholesaleHTML}
                </td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn-action btn-edit" onclick='editProduct(${JSON.stringify(p)})'>
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="askDelete(${p.id}, 'product')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
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
    document.getElementById("live-sale-price").innerText = `$${price.toFixed(2)}`;
}

document.getElementById("saleForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const productId = document.getElementById("productSelect").value;
    const qty = document.getElementById("quantity").value;

    if(!productId) return Swal.fire("Aviso", "Busca y selecciona un producto", "info");

    try {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ product: { id: parseInt(productId) }, quantity: parseInt(qty) })
        });

        if(res.ok) {
            Swal.fire({ icon: 'success', title: 'Venta OK', timer: 1500, showConfirmButton: false });
            e.target.reset();
            document.getElementById("selectedProductLabel").classList.add("d-none");
            document.getElementById("productSelect").value = "";
            await loadProducts();
            loadSales();
        } else {
            const errorMsg = await res.text();
            Swal.fire("Error", errorMsg || "No hay stock suficiente", "error");
        }
    } catch (e) { console.error(e); }
});

async function loadSales() {
    const date = document.getElementById("filterDate").value;
    try {
        const res = await fetch(`${API_URL}/sales`);
        let sales = await res.json();
        if(date) sales = sales.filter(s => s.saleDate.includes(date));

        const table = document.getElementById("salesTableBody");
        let profit = 0, capital = 0;
        table.innerHTML = "";

        sales.forEach(s => {
            profit += s.totalProfit;
            capital += s.totalReinvestment;
            table.innerHTML += `
                <tr>
                    <td class="ps-4">${new Date(s.saleDate).toLocaleDateString()}</td>
                    <td class="fw-bold">${s.product ? s.product.name : 'Eliminado'}</td>
                    <td>${s.quantity}</td>
                    <td class="text-success">$${s.totalProfit.toFixed(2)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="askDelete(${s.id}, 'sale')"><i class="bi bi-x-lg"></i></button>
                    </td>
                </tr>`;
        });
        document.getElementById("total-profit").innerText = `$${profit.toLocaleString()}`;
        document.getElementById("total-reinvestment").innerText = `$${capital.toLocaleString()}`;
    } catch (e) { console.error(e); }
}

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
        wholesalePrice: parseFloat(document.getElementById("p-wholesalePrice").value) || null,
        wholesaleQuantityThreshold: parseInt(document.getElementById("p-wholesaleThreshold").value) || null
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
            loadProducts();
            Swal.fire("Guardado", "Cambios aplicados correctamente", "success");
        } else {
            Swal.fire("Error", "No se pudo guardar el producto", "error");
        }
    } catch (error) {
        console.error("Error al guardar:", error);
    }
});

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