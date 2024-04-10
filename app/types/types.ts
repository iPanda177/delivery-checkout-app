import type { ShippingRules } from "@prisma/client";

export type ShippingRulesActionData = {
  success: boolean;
}

export type ShippingRulesLoaderData = {
  locations?: LocationGraphQLResponse[];
  ruleState?: ShippingRules;
  error?: { id: string };
};

export type LocationGraphQLResponse = {
  id: string;
  hasActiveInventory: boolean;
  isActive: boolean;
  name: string;
};

export type Location = {
  locationId: string;
  locationName: string;
}

export type RuleState = ShippingRules & { madeChanges?: boolean };

export type ZipCodeRange = {
  zipRangeStart: string;
  zipRangeEnd: string;

}

export type ValidationErrors = {
  zipRangeStartEmpty?: boolean;
  zipRangeEndLessThanStart?: boolean;
  ruleNameEmpty?: boolean;
  etaDaysSmallParcelLowEmpty?: boolean;
  etaDaysSmallParcelHighEmpty?: boolean;
  etaDaysFreightLowEmpty?: boolean;
  etaDaysFreightHighEmpty?: boolean;
};
