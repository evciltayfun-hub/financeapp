-- CreateTable
CREATE TABLE "CashBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PortfolioNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT '₺',
    "period" TEXT NOT NULL,
    "paymentMonth" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedFrom" INTEGER,
    "deactivatedFrom" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TravelCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryName" TEXT NOT NULL,
    "isoCode" TEXT,
    "status" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "rating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TravelVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "cities" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelVisit_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "TravelCountry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CultureEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "genre" TEXT,
    "venue" TEXT,
    "eventDate" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "isAttended" BOOLEAN NOT NULL DEFAULT false,
    "attendedAt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TripPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "totalBudget" REAL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "date" TEXT,
    "savingsAmount" REAL NOT NULL DEFAULT 0,
    "savingsNote" TEXT,
    "savingsData" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'nakit',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "TripPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "carryover" REAL NOT NULL DEFAULT 0,
    "salary" REAL NOT NULL DEFAULT 0,
    "extraIncome" REAL NOT NULL DEFAULT 0,
    "otherExpenses" REAL NOT NULL DEFAULT 0,
    "investment" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonthlyGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "netSalary" REAL NOT NULL DEFAULT 0,
    "spendingTarget" REAL NOT NULL DEFAULT 0,
    "besInvestment" REAL NOT NULL DEFAULT 0,
    "investmentTarget" REAL NOT NULL DEFAULT 0,
    "actualInvestment" REAL NOT NULL DEFAULT 0,
    "remainingCash" REAL NOT NULL DEFAULT 0,
    "creditCardTL" REAL NOT NULL DEFAULT 0,
    "creditCardEUR" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "extraAmount" REAL NOT NULL DEFAULT 0,
    "isExtraChecked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MonthlyGoal" ("createdAt", "id", "month", "note", "updatedAt", "year") SELECT "createdAt", "id", "month", "note", "updatedAt", "year" FROM "MonthlyGoal";
DROP TABLE "MonthlyGoal";
ALTER TABLE "new_MonthlyGoal" RENAME TO "MonthlyGoal";
CREATE UNIQUE INDEX "MonthlyGoal_year_month_key" ON "MonthlyGoal"("year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CashBalance_currency_key" ON "CashBalance"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_symbol_type_key" ON "WatchlistItem"("symbol", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TravelCountry_countryName_key" ON "TravelCountry"("countryName");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudget_year_month_key" ON "MonthlyBudget"("year", "month");

