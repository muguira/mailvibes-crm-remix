
import { ColumnDef } from "../types";
import { Column } from "@/components/grid-view/types";
import { DEFAULT_COLUMN_WIDTH } from "@/components/grid-view/grid-constants";

/**
 * Converts ColumnDef objects from the list metadata to Column objects
 * compatible with the GridContainer component
 */
export const normalizeColumns = (defs: ColumnDef[]): Column[] =>
  defs.map(def => ({
    id: def.key,
    title: def.header,
    type: def.type,
    width: def.width ?? DEFAULT_COLUMN_WIDTH,
    editable: def.editable ?? true,
    options: def.options,
    colors: def.colors,
    frozen: def.frozen,
    resizable: true
  }));
