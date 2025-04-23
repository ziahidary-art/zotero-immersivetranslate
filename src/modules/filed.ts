function registerCustomFields() {
  ztoolkit.FieldHooks.register(
    "getField",
    "imt_BabelDOC_status",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );

  ztoolkit.FieldHooks.register(
    "getField",
    "imt_BabelDOC_stage",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );

  ztoolkit.FieldHooks.register(
    "getField",
    "imt_BabelDOC_pdfID",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );

  ztoolkit.FieldHooks.register(
    "getField",
    "imt_BabelDOC_error",
    (
      field: string,
      unformatted: boolean,
      includeBaseMapped: boolean,
      item: Zotero.Item,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      original: Function,
    ) => {
      return ztoolkit.ExtraField.getExtraField(item, field) || "";
    },
  );
}

export { registerCustomFields };
