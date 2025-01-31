import type {ShippingRules, Location, ZipCodeRanges, DeliveryType} from "@prisma/client";
import type {Dispatch} from "react";

export type ShippingRulesActionData = {
  success: boolean;
  error?: string;
}

export type ShippingRulesLoaderData = {
  locations?: LocationGraphQLResponse[];
  ruleState?: ShippingRules & { zipCodeRanges: ZipCodeRanges[], locations: Location, deliveryTypes: DeliveryType[] };
  variantData?: { displayName: string; image?: { url?: string; altText?: string } };
  deliveryTypes?: any[];
  error?: { id: string };
};

export type LocationGraphQLResponse = {
  id: string;
  hasActiveInventory: boolean;
  isActive: boolean;
  name: string;
};

export type LocationT = {
  id?: number;
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

export type dbRuleData = ShippingRules & { zipCodeRanges: ZipCodeRanges[], locations: Location[], deliveryTypes: DeliveryType[] };

export type ShippingRulesReducerState = {
  locations: LocationGraphQLResponse[] | null;
  ruleState: RuleState | null;
  selectedLocations: LocationT[];
  zipCodeRanges: ZipCodeRange[];
  deliveryTypes: any[];
  selectedDeliveryTypes: any[];
  error: string | null;
  validationErrors: ValidationErrors;
  isLoading: boolean;
};

export type Action =
  | { type: "SET_LOCATIONS"; payload: LocationGraphQLResponse[] | null }
  | { type: "SET_RULE_STATE"; payload: RuleState | null }
  | { type: "SET_SELECTED_LOCATIONS"; payload: LocationT[] }
  | { type: "SET_ZIP_CODE_RANGES"; payload: ZipCodeRange[] }
  | { type: "SET_DELIVERY_TYPES"; payload: any[] }
  | { type: "SET_SELECTED_DELIVERY_TYPES"; payload: any[] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_VALIDATION_ERRORS"; payload: ValidationErrors }
  | { type: "SET_IS_LOADING"; payload: boolean };

export type DispatchFunction = Dispatch<Action>;

export type groupedShippingRules = {
  [key: string]: ShippingRules[];
}
