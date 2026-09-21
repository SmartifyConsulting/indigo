import type { EstateEstimate, FnaInputs, FnaResult, MaritalStatus, NeedItem } from "./types";

/**
 * Standardised, advisor-independent needs analysis. Every figure is derived from the
 * inputs and the fixed assumptions below, so two advisors given the same facts produce
 * the same result (no discretionary uplift).
 */

export const ASSUMPTIONS = {
  realReturn: 0.04, // real discount rate for capitalising income needs
  dependantIncomeShare: 0.7, // share of household expenses that supports dependants
  independenceAge: 21,
  retirementAge: 65,
  funeralCost: 60_000,
  executorFeeRate: 0.035 * 1.15, // 3.5% + 15% VAT of gross estate
  incomeProtectionCap: 0.75, // insurers cap benefits at 75% of gross income
  severeIllnessMultiple: 1.5,
  retirementIncomeTarget: 0.75,
  sustainableDrawdown: 0.05,
  offshoreTarget: { conservative: 0.2, moderate: 0.3, aggressive: 0.4 },
  petCoverPerPet: 30_000,
  estateAbatement: 3_500_000,
  estateBand: 30_000_000,
  estateRateLow: 0.2,
  estateRateHigh: 0.25,
  businessLiabilityTarget: 5_000_000,
} as const;

const A = ASSUMPTIONS;
const roundUp = (n: number, step: number) => (n <= 0 ? 0 : Math.ceil(n / step) * step);

export function estateDuty(dutiable: number, married: boolean) {
  const abatement = A.estateAbatement * (married ? 2 : 1);
  const taxable = Math.max(0, dutiable - abatement);
  const duty =
    A.estateRateLow * Math.min(taxable, A.estateBand) +
    A.estateRateHigh * Math.max(0, taxable - A.estateBand);
  return { abatement, taxable, duty };
}

function annuityPv(annual: number, years: number, rate: number) {
  if (years <= 0) return 0;
  return (annual * (1 - Math.pow(1 + rate, -years))) / rate;
}

export function yearsOfDependency(age: number, i: FnaInputs) {
  const toRetirement = Math.max(0, A.retirementAge - age);
  if (i.maritalStatus === "married") return Math.min(toRetirement, 20);
  if (i.dependants > 0)
    return Math.min(toRetirement, Math.max(0, A.independenceAge - i.youngestDependantAge));
  return 0;
}

export function computeFna(age: number, i: FnaInputs, now = new Date().toISOString()): FnaResult {
  const married = i.maritalStatus === "married";

  /* Estate ------------------------------------------------------------ */
  const grossEstate = i.propertyValue + i.investmentAssets + i.liquidAssets + i.existingLifeCover;
  const liabilities = i.bond + i.otherDebts;
  const costs = A.funeralCost + (grossEstate - i.existingLifeCover) * A.executorFeeRate;
  const dutiable = Math.max(0, grossEstate - liabilities - costs);
  const { abatement, taxable, duty } = estateDuty(dutiable, married);
  const estate: EstateEstimate = {
    grossEstate,
    liabilities,
    costs,
    dutiable,
    abatement,
    taxable,
    duty,
    note: married
      ? "Assumes assets pass to the surviving spouse (no duty on first death). Figure shown is the exposure on the second death, using the portable R3.5m abatement of each spouse."
      : "Assumes assets pass to heirs other than a spouse, so duty falls due on this death. R3.5m abatement applied.",
  };

  /* Life & risk ------------------------------------------------------- */
  const years = yearsOfDependency(age, i);
  const incomeCapital = annuityPv(
    i.monthlyExpenses * 12 * A.dependantIncomeShare,
    years,
    A.realReturn,
  );
  const estateLiquidity = married ? 0 : duty;
  const lifeRequired =
    liabilities +
    A.funeralCost +
    incomeCapital +
    (grossEstate - i.existingLifeCover) * A.executorFeeRate +
    estateLiquidity;
  const lifeAvailable = i.liquidAssets + i.investmentAssets;
  const lifeGap = roundUp(lifeRequired - lifeAvailable - i.existingLifeCover, 50_000);

  const monthlyGross = i.grossAnnualIncome / 12;
  const ipTarget = monthlyGross * A.incomeProtectionCap;
  const ipGap = roundUp(ipTarget - i.existingIncomeProtection, 500);

  const siTarget = i.grossAnnualIncome * A.severeIllnessMultiple;
  const siGap = roundUp(siTarget - i.existingSevereIllness, 50_000);

  /* Short-term -------------------------------------------------------- */
  const vehicleGap = roundUp(i.vehicleValue - i.existingVehicleCover, 1_000);
  const buildingGap = roundUp(i.buildingValue - i.existingBuildingCover, 1_000);
  const contentsGap = roundUp(i.contentsValue - i.existingContentsCover, 1_000);
  const petGap = roundUp(i.pets * A.petCoverPerPet - i.existingPetCover, 5_000);
  const bizGap = i.hasBusiness
    ? roundUp(A.businessLiabilityTarget - i.existingBusinessLiability, 100_000)
    : 0;

  /* Investments & wealth ---------------------------------------------- */
  const n = Math.max(0, A.retirementAge - age);
  const r = A.realReturn;
  const projected =
    i.retirementFundValue * Math.pow(1 + r, n) +
    (r > 0 && n > 0 ? i.monthlyRetirementSaving * 12 * ((Math.pow(1 + r, n) - 1) / r) : 0);
  const requiredCapital = (i.grossAnnualIncome * A.retirementIncomeTarget) / A.sustainableDrawdown;
  const retirementShortfall = Math.max(0, requiredCapital - projected);
  const extraMonthly =
    n > 0 && retirementShortfall > 0
      ? roundUp((retirementShortfall * r) / (Math.pow(1 + r, n) - 1) / 12, 100)
      : 0;
  const offshoreTarget = A.offshoreTarget[i.riskProfile];
  const offshoreTargetValue = i.investmentAssets * offshoreTarget;
  const offshoreCurrent = (i.investmentAssets * i.offshorePct) / 100;
  const offshoreGap = roundUp(offshoreTargetValue - offshoreCurrent, 10_000);

  const needs: NeedItem[] = [
    {
      id: "life",
      category: "life",
      label: "Life cover",
      unit: "lump",
      current: i.existingLifeCover,
      required: roundUp(lifeRequired - lifeAvailable, 50_000),
      gap: lifeGap,
      quotable: true,
      rationale: `Settles ${fmt(liabilities)} of debt, funeral and estate costs, and replaces 70% of household expenses for ${years} years (capitalised at ${r * 100}% real), after ${fmt(lifeAvailable)} of liquid assets and investments.`,
    },
    {
      id: "disability",
      category: "life",
      label: "Income protection",
      unit: "monthly",
      current: i.existingIncomeProtection,
      required: roundUp(ipTarget, 500),
      gap: ipGap,
      quotable: true,
      rationale: `Insurers cap disability income at ${A.incomeProtectionCap * 100}% of gross income (${fmt(ipTarget)} a month).`,
    },
    {
      id: "severe-illness",
      category: "life",
      label: "Severe illness cover",
      unit: "lump",
      current: i.existingSevereIllness,
      required: roundUp(siTarget, 50_000),
      gap: siGap,
      quotable: true,
      rationale: `Lump sum of ${A.severeIllnessMultiple}× gross annual income to fund treatment and a recovery period.`,
    },
    {
      id: "vehicle",
      category: "short-term",
      label: "Vehicle insurance",
      unit: "lump",
      current: i.existingVehicleCover,
      required: i.vehicleValue,
      gap: vehicleGap,
      quotable: true,
      rationale: "Insured value should match current retail value.",
    },
    {
      id: "home-building",
      category: "short-term",
      label: "Home buildings",
      unit: "lump",
      current: i.existingBuildingCover,
      required: i.buildingValue,
      gap: buildingGap,
      quotable: true,
      rationale: "Buildings cover at full replacement value avoids the average clause.",
    },
    {
      id: "home-contents",
      category: "short-term",
      label: "Household contents",
      unit: "lump",
      current: i.existingContentsCover,
      required: i.contentsValue,
      gap: contentsGap,
      quotable: true,
      rationale: "Contents cover at full replacement value.",
    },
    {
      id: "business-liability",
      category: "short-term",
      label: "Business liability",
      unit: "lump",
      current: i.existingBusinessLiability,
      required: i.hasBusiness ? A.businessLiabilityTarget : 0,
      gap: bizGap,
      quotable: false,
      rationale:
        "Public liability sized to the owner's exposure. Placed through the commercial desk, not the retail quote APIs.",
    },
    {
      id: "pet-cover",
      category: "short-term",
      label: "Pet cover",
      unit: "lump",
      current: i.existingPetCover,
      required: i.pets * A.petCoverPerPet,
      gap: petGap,
      quotable: true,
      rationale: `Veterinary and liability cover of R${A.petCoverPerPet.toLocaleString("en-ZA")} per pet.`,
    },
    {
      id: "retirement",
      category: "investment",
      label: "Retirement savings",
      unit: "monthly",
      current: i.monthlyRetirementSaving,
      required: i.monthlyRetirementSaving + extraMonthly,
      gap: extraMonthly,
      quotable: false,
      rationale: `Projected capital at 65 is ${fmt(projected)} against ${fmt(requiredCapital)} needed to draw ${A.retirementIncomeTarget * 100}% of income at ${A.sustainableDrawdown * 100}% a year.`,
    },
    {
      id: "offshore",
      category: "investment",
      label: "Offshore allocation",
      unit: "lump",
      current: offshoreCurrent,
      required: offshoreTargetValue,
      gap: offshoreGap,
      quotable: false,
      rationale: `Target ${offshoreTarget * 100}% of discretionary investments offshore for a ${i.riskProfile} risk profile; currently ${i.offshorePct}%.`,
    },
  ];

  return {
    needs,
    estate,
    assumptions: [
      `Real return ${A.realReturn * 100}% for capitalising income needs`,
      `${A.dependantIncomeShare * 100}% of household expenses supports dependants`,
      `Dependency until age ${A.independenceAge} (children) or ${Math.min(20, Math.max(0, A.retirementAge - age))} years (spouse)`,
      `Executor fee ${(A.executorFeeRate * 100).toFixed(3)}% of gross estate plus funeral R${A.funeralCost.toLocaleString("en-ZA")}`,
      `Estate duty ${A.estateRateLow * 100}% to R30m, ${A.estateRateHigh * 100}% above; R3.5m abatement per person`,
      "Retirement funds excluded from the dutiable estate",
    ],
    computedAt: now,
  };
}

function fmt(n: number) {
  return `R${Math.round(n).toLocaleString("en-ZA").replace(/,/g, " ")}`;
}

export const defaultFnaInputs = (maritalStatus: MaritalStatus = "married"): FnaInputs => ({
  maritalStatus,
  riskProfile: "moderate",
  pets: 0,
  existingPetCover: 0,
  dependants: 2,
  youngestDependantAge: 6,
  grossAnnualIncome: 900_000,
  monthlyExpenses: 45_000,
  bond: 1_800_000,
  otherDebts: 150_000,
  liquidAssets: 120_000,
  investmentAssets: 600_000,
  propertyValue: 2_600_000,
  retirementFundValue: 850_000,
  monthlyRetirementSaving: 9_000,
  offshorePct: 10,
  existingLifeCover: 1_500_000,
  existingIncomeProtection: 25_000,
  existingSevereIllness: 500_000,
  vehicleValue: 420_000,
  buildingValue: 2_600_000,
  contentsValue: 350_000,
  existingVehicleCover: 420_000,
  existingBuildingCover: 2_000_000,
  existingContentsCover: 250_000,
  hasBusiness: false,
  existingBusinessLiability: 0,
});
