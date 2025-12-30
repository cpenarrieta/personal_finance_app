import "dotenv/config"
import { PrismaClient } from "../prisma/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const categories = [
  {
    name: "💵 Income",
    subcategories: ["Gusto", "NEU", "Freelance Work", "Side Hustle", "Gifts Received", "Bonuses"],
  },
  {
    name: "🍔 Food",
    subcategories: ["Groceries", "Restaurants", "Takeout & Delivery", "Coffee Shops"],
  },
  {
    name: "🚗 Transportation",
    subcategories: ["Car Payment", "Gas/Fuel", "Car Insurance", "Maintenance", "Public Transit", "Ride Sharing"],
  },
  {
    name: "⚕️ Health & Wellness",
    subcategories: ["Medical Expenses", "Fitness", "Personal Care (Haircuts)"],
  },
  {
    name: "🎭 Entertainment & Fun",
    subcategories: ["Streaming Services", "Movies", "Concerts", "Hobbies", "Vacations", "Fun Money"],
  },
  {
    name: "👨‍👩‍👧 Family",
    subcategories: ["Childcare", "School Tuition", "Uniforms", "School Supplies", "Kids' Activities"],
  },
  {
    name: "💳 Debt Repayment",
    subcategories: ["Credit Card Payments", "Student Loan", "Other Loans"],
  },
  {
    name: "✨ Personal & Giving",
    subcategories: [
      "Shopping (Clothing, Amazon, etc.)",
      "Giving (Charity, Gifts, Church)",
      "Education",
      "Miscellaneous",
    ],
  },
  {
    name: "🏡 Core Housing",
    subcategories: ["Mortgage", "Property Taxes", "Home Insurance"],
  },
  {
    name: "💡 Utilities",
    subcategories: ["Electricity", "Gas", "Internet", "Phone"],
  },
  {
    name: "🛠️ Home Upkeep",
    subcategories: ["Maintenance", "Repairs", "Cleaning", "Lawn Care"],
  },
  {
    name: "🏦 Savings",
    subcategories: ["Emergency Fund", "Retirement (RRSP, TFSA)", "Investments", "General Savings"],
  },
  {
    name: "🔁 Transfers",
    subcategories: ["Moving money between your own accounts (e.g., Checking to Savings)"],
  },
]

async function main() {
  console.log("Starting category reset...")

  // Delete all existing categories (cascades to subcategories and removes references)
  console.log("Deleting existing categories...")
  await prisma.category.deleteMany({})
  console.log("All existing categories deleted.")

  // Create new categories with subcategories
  console.log("Creating new categories...")
  for (const category of categories) {
    const createdCategory = await prisma.category.create({
      data: {
        name: category.name,
        subcategories: {
          create: category.subcategories.map((subName) => ({
            name: subName,
          })),
        },
      },
      include: {
        subcategories: true,
      },
    })
    console.log(`Created category: ${createdCategory.name} with ${createdCategory.subcategories.length} subcategories`)
  }

  console.log("Category reset complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
