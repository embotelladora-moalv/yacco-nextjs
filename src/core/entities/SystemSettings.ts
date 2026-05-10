export interface SystemSettings {
  clientTags: string[];
  productionWasteReasons: string[];
  routeWasteReasons: string[];
  bottleChangeReasons: string[];
  debtReasons: string[];
  packagingTypes: string[]; // <--- Agrega esta línea
  updatedAt: Date;
}
