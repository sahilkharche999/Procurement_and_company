import { api } from "../../redux/api/apiClient"
import { BUDGET_TABLE_COLUMNS } from "./budgetColumns"

/**
 * Fetch all budget items for export (no pagination).
 */
async function fetchExportData(projectId, section, groupByRoom, groupByPage) {
    const params = new URLSearchParams({
        section: section || "general",
        group_by_room: groupByRoom || false,
        group_by_page: groupByPage || false,
    })
    const res = await api.get(`/budget/${projectId}/export?${params}`)
    return res.data
}

/**
 * Format a number as currency string.
 */
function fmtCurrency(val) {
    if (val == null) return ""
    return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcel({
    projectId,
    section,
    groupByRoom,
    groupByPage,
    columnVisibility,
    fileName = `budget_export_${new Date().toISOString().slice(0, 10)}`
}) {
    const xlsxModule = await import("xlsx")
    const XLSX = xlsxModule.default || xlsxModule
    const data = await fetchExportData(projectId, section, groupByRoom, groupByPage)
    const { items, grand_total, room_totals } = data

    const activeColumns = BUDGET_TABLE_COLUMNS.filter(
        col => columnVisibility[col.id] !== false && col.id !== 'actions'
    );

    const rows = []
    let prevRoom = null

    // Helper to build a row object based on active columns
    const buildRow = (item, isSubItem = false) => {
        const row = {};
        activeColumns.forEach(col => {
            let val = "";
            let prefix = (isSubItem && col.id === "specNo") ? "  ↳ " : "";

            switch (col.id) {
                case "specNo": val = item.spec_no; break;
                case "description": val = item.description; break;
                case "type": val = item.type; break;
                case "room":
                    val = isSubItem ? "" : (item.room_name || item.room || "Unassigned Room");
                    break;
                case "page": val = item.page_no; break;
                case "qty": val = item.qty; break;
                case "unit": val = item.unit_name || item.unit; break;
                case "unitCost": val = fmtCurrency(item.unit_cost); break;
                case "extended": val = fmtCurrency(item.extended); break;
                case "vendor": val = item.vendor_name || item.vendor; break;
            }
            row[col.label] = prefix + (val ?? "");
        });
        return row;
    };

    for (const item of items) {
        const room = item.room_name || item.room || "Unassigned Room"

        if (groupByRoom && room !== prevRoom) {
            // Room change subtotal
            if (prevRoom && room_totals[prevRoom] != null) {
                const subtotalRow = {};
                activeColumns.forEach(col => {
                    if (col.id === "room" || col.id === "specNo") subtotalRow[col.label] = `── ${prevRoom} Total ──`;
                    else if (col.id === "extended") subtotalRow[col.label] = fmtCurrency(room_totals[prevRoom]);
                    else subtotalRow[col.label] = "";
                });
                rows.push(subtotalRow);
            }
            // Room Header
            const headerRow = {};
            activeColumns.forEach(col => {
                if (col.id === "specNo") headerRow[col.label] = `[ ${room.toUpperCase()} ]`;
                else headerRow[col.label] = "";
            });
            rows.push(headerRow);
            prevRoom = room
        }

        rows.push(buildRow(item));

        for (const sub of item.subitems || []) {
            rows.push(buildRow(sub, true));
        }
    }

    // Final room subtotal
    if (groupByRoom && prevRoom && room_totals[prevRoom] != null) {
        const subtotalRow = {};
        activeColumns.forEach(col => {
            if (col.id === "room" || col.id === "specNo") subtotalRow[col.label] = `── ${prevRoom} Total ──`;
            else if (col.id === "extended") subtotalRow[col.label] = fmtCurrency(room_totals[prevRoom]);
            else subtotalRow[col.label] = "";
        });
        rows.push(subtotalRow);
    }

    // Grand total row
    const grandRow = {};
    activeColumns.forEach(col => {
        if (col.id === "extended") grandRow[col.label] = fmtCurrency(grand_total);
        else if (col.id === "unitCost") grandRow[col.label] = "GRAND TOTAL";
        else grandRow[col.label] = "";
    });
    rows.push(grandRow);

    const ws = XLSX.utils.json_to_sheet(rows)
    // Set column widths based on current active columns
    ws["!cols"] = activeColumns.map(col => {
        switch (col.id) {
            case "description": return { wch: 40 };
            case "room": return { wch: 20 };
            case "specNo": return { wch: 15 };
            default: return { wch: 12 };
        }
    });

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Budget")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export async function exportToPdf(projectId, section, groupByRoom, groupByPage) {
    const jspdfModule = await import("jspdf")
    const jsPDF = jspdfModule.jsPDF || jspdfModule.default
    const autoTableModule = await import("jspdf-autotable")
    if (typeof autoTableModule.applyPlugin === "function") {
        autoTableModule.applyPlugin(jsPDF)
    }

    const data = await fetchExportData(projectId, section, groupByRoom, groupByPage)
    const { items, grand_total, room_totals } = data

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

    doc.setFontSize(18)
    doc.setTextColor(75, 50, 150)
    doc.text("Budget Report", 14, 18)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Section: ${section}  |  Generated: ${new Date().toLocaleDateString()}  |  Grand Total: ${fmtCurrency(grand_total)}`, 14, 25)

    const head = [["Spec No", "Description", "Room", "Page", "Qty", "Unit Cost", "Extended"]]
    const body = []
    let prevRoom = null

    for (const item of items) {
        const room = item.room_name || item.room || "Unassigned Room"

        if (groupByRoom && room !== prevRoom) {
            if (prevRoom && room_totals[prevRoom] != null) {
                body.push([
                    { content: `${prevRoom} — Merchandise Total`, colSpan: 8, styles: { halign: "right", fontStyle: "bolditalic", fillColor: [235, 230, 250], textColor: [75, 50, 150] } },
                    { content: fmtCurrency(room_totals[prevRoom]), styles: { halign: "right", fontStyle: "bold", fillColor: [235, 230, 250], textColor: [75, 50, 150] } },
                ])
            }
            body.push([
                { content: room, colSpan: 9, styles: { fontStyle: "bold", fillColor: [245, 242, 255], textColor: [75, 50, 150], fontSize: 10 } },
            ])
            prevRoom = room
        }

        body.push([
            item.spec_no || "", item.description || "", room,
            item.page_no != null ? String(item.page_no) : "", item.qty || "",
            fmtCurrency(item.unit_cost),
            { content: fmtCurrency(item.extended), styles: item.hidden_from_total ? { textColor: [160, 160, 160], fontStyle: "italic" } : {} },
        ])

        for (const sub of item.subitems || []) {
            body.push([
                { content: `  ↳ ${sub.spec_no || ""}`, styles: { textColor: [120, 100, 180] } },
                sub.description || "", "", "", sub.qty || "", fmtCurrency(sub.unit_cost),
                { content: fmtCurrency(sub.extended), styles: { textColor: [120, 100, 180] } },
            ])
        }
    }

    if (groupByRoom && prevRoom && room_totals[prevRoom] != null) {
        body.push([
            { content: `${prevRoom} — Merchandise Total`, colSpan: 8, styles: { halign: "right", fontStyle: "bolditalic", fillColor: [235, 230, 250], textColor: [75, 50, 150] } },
            { content: fmtCurrency(room_totals[prevRoom]), styles: { halign: "right", fontStyle: "bold", fillColor: [235, 230, 250], textColor: [75, 50, 150] } },
        ])
    }

    body.push([
        { content: "GRAND TOTAL", colSpan: 8, styles: { halign: "right", fontStyle: "bold", fillColor: [75, 50, 150], textColor: [255, 255, 255], fontSize: 10 } },
        { content: fmtCurrency(grand_total), styles: { halign: "right", fontStyle: "bold", fillColor: [75, 50, 150], textColor: [255, 255, 255], fontSize: 10 } },
    ])

    doc.autoTable({
        startY: 30, head, body, theme: "grid",
        headStyles: { fillColor: [75, 50, 150], textColor: 255, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 2: { cellWidth: 30 },
            3: { cellWidth: 40 }, 4: { cellWidth: 28 }, 5: { cellWidth: 12, halign: "center" },
            6: { cellWidth: 16 }, 7: { cellWidth: 22, halign: "right" }, 8: { cellWidth: 24, halign: "right" },
        },
        didDrawPage: () => {
            doc.setFontSize(7)
            doc.setTextColor(150)
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 8)
        },
    })

    doc.save(`budget_${section}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
