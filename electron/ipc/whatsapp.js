const { ipcMain, shell } = require('electron');
const { getDb } = require('../db/database');
const { buildPendingBillsPdf } = require('./pdf');

function register() {
  ipcMain.handle('whatsapp:sendPendingBills', async (_event, customerId) => {
    const db = getDb();
    const customer = db
      .prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?')
      .get(customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const unpaidBills = db
      .prepare(
        `SELECT id, bill_date AS billDate, grand_total AS grandTotal
         FROM bills WHERE customer_id = ? AND status = 'UNPAID' ORDER BY bill_date ASC`
      )
      .all(customerId);

    if (unpaidBills.length === 0) {
      return { success: false, error: 'No pending bills for this customer.' };
    }

    const itemsStmt = db.prepare(
      'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal FROM bill_items WHERE bill_id = ?'
    );
    const lastBill = unpaidBills[unpaidBills.length - 1];
    lastBill.items = itemsStmt.all(lastBill.id);

    let pdfPath;
    try {
      pdfPath = await buildPendingBillsPdf(customer, unpaidBills);
    } catch (err) {
      console.error('Failed to build pending bills PDF', err);
      return { success: false, error: 'Failed to generate the pending bills PDF.' };
    }

    shell.showItemInFolder(pdfPath);

    const message = `Hi ${customer.name}, please find your pending bill details attached.`;
    const waUrl = `https://wa.me/${customer.whatsappNumber}?text=${encodeURIComponent(message)}`;
    shell.openExternal(waUrl);

    return {
      success: true,
      pdfPath,
      waUrl,
      note: 'WhatsApp Web/Desktop has opened. Attach the PDF we just saved (also opened in your file explorer) into the chat, then hit send — WhatsApp does not allow third-party apps to auto-attach files.',
    };
  });
}

module.exports = register;
