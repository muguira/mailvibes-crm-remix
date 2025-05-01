
import { ColumnDef, ColumnType as ListColumnType } from "../types";
import { Column, ColumnType as GridColumnType } from "@/components/grid-view/types";
import { DEFAULT_COLUMN_WIDTH } from "@/components/grid-view/grid-constants";

/**
 * Maps the ColumnType from list/grid/types.ts to the ColumnType from grid-view/types.ts
 * This is needed because they have slightly different allowed values
 */
const mapColumnType = (type: ListColumnType): GridColumnType => {
  switch (type) {
    case 'text':
    case 'number':
    case 'date':
    case 'currency':
    case 'status':
    case 'url':
      return type; // These types exist in both definitions
    case 'select':
      return 'text'; // Map select to text
    case 'checkbox':
      return 'text'; // Map checkbox to text
    default:
      return 'text'; // Default fallback
  }
};

/**
 * Converts ColumnDef objects from the list metadata to Column objects
 * compatible with the GridContainer component
 */
export const normalizeColumns = (defs: ColumnDef[]): Column[] =>
  defs.map(def => ({
    id: def.key,
    title: def.header,
    type: mapColumnType(def.type),
    width: def.width ?? DEFAULT_COLUMN_WIDTH,
    editable: def.editable ?? true,
    options: def.options,
    colors: def.colors,
    frozen: def.frozen,
    resizable: true
  }));
