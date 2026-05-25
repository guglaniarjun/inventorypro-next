import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding InventoryPro database...");

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: "SPS" },
    update: {},
    create: {
      name: "Springfield Public School",
      code: "SPS",
      address: "123 Main Street, Springfield",
      contactPerson: "Principal Adams",
      phone: "9876543210",
      email: "admin@springfield.edu",
      subscriptionPlan: "professional",
      status: "active",
    },
  });
  console.log(`✓ Tenant: ${tenant.name}`);

  // Create departments
  const deptData = [
    { name: "Physics Lab", code: "PHY", incharge: "Dr. Richard Feynman", location: "Block A, Room 101" },
    { name: "Chemistry Lab", code: "CHE", incharge: "Dr. Marie Curie", location: "Block A, Room 102" },
    { name: "Biology Lab", code: "BIO", incharge: "Dr. Charles Darwin", location: "Block B, Room 201" },
    { name: "Computer Lab", code: "CSE", incharge: "Dr. Alan Turing", location: "Block C, Room 301" },
    { name: "Kitchen & Canteen", code: "KIT", incharge: "Mr. Gordon Ramsay", location: "Ground Floor" },
    { name: "Sports & PE", code: "SPE", incharge: "Mr. Usain Bolt", location: "Sports Complex" },
    { name: "Library", code: "LIB", incharge: "Ms. Hermione Granger", location: "Block D, Room 001" },
    { name: "Administration", code: "ADM", incharge: "Ms. Elizabeth Warren", location: "Main Building" },
  ];

  const departments: Record<string, Awaited<ReturnType<typeof prisma.department.upsert>>> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: { id: 0 },
      update: {},
      create: {
        tenantId: tenant.id,
        departmentName: d.name,
        departmentCode: d.code,
        inchargeName: d.incharge,
        location: d.location,
        status: "active",
      },
    });
    departments[d.code] = dept;
  }
  console.log(`✓ ${deptData.length} departments created`);

  // Create locations
  const locations = await Promise.all([
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Main Campus", buildingName: "Block A", floorName: "1st Floor", roomName: "Physics Lab 101", rackNo: "R1", shelfNo: "S1" } }),
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Main Campus", buildingName: "Block A", floorName: "1st Floor", roomName: "Chemistry Lab 102" } }),
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Main Campus", buildingName: "Block B", floorName: "2nd Floor", roomName: "Biology Lab 201" } }),
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Main Campus", buildingName: "Block C", floorName: "3rd Floor", roomName: "Computer Lab 301" } }),
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Main Campus", buildingName: "Ground Floor", floorName: null, roomName: "Kitchen Store" } }),
    prisma.location.create({ data: { tenantId: tenant.id, campusName: "Sports Complex", buildingName: "Equipment Room", floorName: null, roomName: "Store 1" } }),
  ]);
  console.log(`✓ ${locations.length} locations created`);

  // Hash password
  const hash = await bcrypt.hash("admin123", 12);

  // Create users
  const usersData = [
    { username: "platformadmin", fullName: "Platform Administrator", email: "platform@inventorypro.com", role: "platform_super_admin", tenantId: null, deptCode: null },
    { username: "admin", fullName: "School Administrator", email: "admin@springfield.edu", role: "tenant_super_admin", tenantId: tenant.id, deptCode: null },
    { username: "physicslab", fullName: "Dr. Richard Feynman", email: "physics@springfield.edu", role: "department_incharge", tenantId: tenant.id, deptCode: "PHY" },
    { username: "chemistrylab", fullName: "Dr. Marie Curie", email: "chemistry@springfield.edu", role: "department_incharge", tenantId: tenant.id, deptCode: "CHE" },
    { username: "kitchen", fullName: "Mr. Gordon Ramsay", email: "kitchen@springfield.edu", role: "department_incharge", tenantId: tenant.id, deptCode: "KIT" },
    { username: "auditor", fullName: "External Auditor", email: "auditor@springfield.edu", role: "auditor", tenantId: tenant.id, deptCode: null },
    { username: "staff1", fullName: "Staff Member 1", email: "staff1@springfield.edu", role: "staff", tenantId: tenant.id, deptCode: "PHY" },
    { username: "librarian", fullName: "Ms. Hermione Granger", email: "library@springfield.edu", role: "department_incharge", tenantId: tenant.id, deptCode: "LIB" },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash: hash },
      create: {
        tenantId: u.tenantId,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        passwordHash: hash,
        role: u.role,
        departmentId: u.deptCode ? departments[u.deptCode]?.id ?? null : null,
        status: "active",
      },
    });
  }
  console.log(`✓ ${usersData.length} users created (password: admin123)`);

  // Create inventory items
  const physLoc = locations[0];
  const cheLoc = locations[1];
  const kitLoc = locations[4];

  const inventoryItems = [
    // Physics Lab
    { dept: "PHY", locId: physLoc.id, itemName: "Beakers (250ml)", itemCode: "PHY-001", category: "Glassware", type: "Consumable", unit: "Nos", stock: 45, minStock: 10 },
    { dept: "PHY", locId: physLoc.id, itemName: "Measuring Cylinders (100ml)", itemCode: "PHY-002", category: "Glassware", type: "Consumable", unit: "Nos", stock: 30, minStock: 8 },
    { dept: "PHY", locId: physLoc.id, itemName: "Electronic Balance", itemCode: "PHY-003", category: "Equipment", type: "Non-Consumable", unit: "Nos", stock: 3, minStock: 1 },
    { dept: "PHY", locId: physLoc.id, itemName: "Copper Wire (1mm)", itemCode: "PHY-004", category: "Electrical", type: "Consumable", unit: "Metre", stock: 200, minStock: 50 },
    { dept: "PHY", locId: physLoc.id, itemName: "Resistors (100Ω)", itemCode: "PHY-005", category: "Electrical", type: "Consumable", unit: "Nos", stock: 8, minStock: 20 },
    // Chemistry Lab
    { dept: "CHE", locId: cheLoc.id, itemName: "Hydrochloric Acid (500ml)", itemCode: "CHE-001", category: "Chemicals", type: "Consumable", unit: "Bottle", stock: 12, minStock: 3 },
    { dept: "CHE", locId: cheLoc.id, itemName: "Sodium Hydroxide (1kg)", itemCode: "CHE-002", category: "Chemicals", type: "Consumable", unit: "Kg", stock: 5, minStock: 2 },
    { dept: "CHE", locId: cheLoc.id, itemName: "Bunsen Burner", itemCode: "CHE-003", category: "Equipment", type: "Non-Consumable", unit: "Nos", stock: 8, minStock: 4 },
    { dept: "CHE", locId: cheLoc.id, itemName: "Test Tubes (Plain)", itemCode: "CHE-004", category: "Glassware", type: "Consumable", unit: "Nos", stock: 3, minStock: 20 },
    { dept: "CHE", locId: cheLoc.id, itemName: "Filter Paper (Whatman)", itemCode: "CHE-005", category: "Consumables", type: "Consumable", unit: "Pack", stock: 10, minStock: 2 },
    // Kitchen
    { dept: "KIT", locId: kitLoc.id, itemName: "Rice (25kg bag)", itemCode: "KIT-001", category: "Food Grains", type: "Consumable", unit: "Kg", stock: 150, minStock: 50 },
    { dept: "KIT", locId: kitLoc.id, itemName: "Cooking Oil (5L)", itemCode: "KIT-002", category: "Edible Oils", type: "Consumable", unit: "Litre", stock: 40, minStock: 10 },
    { dept: "KIT", locId: kitLoc.id, itemName: "Sugar (50kg)", itemCode: "KIT-003", category: "Food Grains", type: "Consumable", unit: "Kg", stock: 8, minStock: 15 },
    { dept: "KIT", locId: kitLoc.id, itemName: "Disposable Cups (100pc)", itemCode: "KIT-004", category: "Disposables", type: "Consumable", unit: "Pack", stock: 25, minStock: 5 },
    { dept: "KIT", locId: kitLoc.id, itemName: "Cleaning Soap (Bar)", itemCode: "KIT-005", category: "Cleaning", type: "Consumable", unit: "Nos", stock: 20, minStock: 10 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id,
        departmentId: departments[item.dept]!.id,
        locationId: item.locId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        category: item.category,
        itemType: item.type,
        unit: item.unit,
        openingStock: item.stock,
        currentStock: item.stock,
        minimumStockLevel: item.minStock,
        reorderLevel: item.minStock + 5,
        status: item.stock <= item.minStock ? "Low Stock" : "Active",
        createdBy: 1,
      },
    });
  }
  console.log(`✓ ${inventoryItems.length} inventory items created`);

  // Create assets
  const assetsData = [
    { dept: "PHY", locId: physLoc.id, name: "Oscilloscope (Digital)", code: "AST-PHY-001", category: "Scientific Equipment", condition: "Good", value: 45000, vendor: "Tektronix India" },
    { dept: "PHY", locId: physLoc.id, name: "Function Generator", code: "AST-PHY-002", category: "Scientific Equipment", condition: "Good", value: 22000, vendor: "Aplab Ltd" },
    { dept: "PHY", locId: physLoc.id, name: "Optical Bench", code: "AST-PHY-003", category: "Scientific Equipment", condition: "Fair", value: 12000, vendor: "Physics Instruments" },
    { dept: "CHE", locId: cheLoc.id, name: "Rotary Evaporator", code: "AST-CHE-001", category: "Lab Equipment", condition: "Good", value: 85000, vendor: "BUCHI India" },
    { dept: "CHE", locId: cheLoc.id, name: "Magnetic Stirrer (2L)", code: "AST-CHE-002", category: "Lab Equipment", condition: "Good", value: 8500, vendor: "Remi Elektrotechnik" },
    { dept: "CHE", locId: cheLoc.id, name: "Analytical Balance", code: "AST-CHE-003", category: "Weighing Equipment", condition: "Damaged", value: 35000, vendor: "Mettler Toledo" },
    { dept: "CSE", locId: locations[3].id, name: "Desktop Computer (Core i7)", code: "AST-CSE-001", category: "Computer Hardware", condition: "Good", value: 65000, vendor: "HP India" },
    { dept: "CSE", locId: locations[3].id, name: "24\" LED Monitor", code: "AST-CSE-002", category: "Computer Hardware", condition: "Good", value: 18000, vendor: "Dell India" },
    { dept: "KIT", locId: kitLoc.id, name: "Industrial Mixer", code: "AST-KIT-001", category: "Kitchen Equipment", condition: "Good", value: 25000, vendor: "Bajaj Electricals" },
    { dept: "KIT", locId: kitLoc.id, name: "Commercial Refrigerator", code: "AST-KIT-002", category: "Kitchen Equipment", condition: "Fair", value: 45000, vendor: "Voltas Ltd" },
    { dept: "SPE", locId: locations[5].id, name: "Cricket Kit (Full Set)", code: "AST-SPE-001", category: "Sports Equipment", condition: "Good", value: 15000, vendor: "MRF Sports" },
    { dept: "LIB", locId: null, name: "Library Management Computer", code: "AST-LIB-001", category: "Computer Hardware", condition: "Good", value: 45000, vendor: "Lenovo India" },
  ];

  for (const a of assetsData) {
    await prisma.asset.create({
      data: {
        tenantId: tenant.id,
        departmentId: departments[a.dept]!.id,
        currentLocationId: a.locId,
        assetName: a.name,
        assetCode: a.code,
        assetCategory: a.category,
        condition: a.condition,
        status: a.condition === "Damaged" ? "Under Repair" : "In Use",
        purchaseDate: new Date("2022-06-15"),
        purchaseValue: a.value,
        vendorName: a.vendor,
        createdBy: 1,
      },
    });
  }
  console.log(`✓ ${assetsData.length} assets created`);

  // Add a few sample transactions
  const items = await prisma.inventoryItem.findMany({ where: { tenantId: tenant.id }, take: 3 });
  const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });

  if (adminUser && items.length > 0) {
    for (const item of items.slice(0, 3)) {
      await prisma.stockTransaction.create({
        data: {
          tenantId: tenant.id,
          itemId: item.id,
          departmentId: item.departmentId,
          transactionType: "Purchase/Stock In",
          quantity: item.openingStock,
          beforeStock: 0,
          afterStock: item.currentStock,
          transactionDate: new Date("2024-06-01"),
          enteredBy: adminUser.id,
          remarks: "Initial stock entry",
          approvalStatus: "Not Required",
        },
      });
    }
    console.log("✓ Sample transactions created");
  }

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo Login Credentials:");
  console.log("   Platform Admin: platformadmin / admin123");
  console.log("   School Admin:   admin / admin123");
  console.log("   Physics Lab:    physicslab / admin123");
  console.log("   Chemistry Lab:  chemistrylab / admin123");
  console.log("   Kitchen:        kitchen / admin123");
  console.log("   Auditor:        auditor / admin123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
