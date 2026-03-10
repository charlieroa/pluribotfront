export interface ColumnDef {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required: boolean;
    defaultValue?: string;
}
export interface TableDef {
    tableName: string;
    columns: ColumnDef[];
}
export declare function extractAndParseSql(html: string): TableDef[];
export declare function schemaToContext(tables: TableDef[]): string;
//# sourceMappingURL=sql-parser.d.ts.map