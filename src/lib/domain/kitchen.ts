export interface AteAnywayResult {
  used_credit: boolean;
  charge_created: boolean;
  charge_amount?: number;
}

export function processAteAnyway(
  creditBalance: number,
  mealPrice: number
): AteAnywayResult {
  if (creditBalance >= 1) {
    return {
      used_credit: true,
      charge_created: false,
    };
  }
  return {
    used_credit: false,
    charge_created: true,
    charge_amount: mealPrice,
  };
}
