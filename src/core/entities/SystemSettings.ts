export interface ShrinkageReason {
  id: string;
  name: string;
  context: "ROUTE" | "PLANT";
  phase: "FILLED" | "EMPTY";
  isRecyclableDefault: boolean;
  isActive: boolean;
}

export interface SystemSettings {
  clientTags: string[];
  productionWasteReasons: ShrinkageReason[];
  routeWasteReasons: ShrinkageReason[];
  bottleChangeReasons: string[];
  debtReasons: string[];
  packagingTypes: string[];
  maquilaBrands: string[];
  updatedAt: Date;
}
