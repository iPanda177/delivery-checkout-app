import type { ShippingRules } from "@prisma/client";

export type ShippingRulesActionData = {
  success: boolean;
}

export type ShippingRulesLoaderData = {
    locations?: Location[];
    ruleState?: ShippingRules;
    error?: { id: string };
};

export type Location = {
    id: string;
    hasActiveInventory: boolean;
    isActive: boolean;
    name: string;
};

export type RuleState = ShippingRules & { madeChanges?: boolean };
