/**
 * Catalogue of the third-party services the platform can connect to.
 * Fields marked `secret: true` are stored server-side only and never returned to the
 * browser unless an administrator explicitly reveals them.
 */

export interface IntegrationField {
  key: string;
  label: string;
  secret: boolean;
  placeholder?: string;
  help?: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  category: string;
  summary: string;
  /** Where the platform actually calls this service. */
  usedAt: string;
  docsUrl?: string;
  /** The provider's own billing / credits page, so an administrator can top up. */
  topUpUrl?: string;
  /** The provider's console or portal sign-in page. */
  portalUrl?: string;
  baseUrl?: string;
  /** Default price per unit of measure, in rand. An administrator can override it. */
  unitPrice?: number;
  unitLabel: string;
  environments: string[];
  fields: IntegrationField[];
  testable: boolean;
}

export const CATEGORY_LABEL: Record<string, string> = {
  data: "Data services",
  identity: "Identity and screening",
  insurer: "Insurer quoting APIs",
  crm: "CRM",
};

const PORTAL_FIELDS: IntegrationField[] = [
  { key: "portal_username", label: "Portal username", secret: false, placeholder: "name@firm.co.za" },
  {
    key: "portal_password",
    label: "Portal password",
    secret: true,
    help: "Used to sign in to the provider's own portal. Stored encrypted.",
  },
];

const KEY_FIELDS: IntegrationField[] = [
  { key: "api_key", label: "API key", secret: true },
  { key: "api_secret", label: "API secret", secret: true, help: "Leave blank if the service issues a key only." },
];

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: "astute",
    name: "Astute Financial Services Exchange",
    category: "data",
    summary: "Consolidated policy and portfolio data across South African product providers.",
    usedAt: "Needs analysis — pulling a client's existing cover and investments.",
    baseUrl: "https://api.astutefse.co.za",
    docsUrl: "https://www.astutefse.co.za",
    portalUrl: "https://www.astutefse.co.za",
    topUpUrl: "https://www.astutefse.co.za",
    unitPrice: 9.5,
    unitLabel: "per CRS enquiry",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "didit",
    name: "DIDIT identity verification",
    category: "identity",
    summary: "ID document and selfie checks, company verification and sanctions / PEP screening.",
    usedAt: "FICA verification at client onboarding and before an application is submitted.",
    baseUrl: "https://api.didit.me",
    docsUrl: "https://docs.didit.me",
    portalUrl: "https://business.didit.me",
    topUpUrl: "https://business.didit.me",
    unitPrice: 12.5,
    unitLabel: "per verification",
    environments: ["sandbox", "production"],
    fields: [
      { key: "api_key", label: "API key", secret: true },
      { key: "webhook_secret", label: "Webhook secret", secret: true },
      ...PORTAL_FIELDS,
    ],
    testable: true,
  },
  {
    id: "discovery",
    name: "Discovery",
    category: "insurer",
    summary: "Life, health and invest quoting and application submission.",
    usedAt: "Quote comparison and application submission.",
    unitPrice: 2.4,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "momentum",
    name: "Momentum",
    category: "insurer",
    summary: "Risk and investment product quoting.",
    usedAt: "Quote comparison and application submission.",
    unitPrice: 2.4,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "old-mutual",
    name: "Old Mutual",
    category: "insurer",
    summary: "Risk and investment product quoting.",
    usedAt: "Quote comparison and application submission.",
    unitPrice: 2.4,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "sanlam",
    name: "Sanlam",
    category: "insurer",
    summary: "Risk and investment product quoting.",
    usedAt: "Quote comparison and application submission.",
    unitPrice: 2.4,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "santam",
    name: "Santam",
    category: "insurer",
    summary: "Short-term insurance quoting.",
    usedAt: "Short-term quote comparison.",
    unitPrice: 1.9,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "auto-general",
    name: "Auto & General",
    category: "insurer",
    summary: "Short-term insurance quoting.",
    usedAt: "Short-term quote comparison.",
    unitPrice: 1.9,
    unitLabel: "per quote request",
    environments: ["sandbox", "production"],
    fields: [...KEY_FIELDS, ...PORTAL_FIELDS],
    testable: true,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    summary: "Two-way sync of clients, cases and advice activity.",
    usedAt: "Client pipeline sync.",
    baseUrl: "https://api.hubapi.com",
    docsUrl: "https://developers.hubspot.com/docs/api/overview",
    portalUrl: "https://app.hubspot.com",
    topUpUrl: "https://app.hubspot.com/billing",
    unitPrice: 0.15,
    unitLabel: "per record synced",
    environments: ["sandbox", "production"],
    fields: [
      { key: "api_key", label: "Private app token", secret: true },
      ...PORTAL_FIELDS,
    ],
    testable: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    summary: "Two-way sync of clients, cases and advice activity.",
    usedAt: "Client pipeline sync.",
    baseUrl: "https://login.salesforce.com",
    docsUrl: "https://developer.salesforce.com/docs",
    portalUrl: "https://login.salesforce.com",
    topUpUrl: "https://login.salesforce.com",
    unitPrice: 0.2,
    unitLabel: "per record synced",
    environments: ["sandbox", "production"],
    fields: [
      { key: "client_id", label: "Consumer key", secret: false },
      { key: "client_secret", label: "Consumer secret", secret: true },
      ...PORTAL_FIELDS,
    ],
    testable: true,
  },
];

export const providerById = (id: string): IntegrationProvider | undefined =>
  INTEGRATION_PROVIDERS.find((p) => p.id === id);
