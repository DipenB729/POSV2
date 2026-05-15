export type ReportDetail = {
  slug: string;
  name: string;
  group: string;
  scope: string;
  cadence: string;
  columns: string[];
  rows: string[][];
};

export function reportSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const reports: Omit<ReportDetail, "slug">[] = [
  {
    name: "Employee Financial",
    group: "Financial Reports",
    scope: "Employee",
    cadence: "Shift close",
    columns: ["Employee", "Gross sales", "Discounts", "Payments", "Net sales"],
    rows: [
      ["John Doe", "18,450.00", "520.00", "17,930.00", "16,780.00"],
      ["Asha Sharma", "14,220.00", "310.00", "13,910.00", "13,120.00"],
      ["Bibek Gurung", "9,860.00", "180.00", "9,680.00", "9,140.00"],
    ],
  },
  {
    name: "Employee Financial - VAT",
    group: "Financial Reports",
    scope: "Employee",
    cadence: "Daily",
    columns: ["Employee", "Taxable sales", "VAT", "Exempt sales", "Net sales"],
    rows: [
      ["John Doe", "15,840.00", "2,059.20", "940.00", "16,780.00"],
      ["Asha Sharma", "12,320.00", "1,601.60", "800.00", "13,120.00"],
      ["Bibek Gurung", "8,640.00", "1,123.20", "500.00", "9,140.00"],
    ],
  },
  {
    name: "Employee Tip",
    group: "Financial Reports",
    scope: "Employee",
    cadence: "Payroll",
    columns: ["Employee", "Cash tips", "Card tips", "Tip outs", "Net tips"],
    rows: [
      ["John Doe", "850.00", "1,120.00", "240.00", "1,730.00"],
      ["Asha Sharma", "620.00", "980.00", "190.00", "1,410.00"],
      ["Bibek Gurung", "410.00", "560.00", "120.00", "850.00"],
    ],
  },
  {
    name: "Property Financial",
    group: "Financial Reports",
    scope: "Property",
    cadence: "End of day",
    columns: ["Revenue center", "Sales", "Payments", "Discounts", "Variance"],
    rows: [
      ["Dining", "38,450.00", "38,420.00", "860.00", "-30.00"],
      ["Takeaway", "16,720.00", "16,720.00", "210.00", "0.00"],
      ["Online", "11,940.00", "11,900.00", "130.00", "-40.00"],
    ],
  },
  {
    name: "Property Financial - VAT",
    group: "Financial Reports",
    scope: "Property",
    cadence: "Tax period",
    columns: ["Property", "Taxable sales", "VAT", "Non-taxable", "Total"],
    rows: [
      ["Main Branch", "62,800.00", "8,164.00", "4,310.00", "67,110.00"],
      ["Cafe Counter", "18,900.00", "2,457.00", "1,120.00", "20,020.00"],
      ["Retail Desk", "7,400.00", "370.00", "260.00", "7,660.00"],
    ],
  },
  {
    name: "Tax Summary",
    group: "Financial Reports",
    scope: "Property",
    cadence: "Tax period",
    columns: ["Tax class", "Taxable sales", "Tax rate", "Tax collected", "Adjustments"],
    rows: [
      ["VAT Food", "54,300.00", "13%", "7,059.00", "0.00"],
      ["Retail VAT", "7,400.00", "5%", "370.00", "0.00"],
      ["Exempt", "4,310.00", "0%", "0.00", "0.00"],
    ],
  },
  {
    name: "Expense Summary",
    group: "Financial Reports",
    scope: "Property",
    cadence: "Daily",
    columns: ["Category", "Expense count", "Amount", "Payment method", "Last entry"],
    rows: [],
  },
  {
    name: "Payment Summary",
    group: "Financial Reports",
    scope: "Property",
    cadence: "Daily",
    columns: ["Payment method", "Payment count", "Payment total"],
    rows: [],
  },
  {
    name: "Future Open Check",
    group: "Check Reports",
    scope: "Employee",
    cadence: "Current",
    columns: ["Check", "Employee", "Open time", "Table", "Projected total"],
    rows: [
      ["AF-1024", "John Doe", "18:30", "T-12", "2,840.00"],
      ["AF-1025", "Asha Sharma", "19:00", "T-07", "1,620.00"],
      ["AF-1026", "Bibek Gurung", "19:30", "T-03", "980.00"],
    ],
  },
  {
    name: "Employee Closed Check",
    group: "Check Reports",
    scope: "Employee",
    cadence: "Shift close",
    columns: ["Check", "Closed time", "Guest count", "Tender", "Total"],
    rows: [
      ["CHK-4211", "14:12", "4", "Card", "3,260.00"],
      ["CHK-4212", "14:28", "2", "Cash", "1,140.00"],
      ["CHK-4213", "15:05", "3", "QR", "2,080.00"],
    ],
  },
  {
    name: "Employee Open Check",
    group: "Check Reports",
    scope: "Employee",
    cadence: "Current",
    columns: ["Check", "Opened", "Table", "Items", "Balance due"],
    rows: [
      ["CHK-4302", "17:40", "T-05", "8", "3,440.00"],
      ["CHK-4303", "17:52", "T-11", "5", "1,980.00"],
      ["CHK-4304", "18:01", "T-02", "3", "920.00"],
    ],
  },
  {
    name: "Family Group Sales",
    group: "Menu Item Reports",
    scope: "Property",
    cadence: "Daily",
    columns: ["Family group", "Qty sold", "Gross sales", "Food cost", "Margin"],
    rows: [
      ["Hot Drinks", "126", "18,420.00", "6,880.00", "62.65%"],
      ["Food & Snacks", "94", "24,760.00", "11,300.00", "54.36%"],
      ["Bakery", "42", "6,300.00", "2,940.00", "53.33%"],
    ],
  },
  {
    name: "Major Group Sales",
    group: "Menu Item Reports",
    scope: "Property",
    cadence: "Daily",
    columns: ["Major group", "Qty sold", "Gross sales", "Discounts", "Net sales"],
    rows: [
      ["Beverage", "181", "28,920.00", "320.00", "28,600.00"],
      ["Food", "104", "27,380.00", "510.00", "26,870.00"],
      ["Retail", "18", "1,620.00", "0.00", "1,620.00"],
    ],
  },
  {
    name: "Menu Item Sales Summary",
    group: "Menu Item Reports",
    scope: "Property",
    cadence: "Daily",
    columns: ["Menu item", "Qty sold", "Sales", "Food cost", "Profit"],
    rows: [
      ["Chicken Momo", "38", "9,880.00", "4,940.00", "4,940.00"],
      ["Cafe Latte", "44", "9,240.00", "4,180.00", "5,060.00"],
      ["Veg Chowmein", "27", "5,940.00", "2,835.00", "3,105.00"],
    ],
  },
  {
    name: "Menu Item Sales Detail",
    group: "Menu Item Reports",
    scope: "Property",
    cadence: "On demand",
    columns: ["Check", "Menu item", "Qty", "Employee", "Line total"],
    rows: [
      ["CHK-4211", "Chicken Momo", "2", "John Doe", "520.00"],
      ["CHK-4211", "Cafe Latte", "3", "John Doe", "630.00"],
      ["CHK-4213", "Veg Chowmein", "1", "Asha Sharma", "220.00"],
    ],
  },
  {
    name: "Stock Summary",
    group: "Menu Item Reports",
    scope: "Property",
    cadence: "Current",
    columns: ["Product", "SKU", "Current stock", "Stock movement quantity"],
    rows: [],
  },
  {
    name: "Check Journal",
    group: "Audit Reports",
    scope: "Check detail area",
    cadence: "On demand",
    columns: ["Time", "Check", "Action", "Employee", "Amount"],
    rows: [
      ["14:08", "CHK-4211", "Item added", "John Doe", "260.00"],
      ["14:11", "CHK-4211", "Discount", "John Doe", "-80.00"],
      ["14:12", "CHK-4211", "Payment", "John Doe", "3,260.00"],
    ],
  },
  {
    name: "Employee Journal",
    group: "Audit Reports",
    scope: "Employee",
    cadence: "On demand",
    columns: ["Time", "Employee", "Check", "Action", "Amount"],
    rows: [
      ["13:52", "Asha Sharma", "CHK-4208", "Open check", "0.00"],
      ["14:02", "Asha Sharma", "CHK-4208", "Void item", "-190.00"],
      ["14:18", "Asha Sharma", "CHK-4208", "Close check", "1,870.00"],
    ],
  },
  {
    name: "Held Item Summary",
    group: "Table Service Reports",
    scope: "Revenue center",
    cadence: "Current",
    columns: ["Table", "Item", "Held since", "Employee", "Status"],
    rows: [
      ["T-05", "Chicken Momo", "17:42", "John Doe", "Held"],
      ["T-07", "Cafe Latte", "17:55", "Asha Sharma", "Released"],
      ["T-11", "Veg Sandwich", "18:04", "Bibek Gurung", "Held"],
    ],
  },
  {
    name: "Table Sales",
    group: "Table Service Reports",
    scope: "Revenue center",
    cadence: "Daily",
    columns: ["Table", "Checks", "Covers", "Sales", "Average cover"],
    rows: [
      ["T-01", "6", "18", "8,640.00", "480.00"],
      ["T-05", "8", "24", "12,220.00", "509.17"],
      ["T-11", "5", "14", "6,980.00", "498.57"],
    ],
  },
  {
    name: "Clock In Status",
    group: "Clock In Reports",
    scope: "Employee",
    cadence: "Current",
    columns: ["Employee", "Job code", "Clocked in", "Break", "Hours"],
    rows: [
      ["John Doe", "Manager", "09:02", "No", "8.25"],
      ["Asha Sharma", "Cashier", "10:00", "No", "7.10"],
      ["Bibek Gurung", "Server", "11:15", "Yes", "5.45"],
    ],
  },
  {
    name: "Time Period Detail",
    group: "Clock In Reports",
    scope: "Employee",
    cadence: "Payroll",
    columns: ["Employee", "In", "Out", "Breaks", "Payable hours"],
    rows: [
      ["John Doe", "09:02", "18:12", "0.75", "8.42"],
      ["Asha Sharma", "10:00", "18:08", "0.50", "7.63"],
      ["Bibek Gurung", "11:15", "18:30", "0.50", "6.75"],
    ],
  },
  {
    name: "Time Period Summary",
    group: "Clock In Reports",
    scope: "Employee",
    cadence: "Payroll",
    columns: ["Employee", "Job code", "Regular", "Overtime", "Total hours"],
    rows: [
      ["John Doe", "Manager", "40.00", "2.50", "42.50"],
      ["Asha Sharma", "Cashier", "38.25", "0.00", "38.25"],
      ["Bibek Gurung", "Server", "36.75", "1.25", "38.00"],
    ],
  },
];

export const reportDetails: ReportDetail[] = reports.map((report) => ({
  ...report,
  slug: reportSlug(report.name),
}));

export function getReportDetail(slug: string) {
  return reportDetails.find((report) => report.slug === slug);
}
