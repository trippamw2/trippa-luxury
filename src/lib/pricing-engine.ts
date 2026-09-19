// KIVARA — Pricing Engine
// Server-side price calculations only. Never trust frontend pricing.

export interface PricingComponent {
  label: string;
  amount: number;
  type: "supplier_cost" | "operational_cost" | "margin" | "fee" | "commission" | "discount";
  percentage?: number;
}

export interface PricingResult {
  supplier_cost: number;
  operational_cost: number;
  total_cost: number;
  margin_amount: number;
  margin_type: "percentage" | "fixed";
  margin_value: number;
  fees: number;
  subtotal: number;
  discount_amount: number;
  total_selling_price: number;
  gross_profit: number;
  gross_margin: number; // percentage
  currency: string;
  per_person_price: number;
  per_room_price: number;
}

export interface PricingRules {
  margin_type: "percentage" | "fixed";
  margin_value: number;
  operational_cost?: number;
  fees?: number;
  discount?: number;
  discount_type?: "percentage" | "fixed";
  per_person_markup?: number;
  per_room_markup?: number;
  per_night_markup?: number;
  seasonal_multiplier?: number;
}

export function calculatePricing(
  supplierCost: number,
  rules: PricingRules,
  options: {
    pax?: number;
    rooms?: number;
    nights?: number;
    currency?: string;
  } = {}
): PricingResult {
  const { pax = 1, rooms = 1, nights = 1, currency = "USD" } = options;

  const operationalCost = rules.operational_cost ?? 0;
  const fees = rules.fees ?? 0;
  const discount = rules.discount ?? 0;
  const discountType = rules.discount_type ?? "fixed";

  // 1. Base cost
  const baseCost = supplierCost;

  // 2. Add operational cost
  const totalCost = baseCost + operationalCost;

  // 3. Calculate margin
  let marginAmount = 0;
  if (rules.margin_type === "percentage") {
    marginAmount = totalCost * (rules.margin_value / 100);
  } else {
    marginAmount = rules.margin_value;
  }

  // 4. Apply per-unit markups
  let markup = 0;
  if (rules.per_person_markup) {
    markup += rules.per_person_markup * pax;
  }
  if (rules.per_room_markup) {
    markup += rules.per_room_markup * rooms;
  }
  if (rules.per_night_markup) {
    markup += rules.per_night_markup * nights;
  }

  // 5. Seasonal multiplier
  const seasonMultiplier = rules.seasonal_multiplier ?? 1;

  // 6. Subtotal before discount
  const subtotal = (totalCost + marginAmount + markup + fees) * seasonMultiplier;

  // 7. Apply discount
  const discountAmount =
    discountType === "percentage"
      ? subtotal * (discount / 100)
      : Math.min(discount, subtotal);

  // 8. Total selling price
  const totalSellingPrice = subtotal - discountAmount;

  // 9. Gross profit = selling price - total cost
  const grossProfit = totalSellingPrice - totalCost;

  // 10. Gross margin percentage
  const grossMargin = totalSellingPrice > 0 ? (grossProfit / totalSellingPrice) * 100 : 0;

  // 11. Per-unit prices
  const perPersonPrice = pax > 0 ? totalSellingPrice / pax : 0;
  const perRoomPrice = rooms > 0 ? totalSellingPrice / rooms : 0;

  return {
    supplier_cost: Math.round(baseCost * 100) / 100,
    operational_cost: Math.round(operationalCost * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    margin_amount: Math.round(marginAmount * 100) / 100,
    margin_type: rules.margin_type,
    margin_value: rules.margin_value,
    fees: Math.round(fees * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    discount_amount: Math.round(discountAmount * 100) / 100,
    total_selling_price: Math.round(totalSellingPrice * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    gross_margin: Math.round(grossMargin * 100) / 100,
    currency,
    per_person_price: Math.round(perPersonPrice * 100) / 100,
    per_room_price: Math.round(perRoomPrice * 100) / 100,
  };
}

export function validatePricing(pricing: PricingResult): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (pricing.supplier_cost < 0) {
    errors.push("Supplier cost cannot be negative");
  }
  if (pricing.total_selling_price < 0) {
    errors.push("Selling price cannot be negative");
  }
  if (pricing.gross_margin < 0) {
    errors.push("Gross margin is negative — review pricing rules");
  }
  if (pricing.total_selling_price < pricing.total_cost) {
    errors.push("Selling price is below cost");
  }

  return { valid: errors.length === 0, errors };
}
